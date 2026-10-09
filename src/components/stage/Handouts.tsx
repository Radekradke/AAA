import { useMemo, useState } from 'react';
import { confirmAction } from '@/store/feedbackStore';
import { Modal } from '@/components/ui/Modal';
import { mediaService, useMediaUrl } from '@/services/mediaService';
import { stageService } from '@/services/stageService';
import { useStageStore } from '@/store/stageStore';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { Handout } from '@/types/stage';
import '@/styles/stage.css';

/** Jogadores da mesa (dono → nomes dos heróis) para escolher quem recebe. */
function usePlayers(heroes: SharedHero[]) {
  return useMemo(() => {
    const m = new Map<string, string[]>();
    for (const h of heroes) m.set(h.share.ownerId, [...(m.get(h.share.ownerId) ?? []), h.snapshot?.name ?? 'Herói']);
    return [...m.entries()].map(([id, names]) => ({ id, name: names.join(' / ') }));
  }, [heroes]);
}

/**
 * Mestre: cartas, pistas, mapas do tesouro. Prepara na gaveta e entrega
 * para todos ou só para alguns — só quem recebe consegue abrir.
 */
export function HandoutDesk({ campaignId, heroes }: { campaignId: string; heroes: SharedHero[] }) {
  const st = useStageStore();
  const players = usePlayers(heroes);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [to, setTo] = useState<string[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Handout | null>(null);

  const reset = () => {
    setTitle('');
    setBody('');
    setImagePath(null);
    setTo(null);
  };

  const create = async (deliver: boolean) => {
    if (!title.trim()) return setErr('Dê um título (ex.: "Carta selada do barão").');
    setErr(null);
    const ok = await st.run(async () => {
      const h = await stageService.saveHandout(campaignId, { title, body, imagePath, recipients: to });
      if (deliver) await stageService.showHandout(h.id, to);
    });
    if (ok) reset();
  };

  const nameOf = (ids: string[] | null) => (ids === null ? 'todos' : ids.map((id) => players.find((p) => p.id === id)?.name ?? 'jogador').join(', ') || 'ninguém');

  return (
    <section className="fv-panel fv-live-card fv-handouts">
      <div className="fv-label">Novo handout</div>
      <div className="fv-handout-form">
        <input className="fv-input" placeholder="Título (ex.: Carta selada do barão)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="fv-input" rows={4} placeholder="Texto da carta, pista ou anotação…" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
        <div className="fv-handout-row">
          <label className="fv-scene-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setUploading(true);
                setErr(null);
                try {
                  if (imagePath) void mediaService.remove([imagePath]);
                  setImagePath((await mediaService.upload(campaignId, f, 1920)).path);
                } catch (x) {
                  setErr((x as Error).message);
                } finally {
                  setUploading(false);
                }
              }}
            />
            {uploading ? 'Enviando…' : imagePath ? 'Trocar imagem' : '+ Imagem (opcional)'}
          </label>
          {imagePath && <HandoutThumb path={imagePath} />}
        </div>
        <div className="fv-handout-to" role="group" aria-label="Quem recebe">
          <span>Para</span>
          <button type="button" className={'fv-live-chip' + (to === null ? ' is-on' : '')} onClick={() => setTo(null)}>Todos</button>
          {players.map((p) => {
            const on = !!to?.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={'fv-live-chip' + (on ? ' is-on' : '')}
                aria-pressed={on}
                onClick={() => setTo((cur) => {
                  const base = cur ?? [];
                  const next = on ? base.filter((x) => x !== p.id) : [...base, p.id];
                  return next.length ? next : null;
                })}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        {err && <p className="fv-npc-editor-err" role="alert">{err}</p>}
        <div className="fv-handout-row is-end">
          <button type="button" className="fv-btn-ghost" disabled={st.busy || uploading} onClick={() => void create(false)}>Guardar na gaveta</button>
          <button type="button" className="fv-btn-gold" disabled={st.busy || uploading} onClick={() => void create(true)}>Entregar agora</button>
        </div>
      </div>

      <div className="fv-label" style={{ marginTop: 18 }}>Handouts · {st.handouts.length}</div>
      {!st.handouts.length && <p className="fv-live-hint">Nada ainda. Cartas e pistas entregues ficam guardadas para os jogadores consultarem depois.</p>}
      <ul className="fv-handout-list">
        {st.handouts.map((h) => (
          <li key={h.id} className={h.shownAt ? 'is-shown' : ''}>
            <button type="button" className="fv-handout-open" onClick={() => setOpen(h)}>
              {h.imagePath ? <HandoutThumb path={h.imagePath} /> : <span className="fv-handout-seal" aria-hidden>✉</span>}
              <span>
                <b>{h.title}</b>
                <small>{h.shownAt ? `Entregue a ${nameOf(h.recipients)}` : 'Na gaveta'}</small>
              </span>
            </button>
            <div className="fv-handout-actions">
              {h.shownAt ? (
                <button type="button" className="fv-btn-ghost" disabled={st.busy} onClick={() => void st.run(() => stageService.hideHandout(h.id))}>Recolher</button>
              ) : (
                <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.showHandout(h.id, h.recipients)}>Entregar ({nameOf(h.recipients)})</button>
              )}
              <button
                type="button"
                className="fv-btn-ghost is-danger"
                disabled={st.busy}
                onClick={async () => {
                  if (!(await confirmAction({ title: `Apagar "${h.title}"?`, message: 'Some também das pistas dos jogadores.', confirmLabel: 'Apagar', danger: true }))) return;
                  void st.run(() => stageService.removeHandout(h.id)).then(() => mediaService.remove([h.imagePath]));
                }}
              >
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {open && <HandoutModal handout={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Jogador: pistas recebidas nesta mesa. */
export function HandoutInbox() {
  const st = useStageStore();
  const [open, setOpen] = useState<Handout | null>(null);
  const got = st.handouts.filter((h) => h.shownAt);
  if (!got.length) return null;
  return (
    <section className="fv-panel fv-live-card fv-handouts">
      <div className="fv-label">Pistas recebidas · {got.length}</div>
      <ul className="fv-handout-list">
        {got.map((h) => (
          <li key={h.id}>
            <button type="button" className="fv-handout-open" onClick={() => setOpen(h)}>
              {h.imagePath ? <HandoutThumb path={h.imagePath} /> : <span className="fv-handout-seal" aria-hidden>✉</span>}
              <span>
                <b>{h.title}</b>
                <small>{h.recipients ? 'Só para você' : 'Para a mesa'}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <HandoutModal handout={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Aviso na tela quando o mestre entrega algo para mim. */
export function IncomingHandout() {
  const st = useStageStore();
  if (!st.incoming) return null;
  return <HandoutModal handout={st.incoming} fresh onClose={st.dismissIncoming} />;
}

export function HandoutModal({ handout, onClose, fresh }: { handout: Handout; onClose: () => void; fresh?: boolean }) {
  const { url, error } = useMediaUrl(handout.imagePath);
  return (
    <Modal
      title={fresh ? `O mestre te entregou: ${handout.title}` : handout.title}
      icon="quill"
      onClose={onClose}
      maxWidth={640}
      footer={<div className="fv-npc-editor-foot"><button type="button" className="fv-btn-gold" onClick={onClose}>{fresh ? 'Guardar nas pistas' : 'Fechar'}</button></div>}
    >
      <article className="fv-handout-paper">
        {handout.imagePath && (url ? <img src={url} alt={handout.title} /> : <div className="fv-map-loading">{error ?? 'Carregando…'}</div>)}
        {handout.body && <p>{handout.body}</p>}
      </article>
    </Modal>
  );
}

export function HandoutThumb({ path }: { path: string }) {
  const { url } = useMediaUrl(path);
  return <span className="fv-handout-thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden />;
}
