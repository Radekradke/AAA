import { useState } from 'react';
import type { Monster } from '@/data/bestiary';
import { processPortraitFile } from '@/lib/portrait';
import { monsterLook } from '@/lib/monsterArt';
import { bestiaryService, useBestiaryStore } from '@/services/bestiaryService';
import { toast } from '@/store/feedbackStore';
import { MonsterPortrait } from './MonsterPortrait';

/**
 * Personalizar uma criatura nesta mesa: foto e nome (a mesa vê) e notas
 * (só o mestre). As regras (CA, PV, ataques) continuam as do bestiário.
 */
export function MonsterEditor({ m, campaignId, onDone }: { m: Monster; campaignId: string; onDone: () => void }) {
  const current = useBestiaryStore((s) => s.customs[m.id]);
  const currentNotes = useBestiaryStore((s) => s.notes[m.id] ?? '');
  const apply = useBestiaryStore((s) => s.apply);
  const [name, setName] = useState(current?.name ?? '');
  const [portrait, setPortrait] = useState<string | null>(current?.portrait ?? null);
  const [notes, setNotes] = useState(currentNotes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const look = monsterLook(m, { name, portrait });

  const pick = async (file?: File) => {
    if (!file) return;
    setErr(null);
    try {
      // foto leve: vai para o banco e aparece na iniciativa e no mapa de todos
      const { dataUrl } = await processPortraitFile(file, { cutout: false, max: { w: 400, h: 500 }, quality: 0.82 });
      setPortrait(dataUrl);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const save = async (reset = false) => {
    setBusy(true);
    setErr(null);
    const custom = reset ? { name: null, portrait: null } : { name: name.trim() || null, portrait };
    const n = reset ? '' : notes;
    try {
      await bestiaryService.save(campaignId, m.id, custom, n);
      apply(m.id, custom, n);
      toast(reset ? `${m.name} voltou ao padrão.` : `${custom.name || m.name} personalizado para esta mesa.`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="fv-medit"
      aria-label={`Personalizar ${m.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="fv-medit-art">
        <MonsterPortrait look={look} />
        <label className="fv-btn-ghost fv-medit-pick">
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
          {portrait ? 'Trocar foto' : 'Enviar foto'}
        </label>
        {portrait && (
          <button type="button" className="fv-medit-link" onClick={() => setPortrait(null)}>
            Tirar a foto da mesa
          </button>
        )}
      </div>
      <div className="fv-medit-fields">
        <div className="fv-medit-tag">A mesa vê</div>
        <label>
          <span>Nome nesta mesa</span>
          <input className="fv-input" maxLength={80} placeholder={m.name} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="fv-medit-tag is-secret">Só você vê</div>
        <label>
          <span>Notas do mestre</span>
          <textarea className="fv-input" rows={4} maxLength={4000} placeholder="Táticas, ganchos, o que ela sabe, quando foge…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {err && (
          <p className="fv-medit-err" role="alert">
            {err}
          </p>
        )}
        <div className="fv-medit-acts">
          {(current || currentNotes) && (
            <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void save(true)}>
              Restaurar padrão
            </button>
          )}
          <button type="button" className="fv-btn-ghost" disabled={busy} onClick={onDone}>
            Voltar
          </button>
          <button type="submit" className="fv-btn-gold" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  );
}
