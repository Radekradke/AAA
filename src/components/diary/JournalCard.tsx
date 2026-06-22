import { useState } from 'react';
import type { JournalEntry } from '@/types/character';
import { useTheme } from '@/lib/useTheme';

interface JournalCardProps {
  entry: JournalEntry;
  onChange: (patch: Partial<JournalEntry>) => void;
  onDelete: () => void;
}

const fieldDefs: { key: keyof JournalEntry; label: string; rows?: number }[] = [
  { key: 'summary', label: 'Resumo', rows: 3 },
  { key: 'npcs', label: 'NPCs encontrados' },
  { key: 'locations', label: 'Locais visitados' },
  { key: 'quests', label: 'Missões' },
  { key: 'treasure', label: 'Tesouros' },
  { key: 'notes', label: 'Anotações livres', rows: 2 },
];

/** Entrada de sessão do diário — título/data editáveis e campos colapsáveis. */
export function JournalCard({ entry, onChange, onDelete }: JournalCardProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fv-panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <input
          value={entry.title}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Título da sessão"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}
        />
        <input
          value={entry.date}
          onChange={(e) => onChange({ date: e.target.value })}
          aria-label="Data"
          style={{ width: 90, textAlign: 'right', background: 'transparent', border: 'none', outline: 'none', fontSize: 10.5, color: 'var(--acc)', fontFamily: "'Chakra Petch', monospace" }}
        />
      </div>

      <textarea
        value={entry.summary}
        onChange={(e) => onChange({ summary: e.target.value })}
        placeholder="O que aconteceu nesta sessão?"
        rows={2}
        className="fv-input"
        style={{ marginTop: 10, resize: 'none', lineHeight: 1.6, fontSize: 13.5, background: 'transparent', border: 'none', padding: 0 }}
      />

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fieldDefs.slice(1).map((f) => (
            <label key={f.key as string}>
              <span style={{ display: 'block', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{f.label}</span>
              {f.rows ? (
                <textarea value={entry[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} rows={f.rows} className="fv-input" style={{ resize: 'none', fontSize: 13 }} />
              ) : (
                <input value={entry[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} className="fv-input" style={{ fontSize: 13 }} />
              )}
            </label>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: t.acc, fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
          {open ? 'Recolher detalhes ▲' : 'Detalhes (NPCs, locais, missões…) ▼'}
        </button>
        <button onClick={onDelete} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
          Excluir
        </button>
      </div>
    </div>
  );
}
