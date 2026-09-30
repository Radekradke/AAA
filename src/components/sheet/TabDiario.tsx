import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useCharacterStore } from '@/store/characterStore';
import { JournalCard } from '@/components/diary/JournalCard';
import { hexA } from '@/lib/color';
import { useTheme } from '@/lib/useTheme';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSheetNpcs, MentionField, NpcMentionChip, mentionedNpcs } from '@/components/diary/NpcMentions';

export function TabDiario({ char }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [query, setQuery] = useState('');
  // NPCs das mesas desta ficha: @ para citar, retrato ao passar o mouse
  const npcs = useSheetNpcs(char.id);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="quill" size={22} color={t.gold} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,2.4vw,24px)', color: 'var(--ink)', lineHeight: 1 }}>Crônica da Aventura</div>
            <div style={{ marginTop: 3, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {char.journal.length} sessão(ões) registradas
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="fv-input"
            placeholder="Buscar no diário…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 200, fontSize: 13, padding: '9px 13px' }}
          />
          <button onClick={() => store.addJournalEntry(char.id)} style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--gold)', padding: '9px 18px', borderRadius: 999, border: '1px solid var(--gold)', background: hexA(t.gold, 0.08) }}>
            + Nova sessão
          </button>
        </div>
      </div>

      {/* Anotações rápidas */}
      <Panel style={{ marginBottom: 14 }}>
        <div className="fv-label" style={{ marginBottom: 10 }}>Anotações rápidas</div>
        <MentionField
          value={char.notes}
          onChange={(v) => store.setNotes(char.id, v)}
          npcs={npcs}
          placeholder={`Ideias, lembretes, segredos do mestre que você descobriu…${npcs.length ? ' (@ cita um NPC)' : ''}`}
          rows={3}
          className="fv-input"
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
        {mentionedNpcs([char.notes], npcs).length > 0 && (
          <div className="fv-npc-cited">
            <span>Citados</span>
            {mentionedNpcs([char.notes], npcs).map((n) => <NpcMentionChip key={n.id} npc={n} />)}
          </div>
        )}
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
        {entries.map((entry) => (
          <JournalCard
            key={entry.id}
            entry={entry}
            onChange={(patch) => store.updateJournalEntry(char.id, entry.id, patch)}
            onDelete={() => store.deleteJournalEntry(char.id, entry.id)}
            npcs={npcs}
          />
        ))}
      </div>

      {char.journal.length === 0 && (
        <EmptyState
          icon="quill"
          title="O diário está em branco"
          hint={<>Clique em <b style={{ color: 'var(--gold)' }}>Nova sessão</b> para registrar sua primeira aventura — NPCs, lugares, missões e tesouros.</>}
        />
      )}
      {char.journal.length > 0 && entries.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhuma sessão corresponde à busca.</p>
      )}
    </div>
  );
}
