import { useMemo, useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import type { Character, DiaryClue } from '@/types/character';
import type { Handout } from '@/types/stage';
import type { Mentionable } from '@/engine/diary';
import { CLUE_STATUS, clueImageCount, clueText, diaryOf, MAX_CLUE_IMAGES, norm } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { newId } from '@/store/character/ids';
import { toast } from '@/store/feedbackStore';
import { useMediaUrl } from '@/services/mediaService';
import { clueImage } from '@/lib/clueImage';
import { Modal } from '@/components/ui/Modal';
import { HandoutModal, HandoutThumb } from '@/components/stage/Handouts';
import { MentionInput } from './MentionInput';

type Filter = 'all' | DiaryClue['status'];

function excerpt(text: string, max = 120): string {
  const t = text.replace(/[@#](?=\S)/g, '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s\S*$/, '') + '…' : t;
}

/** Imagem da pista: anexada (na ficha) ou do handout do mestre (armazenamento da mesa). */
function ClueImage({ clue, className }: { clue: DiaryClue; className?: string }) {
  const { url } = useMediaUrl(clue.image ? null : clue.handoutImage);
  const src = clue.image ?? url;
  return src ? <img className={className} src={src} alt="" loading="lazy" /> : null;
}

/**
 * Pistas: o que o herói descobriu (bilhetes, boatos, símbolos, mapas), com
 * imagem anexada guardada na ficha, situação (a verificar / confirmada /
 * falsa) com a conclusão, e ligação com uma missão do Quadro da Guilda.
 * As entregas do mestre aparecem no topo e viram pista com "Investigar".
 */
export function Clues({ char, people, places, query, handouts }: { char: Character; people: Mentionable[]; places: Mentionable[]; query: string; handouts: Handout[] }) {
  const store = useCharacterStore();
  const diary = diaryOf(char);
  const clues = diary.clues;
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [handout, setHandout] = useState<Handout | null>(null);
  const q = norm(query);

  const shown = useMemo(
    () =>
      clues
        .filter((c) => filter === 'all' || c.status === filter)
        .filter((c) => !q || norm(clueText(c)).includes(q))
        .sort((a, b) => Number(a.status !== 'unverified') - Number(b.status !== 'unverified') || b.at - a.at),
    [clues, filter, q],
  );
  const count = (s: DiaryClue['status']) => clues.filter((c) => c.status === s).length;

  const create = (seed: Partial<DiaryClue> = {}) => {
    const id = newId('c');
    store.updateDiary(char.id, (d) => {
      d.clues.unshift({ id, title: '', text: '', status: 'unverified', at: Date.now(), ...seed });
    });
    setOpenId(id);
  };
  const investigate = (h: Handout) => {
    const had = clues.find((c) => c.handoutId === h.id);
    if (had) return setOpenId(had.id);
    create({ title: h.title, text: h.body ?? '', source: 'Entregue pelo mestre', handoutId: h.id, handoutImage: h.imagePath });
  };

  const open = clues.find((c) => c.id === openId) ?? null;
  const fromMaster = handouts.filter((h) => !q || norm(`${h.title}\n${h.body}`).includes(q));

  return (
    <div className="fv-clues">
      <div className="fv-clues-bar">
        <div className="fv-seg" role="radiogroup" aria-label="Mostrar pistas">
          <button type="button" role="radio" aria-checked={filter === 'all'} className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>
            Todas <small>{clues.length}</small>
          </button>
          {CLUE_STATUS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={filter === s.id} className={filter === s.id ? 'is-on' : ''} onClick={() => setFilter(s.id)}>
              {s.plural} <small>{count(s.id)}</small>
            </button>
          ))}
        </div>
        <button type="button" className="fv-btn-gold fv-clues-new" onClick={() => create()}>
          + Nova pista
        </button>
      </div>

      {fromMaster.length > 0 && (
        <section className="fv-clues-master" aria-label="Entregues pelo mestre">
          <div className="fv-facts-title">Entregues pelo mestre</div>
          <div className="fv-clues-master-list">
            {fromMaster.map((h) => {
              const kept = clues.some((c) => c.handoutId === h.id);
              return (
                <div key={h.id} className="fv-clues-handout">
                  <button type="button" className="fv-handout-open" onClick={() => setHandout(h)}>
                    {h.imagePath ? <HandoutThumb path={h.imagePath} /> : <span className="fv-handout-seal" aria-hidden>✉</span>}
                    <span>
                      <b>{h.title}</b>
                      <small>{h.shownAt ? new Date(h.shownAt).toLocaleDateString('pt-BR') : ''}{h.recipients ? ' · só para você' : ''}</small>
                    </span>
                  </button>
                  <button type="button" className="fv-link-btn" onClick={() => investigate(h)} aria-label={kept ? `Abrir pista: ${h.title}` : `Investigar: ${h.title}`}>
                    {kept ? '✓ nas pistas' : 'Investigar'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {shown.length > 0 ? (
        <ul className="fv-clue-grid">
          {shown.map((c) => {
            const st = CLUE_STATUS.find((s) => s.id === c.status)!;
            const quest = c.questId ? diary.quests.find((x) => x.id === c.questId) : undefined;
            return (
              <li key={c.id}>
                <button type="button" className={`fv-clue is-${c.status}` + (c.image || c.handoutImage ? ' has-photo' : '')} onClick={() => setOpenId(c.id)}>
                  {(c.image || c.handoutImage) && (
                    <span className="fv-clue-photo">
                      <ClueImage clue={c} />
                    </span>
                  )}
                  <span className="fv-clue-stamp">{st.stamp}</span>
                  <b>{c.title.trim() || 'Pista sem nome'}</b>
                  {c.text.trim() && <span className="fv-clue-ex">{excerpt(c.text)}</span>}
                  {(c.source || quest) && (
                    <span className="fv-clue-meta">
                      {c.source && <small>fonte: {c.source.replace(/@/g, '')}</small>}
                      {quest && <span className="fv-mini-tag is-quest">⚑ {quest.title || 'Missão sem nome'}</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="fv-diary-empty">
          {q || filter !== 'all'
            ? 'Nenhuma pista aqui.'
            : 'Nenhuma pista ainda. Guarde bilhetes, boatos, símbolos e mapas — com foto — e marque se já confirmou ou se era falsa.'}
        </p>
      )}

      {open && <ClueDetail char={char} clue={open} people={people} places={places} onClose={() => setOpenId(null)} />}
      {handout && <HandoutModal handout={handout} onClose={() => setHandout(null)} />}
    </div>
  );
}

function ClueDetail({ char, clue, people, places, onClose }: { char: Character; clue: DiaryClue; people: Mentionable[]; places: Mentionable[]; onClose: () => void }) {
  const store = useCharacterStore();
  const diary = diaryOf(char);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const set = (p: Partial<DiaryClue>) =>
    store.updateDiary(char.id, (d) => {
      d.clues = d.clues.map((x) => (x.id === clue.id ? { ...x, ...p } : x));
    });

  const attach = async (file: File | undefined | null) => {
    if (!file) return;
    if (!clue.image && clueImageCount(diary.clues) >= MAX_CLUE_IMAGES) {
      toast(`Limite de ${MAX_CLUE_IMAGES} pistas com imagem nesta ficha. Tire a imagem de uma pista antiga para liberar espaço.`, { tone: 'danger' });
      return;
    }
    setBusy(true);
    try {
      set({ image: await clueImage(file) });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não deu para anexar a imagem.', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    void attach(file);
  };
  const remove = () => {
    if (!confirm('Apagar esta pista?')) return;
    store.updateDiary(char.id, (d) => {
      d.clues = d.clues.filter((x) => x.id !== clue.id);
    });
    onClose();
  };

  const st = CLUE_STATUS.find((s) => s.id === clue.status)!;
  const hasImage = !!(clue.image || clue.handoutImage);
  return (
    <Modal
      title={clue.title.trim() || 'Nova pista'}
      icon="quill"
      onClose={onClose}
      maxWidth={680}
      footer={
        <div className="fv-quest-foot">
          <button type="button" className="fv-link-btn is-danger" onClick={remove}>Apagar pista</button>
          <button type="button" className="fv-btn-gold" onClick={onClose}>Pronto</button>
        </div>
      }
    >
      <div className="fv-clue-detail" onPaste={onPaste}>
        <div className={`fv-clue-figure is-${clue.status}`}>
          {hasImage ? (
            <button type="button" className="fv-clue-figure-img" onClick={() => setZoom(true)} aria-label="Ver imagem grande">
              <ClueImage clue={clue} />
            </button>
          ) : (
            <button type="button" className="fv-clue-drop" onClick={() => fileRef.current?.click()} disabled={busy}>
              <span aria-hidden>📎</span>
              <b>{busy ? 'Comprimindo…' : 'Anexar imagem'}</b>
              <small>bilhete, mapa, símbolo… (ou cole com Ctrl+V)</small>
            </button>
          )}
          <span className="fv-clue-stamp">{st.stamp}</span>
          <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Arquivo de imagem da pista" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} />
          {clue.image && (
            <span className="fv-clue-figure-actions">
              <button type="button" className="fv-link-btn" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Comprimindo…' : 'Trocar imagem'}</button>
              <button type="button" className="fv-link-btn is-danger" onClick={() => set({ image: undefined })}>Tirar imagem</button>
            </span>
          )}
          {zoom && (
            <button type="button" className="fv-clue-zoom" onClick={() => setZoom(false)} aria-label="Fechar imagem">
              <ClueImage clue={clue} />
            </button>
          )}
        </div>

        <div className="fv-clue-fields">
          <input className="fv-quest-title" aria-label="Nome da pista" placeholder="O que é (ex.: Bilhete com o selo da mão vermelha)" value={clue.title} autoFocus={!clue.title} onChange={(e) => set({ title: e.target.value })} />

          <div className="fv-seg fv-clue-status" role="radiogroup" aria-label="Situação da pista">
            {CLUE_STATUS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={clue.status === s.id} className={(clue.status === s.id ? 'is-on ' : '') + `is-${s.id}`} onClick={() => set({ status: s.id })}>
                {s.label}
              </button>
            ))}
          </div>

          <label className="fv-quest-field">
            <span>O que diz / o que vimos</span>
            <MentionInput value={clue.text} onChange={(v) => set({ text: v })} people={people} places={places} rows={4} ariaLabel="O que a pista diz" placeholder="Copie o texto do bilhete, descreva o símbolo… (@ e # funcionam)" />
          </label>

          <div className="fv-quest-fields">
            <label>
              <span>Quem contou / onde achamos</span>
              <MentionInput value={clue.source ?? ''} onChange={(v) => set({ source: v })} people={people} places={places} ariaLabel="Fonte da pista" placeholder="@NPC, #Lugar…" />
            </label>
            <label>
              <span>Missão ligada</span>
              <select className="fv-input" value={clue.questId ?? ''} onChange={(e) => set({ questId: e.target.value || undefined })} aria-label="Missão ligada">
                <option value="">— nenhuma —</option>
                {diary.quests.map((x) => (
                  <option key={x.id} value={x.id}>{x.title.trim() || 'Missão sem nome'}</option>
                ))}
              </select>
            </label>
          </div>

          {clue.status !== 'unverified' && (
            <label className="fv-quest-field">
              <span>{st.verdictLabel}</span>
              <MentionInput value={clue.verdict ?? ''} onChange={(v) => set({ verdict: v })} people={people} places={places} rows={3} ariaLabel="Conclusão da pista" placeholder={clue.status === 'confirmed' ? 'O que provou que era verdade…' : 'Quem mentiu, o que desmentiu…'} />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
