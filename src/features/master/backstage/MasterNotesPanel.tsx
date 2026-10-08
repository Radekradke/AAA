import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { confirmAction } from '@/store/feedbackStore';
import { useMasterStore } from '../masterStore';

/** Escrever uma nota: Enter salva, Shift+Enter quebra a linha. */
export function NoteInput({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const add = useMasterStore((m) => m.addNote);
  const sessionId = useSessionStore((s) => s.session?.id ?? null);
  const [text, setText] = useState('');
  const save = () => {
    if (!text.trim()) return;
    void add(text, sessionId);
    setText('');
    onDone?.();
  };
  return (
    <textarea
      className="fv-input fv-note-input"
      rows={2}
      autoFocus={autoFocus}
      placeholder={'"Roland agora odeia Finn" — Enter salva'}
      value={text}
      maxLength={2000}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          save();
        }
      }}
      aria-label="Nova nota privada"
    />
  );
}

/**
 * NOTAS: o caderno do mestre. Privadas de verdade (o banco não entrega ao
 * jogador). Sem categorias, sem IA: texto curto, Enter salva, editar e apagar.
 */
export function MasterNotesPanel() {
  const m = useMasterStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    void m.loadNotes();
  }, [m.campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fv-bs-stack">
      <p className="fv-bs-hint">🔒 Só você vê. Ideal para o que aconteceu fora da tela, segredos e lembretes.</p>
      <NoteInput />
      {m.notesError && <p className="fv-bs-error">{m.notesError}</p>}
      <ul className="fv-notes">
        {m.notes.map((n) => (
          <li key={n.id}>
            {editing === n.id ? (
              <textarea
                className="fv-input fv-note-input"
                rows={3}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (draft.trim() && draft !== n.text) void m.updateNote(n.id, draft);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).blur();
                  }
                  if (e.key === 'Escape') setEditing(null);
                }}
                aria-label="Editar nota"
              />
            ) : (
              <button
                type="button"
                className="fv-note-text"
                title="Toque para editar"
                onClick={() => {
                  setEditing(n.id);
                  setDraft(n.text);
                }}
              >
                {n.text}
              </button>
            )}
            <span className="fv-note-meta">
              {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              <button
                type="button"
                className="fv-bs-x"
                aria-label="Apagar nota"
                onClick={async () => (await confirmAction({ title: 'Apagar esta nota?', confirmLabel: 'Apagar', danger: true })) && void m.removeNote(n.id)}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
