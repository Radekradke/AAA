import { useMemo, useState } from 'react';
import { ALL_ITEMS, GEAR, MAGIC_ITEMS } from '@/data/items';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { enchantItem } from '@/data/magicItems';
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

/** Subgrupo de cada item para os filtros finos. */
function subgroup(item: Item): string {
  if (item.group) return item.group;
  if (item.weapon) return `${item.weapon.type === 'simple' ? 'Simples' : 'Marciais'} ${item.weapon.range === 'ranged' ? 'à distância' : 'corpo a corpo'}`;
  if (item.armor) return `Armadura ${item.armor.category}`;
  if (item.category === 'shield') return 'Escudos';
  if (item.category === 'weapon') return 'Simples à distância';
  return 'Outros';
}

const GROUPS: { id: string; label: string; items: Item[]; enchant?: boolean }[] = [
  { id: 'weapon', label: 'Armas', items: WEAPONS.filter((w) => !/plus\d$/.test(w.id)), enchant: true },
  { id: 'armor', label: 'Armaduras & Escudos', items: ARMORS, enchant: true },
  { id: 'gear', label: 'Equipamento', items: GEAR },
  { id: 'magic', label: 'Itens mágicos', items: MAGIC_ITEMS },
  { id: 'all', label: 'Tudo', items: ALL_ITEMS },
];

/** Preço legível: po, pp ou pc. */
export function priceLabel(gp: number | undefined): string {
  if (gp === undefined) return '';
  if (gp >= 1) return `${gp.toLocaleString('pt-BR')} po`;
  if (gp >= 0.1) return `${Math.round(gp * 10)} pp`;
  return `${Math.max(1, Math.round(gp * 100))} pc`;
}

/** Modal para adicionar itens do catálogo à mochila, com busca e atalho para a Forja. */
export function AddItemPicker({ onAdd, onClose, onForge }: AddItemPickerProps) {
  const t = useTheme();
  const [group, setGroup] = useState('weapon');
  const [sub, setSub] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [enchant, setEnchant] = useState(0);
  const [added, setAdded] = useState<string | null>(null);

  const current = GROUPS.find((g) => g.id === group)!;
  const subs = useMemo(() => [...new Set(current.items.map(subgroup))], [current]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    // buscando: procura no catálogo inteiro
    const list = q ? ALL_ITEMS : current.items.filter((i) => !sub || subgroup(i) === sub);
    return q ? list.filter((i) => i.name.toLowerCase().includes(q) || (i.note ?? '').toLowerCase().includes(q)) : list;
  }, [current, sub, query]);

  const pick = (item: Item) => {
    const final = current.enchant && enchant ? enchantItem(item, enchant) : item;
    onAdd(final);
    setAdded(final.name);
    window.setTimeout(() => setAdded((a) => (a === final.name ? null : a)), 1600);
  };

  const pill = (active: boolean) => ({
    cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 32, padding: '6px 13px', borderRadius: 999,
    border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.muted, background: active ? hexA(t.gold, 0.1) : 'transparent',
  });

  return (
    <Modal title="Adicionar item" icon="satchel" onClose={onClose} maxWidth={600}>
      <input
        className="fv-input"
        placeholder={`Buscar entre ${ALL_ITEMS.length} itens…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => { setGroup(g.id); setSub(null); }} style={pill(group === g.id && !query)}>
            {g.label}
          </button>
        ))}
        {onForge && (
          <button
            onClick={() => { onClose(); onForge(); }}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, minHeight: 32, padding: '6px 13px', borderRadius: 999, border: '1px solid ' + t.acc, color: t.acc, background: 'var(--lift)', marginLeft: 'auto' }}
          >
            <Icon name="anvil" size={13} /> Criar personalizado
          </button>
        )}
      </div>

      {!query && subs.length > 1 && group !== 'all' && (
        <div className="fv-picker-subs" role="tablist" aria-label="Subgrupo">
          <button type="button" className={!sub ? 'is-on' : ''} onClick={() => setSub(null)}>Todos</button>
          {subs.map((s) => (
            <button key={s} type="button" className={sub === s ? 'is-on' : ''} onClick={() => setSub(s)}>{s}</button>
          ))}
        </div>
      )}

      {current.enchant && !query && (
        <div className="fv-picker-enchant">
          <span>Encantamento</span>
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={enchant === n ? 'is-on' : ''} onClick={() => setEnchant(n)}>
              {n ? `+${n}` : 'Comum'}
            </button>
          ))}
          {enchant > 0 && <small>{group === 'weapon' ? `+${enchant} no ataque e no dano` : `+${enchant} na CA`}</small>}
        </div>
      )}

      {added && <div className="fv-picker-added" role="status">✓ {added} foi para a mochila</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((raw) => {
          const item = current.enchant && enchant && !query ? enchantItem(raw, enchant) : raw;
          const rc = RARITY[item.rarity] ?? RARITY.comum;
          return (
            <LoreTooltip key={item.id} info={itemLore(item)} anchorStyle={{ display: 'block' }}>
              <button
                onClick={() => pick(raw)}
                style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (item.rarity === 'comum' ? 'var(--line)' : hexA(rc.color, 0.35)), background: 'var(--sunk)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: item.rarity === 'comum' ? 'var(--ink)' : rc.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                    {item.attunement && <span className="fv-picker-attune" title="Exige sintonia (máx. 3)">sintonia</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-num)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.note}</div>
                </div>
                <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 10.5, color: rc.color }}>{rc.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-num)' }}>{priceLabel(item.value)}</span>
                </span>
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
