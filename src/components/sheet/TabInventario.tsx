import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useTilt } from '@/lib/useTilt';
import { useCharacterStore } from '@/store/characterStore';
import { AddItemPicker } from '@/components/inventory/AddItemPicker';
import { ItemEditorModal } from '@/components/inventory/ItemEditorModal';
import { Icon } from '@/components/ui/Icon';
import { RARITY } from '@/data/themes';
import { isEquipped, slotForItem, attunedCount, MAX_ATTUNEMENT } from '@/engine/inventory';
import type { CoinKey, InventoryItem } from '@/types/character';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { itemLore } from '@/lib/lore';

const COINS: { k: CoinKey; code: string; color: string; rate: number }[] = [
  { k: 'pp', code: 'PL', color: '#D8E3F0', rate: 10 },
  { k: 'gp', code: 'PO', color: '#FFE08A', rate: 1 },
  { k: 'ep', code: 'PE', color: '#9BD4C8', rate: 0.5 },
  { k: 'sp', code: 'PP', color: '#C8CDD6', rate: 0.1 },
  { k: 'cp', code: 'PC', color: '#C8845A', rate: 0.01 },
];

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'weapon', label: 'Armas' },
  { id: 'armor', label: 'Armaduras' },
  { id: 'wondrous', label: 'Maravilhosos' },
  { id: 'consumable', label: 'Consumíveis' },
];

