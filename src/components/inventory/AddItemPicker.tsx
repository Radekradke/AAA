import { useMemo, useState } from 'react';
import { ALL_ITEMS, GEAR } from '@/data/items';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { RARITY } from '@/data/themes';
import type { Item } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

interface AddItemPickerProps {
  onAdd: (item: Item) => void;
  onClose: () => void;
}

const GROUPS: { id: string; label: string; items: Item[] }[] = [
  { id: 'weapon', label: 'Armas', items: WEAPONS },
  { id: 'armor', label: 'Armaduras & Escudos', items: ARMORS },
  { id: 'gear', label: 'Equipamentos & Itens', items: GEAR },
  { id: 'all', label: 'Tudo', items: ALL_ITEMS },
];

/** Modal para adicionar itens do catálogo à mochila, com busca. */
export function AddItemPicker({ onAdd, onClose }: AddItemPickerProps) {
  const t = useTheme();
  const [group, setGroup] = useState('weapon');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = GROUPS.find((g) => g.id === group)?.items ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  }, [group, query]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(4,6,10,.6)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fv-panel animate-popIn"
        style={{ width: '100%', maxWidth: 560, maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 20, border: '1px solid var(--gold)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>Adicionar item</div>
          <button onClick={onClose} aria-label="Fechar" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 }}>✕</button>
        </div>

        <input
          className="fv-input"
          placeholder="Buscar item…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {GROUPS.map((g) => {
            const active = group === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 999, border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.muted, background: active ? hexA(t.gold, 0.1) : 'transparent' }}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        <div className="fv-scroll-thin" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => {
            const rc = RARITY[item.rarity] ?? RARITY.comum;
            return (
              <button
                key={item.id}
                onClick={() => onAdd(item)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>{item.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{item.note}</div>
                </div>
                <span style={{ fontSize: 10.5, color: rc.color }}>{rc.label}</span>
                <span style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 700 }}>+</span>
              </button>
            );
          })}
          {items.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Nada encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
