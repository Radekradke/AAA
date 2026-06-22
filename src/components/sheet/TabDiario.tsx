import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useCharacterStore } from '@/store/characterStore';
import { JournalCard } from '@/components/diary/JournalCard';
import { hexA } from '@/lib/color';
import { useTheme } from '@/lib/useTheme';

export function TabDiario({ char }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return char.journal;
    return char.journal.filter((j) =>
      [j.title, j.date, j.summary, j.npcs, j.locations, j.quests, j.treasure, j.notes]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [char.journal, query]);

  return (
    <div className="animate-riseIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(18px,2.4vw,24px)', color: 'var(--ink)' }}>Diário de Sessões</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="fv-input"
            placeholder="Buscar no diário…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 200, fontSize: 13, padding: '9px 13px' }}
          />
          <button onClick={() => store.addJournalEntry(char.id)} style={{ cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 13, color: 'var(--gold)', padding: '9px 18px', borderRadius: 999, border: '1px solid var(--gold)', background: hexA(t.gold, 0.08) }}>
            + Nova sessão
          </button>
        </div>
      </div>

      {/* Anotações rápidas */}
      <Panel style={{ marginBottom: 14 }}>
        <div className="fv-label" style={{ marginBottom: 10 }}>Anotações rápidas</div>
        <textarea
          value={char.notes}
          onChange={(e) => store.setNotes(char.id, e.target.value)}
          placeholder="Ideias, lembretes, segredos do mestre que você descobriu…"
          rows={3}
          className="fv-input"
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
        {entries.map((entry) => (
          <JournalCard
            key={entry.id}
            entry={entry}
            onChange={(patch) => store.updateJournalEntry(char.id, entry.id, patch)}
            onDelete={() => store.deleteJournalEntry(char.id, entry.id)}
          />
        ))}
      </div>

      {char.journal.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
          O diário está em branco. Clique em <b style={{ color: 'var(--gold)' }}>Nova sessão</b> para registrar sua
          primeira aventura.
        </p>
      )}
      {char.journal.length > 0 && entries.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhuma sessão corresponde à busca.</p>
      )}
    </div>
  );
}