export function TabInventario({ char }: TabProps) {
  const t = useTheme();
  const tilt = useTilt();
  const store = useCharacterStore();
  const [filter, setFilter] = useState('all');
  const [picker, setPicker] = useState(false);
  const [forge, setForge] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const coinTotal = Math.round(COINS.reduce((a, c) => a + char.coins[c.k] * c.rate, 0));
  const attuneItems = char.inventory.filter((i) => i.attunement);

  const filtered = char.inventory.filter((it) => {
    if (filter === 'all') return true;
    if (filter === 'weapon') return !!it.weapon;
    if (filter === 'armor') return it.category === 'armor' || it.category === 'shield';
    if (filter === 'wondrous') return it.category === 'wondrous' || it.category === 'ring';
    if (filter === 'consumable') return it.category === 'consumable';
    return true;
  });

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Moedas */}
      <Panel>
        <SectionLabel right={<span style={{ fontSize: 12, color: 'var(--muted)' }}>≈ <b style={{ color: 'var(--gold)', fontFamily: "'Chakra Petch', monospace" }}>{coinTotal} po</b></span>}>
          Moedas
        </SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {COINS.map((c) => (
            <div key={c.k} style={{ textAlign: 'center', background: 'rgba(0,0,0,.26)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 4px 9px' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, color: c.color }}>{c.code}</div>
              <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: 'var(--ink)', margin: '3px 0 7px' }}>{char.coins[c.k]}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                <button onClick={() => store.adjustCoin(char.id, c.k, -1)} style={coinBtn('var(--muted)')}>−</button>
                <button onClick={() => store.adjustCoin(char.id, c.k, 1)} style={coinBtn('var(--acc)')}>+</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Sintonia */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 13 }}>
          Sintonia <span style={{ color: 'var(--gold)' }}>· {attunedCount(char)} de {MAX_ATTUNEMENT}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {attuneItems.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum item que exija sintonia na mochila.</div>}
          {attuneItems.map((it) => (
            <LoreTooltip key={it.uid} info={itemLore(it)} anchorStyle={{ display: 'block' }}>
              <button
                onClick={() => store.toggleAttune(char.id, it.uid)}
                style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 11, border: '1px solid ' + (it.attuned ? hexA(t.gold, 0.4) : t.line), background: it.attuned ? hexA(t.gold, 0.07) : 'rgba(0,0,0,.26)', color: 'var(--ink)' }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 999, flex: 'none', border: '1px solid ' + (it.attuned ? t.gold : t.line), background: it.attuned ? t.gold : 'transparent', boxShadow: it.attuned ? '0 0 10px ' + hexA(t.gold, 0.6) : 'none' }} />
                <span style={{ flex: 1, textAlign: 'left', fontFamily: "'Cinzel', serif", fontSize: 14 }}>{it.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{it.attuned ? 'sintonizado' : 'guardado'}</span>
              </button>
            </LoreTooltip>
          ))}
        </div>
      </Panel>

      {/* Mochila & Equipamento */}
      <Panel full>
        <SectionLabel
          right={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{ cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11.5, padding: '6px 13px', borderRadius: 999, border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.muted, background: active ? hexA(t.gold, 0.1) : 'transparent' }}>
                    {f.label}
                  </button>
                );
              })}
              <button onClick={() => setPicker(true)} style={{ cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 11.5, padding: '6px 14px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.12) }}>
                + Adicionar
              </button>
              <button
                onClick={() => setForge(true)}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 11.5, padding: '6px 14px', borderRadius: 999, border: '1px solid var(--acc)', color: 'var(--acc)', background: hexA(t.acc, 0.1) }}
              >
                <Icon name="anvil" size={14} />
                Forjar
              </button>
            </div>
          }
        >
          Mochila &amp; Equipamento
        </SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
          {filtered.map((it) => {
            const rc = RARITY[it.rarity] ?? RARITY.comum;
            const big = it.rarity !== 'comum';
            const equippable = slotForItem(it) !== null;
            const equipped = isEquipped(char, it);
            return (
              <LoreTooltip key={it.uid} info={itemLore(it)} anchorStyle={{ display: 'block' }}>
                <div
                  onMouseMove={tilt.onMouseMove}
                  onMouseLeave={tilt.onMouseLeave}
                  style={{
                    position: 'relative',
                    cursor: 'help',
                    borderRadius: 13,
                    padding: 14,
                    background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
                    border: '1px solid ' + hexA(rc.color, big ? 0.5 : 0.18),
                    boxShadow: (big ? `0 0 24px ${hexA(rc.color, 0.22)},` : '') + `inset 0 0 28px ${hexA(rc.color, big ? 0.12 : 0.04)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s',
                    transformStyle: 'preserve-3d',
                  }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {it.category}
                    {it.homebrew && (
                      <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, border: '1px solid ' + hexA(t.acc2 ?? t.acc, 0.5), color: t.acc2 ?? t.acc, fontSize: 8.5, letterSpacing: '.1em' }}>HOMEBREW</span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600, color: rc.color }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: rc.color, boxShadow: '0 0 9px ' + rc.color }} />
                    {rc.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15, color: big ? rc.color : 'var(--ink)', textShadow: big ? '0 0 14px ' + hexA(rc.color, 0.45) : 'none' }}>{it.name}</div>
                  <button
                    onClick={() => store.toggleFavorite(char.id, it.uid)}
                    aria-label="Favoritar"
                    style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 15, color: it.favorite ? t.gold : 'var(--muted)' }}
                  >
                    <Icon name={it.favorite ? 'starFill' : 'star'} size={15} />
                  </button>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                  {it.note}{it.weight ? ` · ${it.weight} kg` : ''}{it.quantity > 1 ? ` · x${it.quantity}` : ''}
                </div>

                <div style={{ marginTop: 11, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {equippable && (
                    <ItemBtn active={equipped} onClick={() => store.toggleEquip(char.id, it.uid)}>
                      {equipped ? 'Desequipar' : 'Equipar'}
                    </ItemBtn>
                  )}
                  <ItemBtn onClick={() => setEditing(it)}>Editar</ItemBtn>
                  <ItemBtn danger onClick={() => store.removeInventoryItem(char.id, it.uid)}>Remover</ItemBtn>
                </div>
                </div>
              </LoreTooltip>
            );
          })}
          {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>Nenhum item neste filtro.</div>}
        </div>
      </Panel>

      {picker && (
        <AddItemPicker
          onAdd={(item) => store.addInventoryItem(char.id, item)}
          onClose={() => setPicker(false)}
        />
      )}
      {forge && (
        <ItemEditorModal
          onSave={(item) => store.addInventoryItem(char.id, item)}
          onClose={() => setForge(false)}
        />
      )}
      {editing && (
        <ItemEditorModal
          item={editing}
          onSave={(item) => store.updateInventoryItem(char.id, editing.uid, item)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function coinBtn(color: string): React.CSSProperties {
  return { cursor: 'pointer', width: 24, height: 24, borderRadius: 7, border: '1px solid var(--line)', background: 'rgba(0,0,0,.3)', color, fontWeight: 700, fontSize: 13 };
}

function ItemBtn({ children, onClick, active, danger }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 11.5,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid ' + (danger ? 'rgba(255,80,40,.4)' : active ? 'var(--gold)' : 'var(--line)'),
        color: danger ? 'var(--danger)' : active ? 'var(--gold)' : 'var(--muted)',
        background: active ? 'rgba(255,224,138,.12)' : 'rgba(0,0,0,.26)',
        transition: '.2s',
      }}
    >
      {children}
    </button>
  );
}
