import { useEffect, useRef, useState } from 'react';
import type { Character, DiaryNoteColor } from '@/types/character';
import { useMentionables } from './useMentionables';
import { MentionInput } from './MentionInput';
import { NOTE_COLORS, useAddNote } from './DiaryNotes';
import { toast } from '@/store/feedbackStore';
import '@/styles/diary.css';

/**
 * Botão "✎ Anotar" em todas as abas da ficha: abre um bilhete, escreve,
 * Enter — vai para os Rabiscos do Diário sem sair do combate.
 */
export function QuickNote({ char }: { char: Character }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [color, setColor] = useState<DiaryNoteColor | undefined>();
  const add = useAddNote(char.id);
  const { people, places } = useMentionables(char);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const save = () => {
    if (!add(text, color)) return;
    setText('');
    setColor(undefined);
    setOpen(false);
    toast('Anotado nos Rabiscos do Diário.', { tone: 'ok' });
  };

  return (
    <div className="fv-quicknote" ref={boxRef}>
      {open && (
        <div className="fv-quicknote-box" role="dialog" aria-label="Anotação rápida">
          <MentionInput
            value={text}
            onChange={setText}
            people={people}
            places={places}
            rows={3}
            autoFocus
            onSubmit={save}
            ariaLabel="Anotação rápida"
            placeholder="Anote rápido… (Enter salva · @ cita alguém · # marca um lugar)"
          />
          <div className="fv-notes-new-bar">
            <div className="fv-note-colors" role="radiogroup" aria-label="Cor">
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
            <button type="button" className="fv-btn-gold" disabled={!text.trim()} onClick={save}>
              Salvar
            </button>
          </div>
        </div>
      )}
      <button type="button" className={'fv-quicknote-fab' + (open ? ' is-open' : '')} aria-expanded={open} onClick={() => setOpen(!open)} title="Anotação rápida (vai para o Diário)">
        <span aria-hidden>✎</span>
        <b>Anotar</b>
      </button>
    </div>
  );
}
