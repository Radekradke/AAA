import { useMemo, useState } from 'react';
import { useDiaryFocus } from './DiaryNav';
import type { Character, DiaryNote, DiaryNoteColor } from '@/types/character';
import type { Mentionable } from '@/engine/diary';
import { diaryOf, norm } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { newId } from '@/store/character/ids';
import { MentionInput, RichText } from './MentionInput';

export const NOTE_COLORS: { id: DiaryNoteColor; label: string }[] = [
  { id: 'gold', label: 'Ouro' },
  { id: 'red', label: 'Perigo' },
  { id: 'green', label: 'Aliado' },
  { id: 'blue', label: 'Ideia' },
  { id: 'violet', label: 'Mistério' },
];

/** Salva um rabisco novo na ficha (usado aqui e no botão "Anotar" de todas as abas). */
export function useAddNote(charId: string) {
  const store = useCharacterStore();
  return (text: string, color?: DiaryNoteColor) => {
    const t = text.trim();
    if (!t) return false;
    store.updateDiary(charId, (d) => {
      d.notes.unshift({ id: newId('n'), text: t, color, at: Date.now() });
    });
    return true;
  };
}

function when(at: number): string {
  if (!at) return 'antes do diário novo';
  const d = new Date(at);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? `hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleDateString('pt-BR');
}

/**
 * Rabiscos: anotações rápidas tipo post-it. Escreveu, Enter, salvou. Fixe no
 * topo, pinte por assunto e marque como resolvida quando a dúvida acabar.
 */
export function DiaryNotes({ char, people, places, query }: { char: Character; people: Mentionable[]; places: Mentionable[]; query: string }) {
  const store = useCharacterStore();
  const add = useAddNote(char.id);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState<DiaryNoteColor | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const notes = diaryOf(char).notes;
  // veio de uma ligação (ex.: "Onde aparece" em Pessoas): mostra e destaca o rabisco
  useDiaryFocus('notes', (id) => {
    if (notes.find((n) => n.id === id)?.done) setShowDone(true);
    setFlash(id);
    requestAnimationFrame(() => document.querySelector(`[data-note-id="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 2200);
  });

  const patch = (id: string, p: Partial<DiaryNote>) =>
    store.updateDiary(char.id, (d) => {
      d.notes = d.notes.map((n) => (n.id === id ? { ...n, ...p } : n));
    });
  const remove = (id: string) =>
    store.updateDiary(char.id, (d) => {
      d.notes = d.notes.filter((n) => n.id !== id);
    });

  const q = norm(query);
  const doneCount = notes.filter((n) => n.done).length;
  const shown = useMemo(
    () =>
      notes
        .filter((n) => (showDone || !n.done || q) && (!q || norm(n.text).includes(q)))
        .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Number(!!a.done) - Number(!!b.done) || b.at - a.at),
    [notes, showDone, q],
  );

  const save = () => {
    if (add(draft, color)) setDraft('');
  };

  return (
    <div className="fv-notes">
      <div className="fv-notes-new">
        <MentionInput
          value={draft}
          onChange={setDraft}
          people={people}
          places={places}
          rows={2}
          onSubmit={save}
          ariaLabel="Novo rabisco"
          placeholder={`Anote rápido e dê Enter…${people.length ? ' @ cita alguém,' : ''} # marca um lugar`}
        />
        <div className="fv-notes-new-bar">
          <div className="fv-note-colors" role="radiogroup" aria-label="Cor do rabisco">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                title={c.label}
                className={`fv-note-swatch is-${c.id}` + (color === c.id ? ' is-on' : '')}
                onClick={() => setColor(color === c.id ? undefined : c.id)}
              />
            ))}
          </div>
          <button type="button" className="fv-btn-gold" disabled={!draft.trim()} onClick={save}>
            Anotar
          </button>
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="fv-note-grid">
          {shown.map((n) => (
            <li key={n.id} data-note-id={n.id} className={`fv-note is-${n.color ?? 'plain'}` + (n.done ? ' is-done' : '') + (n.pinned ? ' is-pinned' : '') + (flash === n.id ? ' is-flash' : '')}>
              {editing === n.id ? (
                <MentionInput
                  value={n.text}
                  onChange={(v) => patch(n.id, { text: v })}
                  people={people}
                  places={places}
                  rows={4}
                  autoFocus
                  onSubmit={() => setEditing(null)}
                  ariaLabel="Editar rabisco"
                />
              ) : (
                <button type="button" className="fv-note-body" onClick={() => setEditing(n.id)} title="Clique para editar">
                  <RichText text={n.text} people={people} />
                </button>
              )}
              <div className="fv-note-foot">
                <small>{when(n.at)}</small>
                <span className="fv-note-actions">
                  <button type="button" aria-pressed={!!n.pinned} title={n.pinned ? 'Desafixar' : 'Fixar no topo'} onClick={() => patch(n.id, { pinned: !n.pinned })}>
                    {n.pinned ? '★' : '☆'}
                  </button>
                  <button type="button" aria-pressed={!!n.done} title={n.done ? 'Reabrir' : 'Resolvida'} onClick={() => patch(n.id, { done: !n.done })}>
                    ✓
                  </button>
                  <button
                    type="button"
                    title="Trocar a cor"
                    onClick={() => {
                      const i = NOTE_COLORS.findIndex((c) => c.id === n.color);
                      patch(n.id, { color: i === NOTE_COLORS.length - 1 ? undefined : NOTE_COLORS[i + 1].id });
                    }}
                  >
                    ◐
                  </button>
                  {editing === n.id ? (
                    <button type="button" title="Pronto" onClick={() => setEditing(null)}>OK</button>
                  ) : (
                    <button type="button" title="Apagar" aria-label="Apagar rabisco" onClick={() => remove(n.id)}>✕</button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fv-diary-empty">{q ? 'Nenhum rabisco com essa busca.' : 'Nada anotado ainda. Use o campo acima — ou o botão ✎ Anotar, de qualquer aba da ficha.'}</p>
      )}

      {doneCount > 0 && !q && (
        <button type="button" className="fv-link-btn" onClick={() => setShowDone(!showDone)}>
          {showDone ? 'Esconder resolvidas' : `Mostrar ${doneCount} resolvida${doneCount > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
