import { useMemo, useState } from 'react';
import { ALL_ITEMS, GEAR } from '@/data/items';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { RARITY } from '@/data/themes';
import type { Item } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { itemLore } from '@/lib/lore';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';

interface AddItemPickerProps {
  onAdd: (item: Item) => void;
  onClose: () => void;
  /** Abre a Forja para criar um item customizado (categoria Outros etc.). */
  onForge?: () => void;
}

const GROUPS: { id: string; label: string; items: Item[] }[] = [
  { id: 'weapon', label: 'Armas', items: WEAPONS },
  { id: 'armor', label: 'Armaduras & Escudos', items: ARMORS },
  { id: 'gear', label: 'Equipamentos & Itens', items: GEAR },
  { id: 'all', label: 'Tudo', items: ALL_ITEMS },
];

/** Modal para adicionar itens do catálogo à mochila, com busca e atalho para a Forja. */
export function AddItemPicker({ onAdd, onClose, onForge }: AddItemPickerProps) {
  const t = useTheme();
  const [group, setGroup] = useState('weapon');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = GROUPS.find((g) => g.id === group)?.items ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  }, [group, query]);

  return (
    <Modal title="Adicionar item" icon="satchel" onClose={onClose} maxWidth={560}>
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
              style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 32, padding: '6px 13px', borderRadius: 999, border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.muted, background: active ? hexA(t.gold, 0.1) : 'transparent' }}
            >
              {g.label}
            </button>
          );
        })}
        {onForge && (
          <button
            onClick={() => { onClose(); onForge(); }}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, minHeight: 32, padding: '6px 13px', borderRadius: 999, border: '1px solid ' + t.acc, color: t.acc, background: hexA(t.acc, 0.08), marginLeft: 'auto' }}
          >
            <Icon name="anvil" size={13} /> Criar personalizado
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const rc = RARITY[item.rarity] ?? RARITY.comum;
          return (
            <LoreTooltip key={item.id} info={itemLore(item)} anchorStyle={{ display: 'block' }}>
              <button
                onClick={() => onAdd(item)}
                style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.note}</div>
                </div>
                <span style={{ flex: 'none', fontSize: 10.5, color: rc.color }}>{rc.label}</span>
                <span style={{ flex: 'none', color: 'var(--gold)', fontSize: 18, fontWeight: 700 }}>+</span>
              </button>
            </LoreTooltip>
          );
        })}
        {items.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Nada encontrado.</div>}
      </div>
    </Modal>
  );
}
