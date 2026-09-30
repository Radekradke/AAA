import { useState } from 'react';
import type { JournalEntry } from '@/types/character';
import type { CampaignNpc } from '@/types/npc';
import { useTheme } from '@/lib/useTheme';
import { MentionField, NpcMentionChip, mentionedNpcs } from './NpcMentions';

interface JournalCardProps {
  entry: JournalEntry;
  onChange: (patch: Partial<JournalEntry>) => void;
  onDelete: () => void;
  /** NPCs da campanha que dá para citar com @ (e ver o retrato). */
  npcs?: CampaignNpc[];
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
export function JournalCard({ entry, onChange, onDelete, npcs = [] }: JournalCardProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const cited = mentionedNpcs(fieldDefs.map((f) => String(entry[f.key] ?? '')), npcs);
  const hint = npcs.length ? ' Use @ para citar um NPC.' : '';

  return (
    <div className="fv-panel" style={{ padding: '16px 18px 14px', borderLeft: '3px solid ' + t.gold, boxShadow: 'var(--shadow-panel), inset 24px 0 40px -30px ' + t.gold }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <input
          value={entry.title}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Título da sessão"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}
        />
        <input
          value={entry.date}
          onChange={(e) => onChange({ date: e.target.value })}
          aria-label="Data"
          style={{ width: 90, textAlign: 'right', background: 'transparent', border: 'none', outline: 'none', fontSize: 10.5, color: 'var(--acc)', fontFamily: "'Chakra Petch', monospace" }}
        />
      </div>

      <MentionField
        value={entry.summary}
        onChange={(v) => onChange({ summary: v })}
        npcs={npcs}
        placeholder={`O que aconteceu nesta sessão?${hint}`}
        rows={2}
        className="fv-input"
        ariaLabel="Resumo da sessão"
        style={{ marginTop: 10, resize: 'none', lineHeight: 1.6, fontSize: 13.5, background: 'transparent', border: 'none', padding: 0 }}
      />

      {cited.length > 0 && (
        <div className="fv-npc-cited">
          <span>Citados</span>
          {cited.map((n) => <NpcMentionChip key={n.id} npc={n} />)}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fieldDefs.slice(1).map((f) => (
            <label key={f.key as string}>
              <span style={{ display: 'block', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{f.label}</span>
              <MentionField
                value={String(entry[f.key] ?? '')}
                onChange={(v) => onChange({ [f.key]: v })}
                npcs={npcs}
                rows={f.rows}
                placeholder={f.key === 'npcs' && npcs.length ? '@ para escolher da galeria da mesa' : undefined}
                className="fv-input"
                style={f.rows ? { resize: 'none', fontSize: 13 } : { fontSize: 13 }}
              />
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
