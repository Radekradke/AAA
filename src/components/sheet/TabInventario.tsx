import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { AddItemPicker } from '@/components/inventory/AddItemPicker';
import { ItemEditorModal } from '@/components/inventory/ItemEditorModal';
import { CoinsModal, COIN_DEFS, coinTotalGp } from '@/components/inventory/CoinsModal';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { RARITY } from '@/data/themes';
import { isEquipped, slotForItem, attunedCount, MAX_ATTUNEMENT } from '@/engine/inventory';
import type { InventoryItem } from '@/types/character';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemLore } from '@/lib/lore';

/** Agrupamento de mochila por categoria — inventário de RPG, não planilha. */
const GROUP_DEFS: { id: string; label: string; icon: IconName; match: (it: InventoryItem) => boolean }[] = [
  { id: 'weapon', label: 'Armas', icon: 'sword', match: (it) => !!it.weapon || it.category === 'weapon' },
  { id: 'armor', label: 'Armaduras & Escudos', icon: 'crest', match: (it) => it.category === 'armor' || it.category === 'shield' },
  { id: 'magic', label: 'Itens Mágicos', icon: 'star', match: (it) => it.category === 'wondrous' || it.category === 'ring' },
  { id: 'consumable', label: 'Poções & Consumíveis', icon: 'spark', match: (it) => it.category === 'consumable' },
  { id: 'tool', label: 'Ferramentas', icon: 'anvil', match: (it) => it.category === 'tool' },
  { id: 'treasure', label: 'Tesouros', icon: 'starFill', match: (it) => it.category === 'treasure' },
  { id: 'gear', label: 'Equipamento', icon: 'satchel', match: (it) => it.category === 'gear' },
  { id: 'other', label: 'Outros', icon: 'quill', match: () => true },
];

function groupOf(it: InventoryItem): string {
  return GROUP_DEFS.find((g) => g.match(it))!.id;
}

const CATEGORY_ICON: Record<string, IconName> = {
  weapon: 'sword', armor: 'crest', shield: 'crest', gear: 'satchel', tool: 'anvil',
  consumable: 'spark', wondrous: 'star', ring: 'star', treasure: 'starFill', other: 'quill',
};

export function TabInventario({ char }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [filter, setFilter] = useState('all');
  const [picker, setPicker] = useState(false);
  const [forge, setForge] = useState<false | string>(false);
  const [coins, setCoins] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const attuneItems = char.inventory.filter((i) => i.attunement);

  const visibleGroups = GROUP_DEFS
    .map((g) => ({ ...g, items: char.inventory.filter((it) => groupOf(it) === g.id) }))
    .filter((g) => g.items.length > 0 && (filter === 'all' || filter === g.id));

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Moedas — resumo compacto + modal de gestão */}
      <Panel>
        <SectionLabel
          right={
            <button
              onClick={() => setCoins(true)}
              style={{ cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '5px 13px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.1) }}
            >
              Gerenciar
            </button>
          }
        >
          Moedas
        </SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {COIN_DEFS.map((c) => (
            <span key={c.k} className="fv-chip" style={{ gap: 6, color: 'var(--ink)' }}>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: c.color, boxShadow: `0 0 7px ${hexA(c.color, 0.5)}` }} />
              <b style={{ fontFamily: "'Chakra Petch', monospace" }}>{char.coins[c.k]}</b>&nbsp;{c.code}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Total aproximado <b style={{ color: 'var(--gold)', fontFamily: "'Chakra Petch', monospace" }}>{coinTotalGp(char).toString().replace('.', ',')} po</b>
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
                style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (it.attuned ? hexA(t.gold, 0.4) : t.line), background: it.attuned ? hexA(t.gold, 0.07) : 'rgba(0,0,0,.26)', color: 'var(--ink)' }}
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
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</FilterChip>
              {GROUP_DEFS.filter((g) => g.id !== 'other' || char.inventory.some((it) => groupOf(it) === 'other')).map((g) => (
                <FilterChip key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>{g.label}</FilterChip>
              ))}
              <button onClick={() => setPicker(true)} style={{ cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 11.5, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.12) }}>
                + Adicionar
              </button>
              <button
                onClick={() => setForge('weapon')}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 11.5, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--acc)', color: 'var(--acc)', background: hexA(t.acc, 0.1) }}
              >
                <Icon name="anvil" size={14} />
                Forjar
              </button>
              <button
                onClick={() => setForge('other')}
                title="Criar item livre na categoria Outros"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--line)', color: 'var(--muted)', background: 'rgba(0,0,0,.2)' }}
              >
                <Icon name="quill" size={13} />
                + Outros
              </button>
            </div>
          }
        >
          Mochila &amp; Equipamento
        </SectionLabel>

        {char.inventory.length === 0 && (
          <EmptyState
            icon="satchel"
            title="Mochila vazia"
            hint={<>Use <b style={{ color: t.gold }}>+ Adicionar</b> para o catálogo ou <b style={{ color: t.acc }}>Forjar</b> para criar algo único.</>}
          />
        )}

        {visibleGroups.map((g) => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 10px' }}>
              <Icon name={g.icon} size={15} color={t.gold} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {g.label}
              </span>
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11, color: 'var(--muted)' }}>· {g.items.length}</span>
              <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--line), transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: 10 }}>
              {g.items.map((it) => (
                <ItemCard
                  key={it.uid}
                  item={it}
                  equipped={isEquipped(char, it)}
                  equippable={slotForItem(it) !== null}
                  onEquip={() => store.toggleEquip(char.id, it.uid)}
                  onFavorite={() => store.toggleFavorite(char.id, it.uid)}
                  onEdit={() => setEditing(it)}
                  onRemove={() => store.removeInventoryItem(char.id, it.uid)}
                />
              ))}
            </div>
          </div>
        ))}
      </Panel>

      {picker && (
        <AddItemPicker
          onAdd={(item) => store.addInventoryItem(char.id, item)}
          onClose={() => setPicker(false)}
          onForge={() => setForge('weapon')}
        />
      )}
      {forge !== false && (
        <ItemEditorModal
          initialCategory={forge}
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
      {coins && <CoinsModal char={char} onClose={() => setCoins(false)} />}
    </div>
  );
}

/* ---------- carta de item ---------- */

function ItemCard({ item: it, equipped, equippable, onEquip, onFavorite, onEdit, onRemove }: {
  item: InventoryItem;
  equipped: boolean;
  equippable: boolean;
  onEquip: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTheme();
  const rc = RARITY[it.rarity] ?? RARITY.comum;
  const big = it.rarity !== 'comum';
  const icon = CATEGORY_ICON[it.category] ?? 'satchel';
  const borderColor = equipped ? t.gold : it.favorite ? hexA(t.gold, 0.55) : hexA(rc.color, big ? 0.5 : 0.18);

  return (
    <LoreTooltip info={itemLore(it)} anchorStyle={{ display: 'block' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          padding: '12px 12px 11px',
          background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
          border: '1px solid ' + borderColor,
          boxShadow:
            (equipped ? `0 0 18px ${hexA(t.gold, 0.22)},` : big ? `0 0 24px ${hexA(rc.color, 0.22)},` : '') +
            `inset 0 0 28px ${hexA(rc.color, big ? 0.12 : 0.04)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            <Icon name={icon} size={12} color={equipped ? t.gold : 'currentColor'} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.category}</span>
            {it.homebrew && (
              <span style={{ flex: 'none', padding: '1px 6px', borderRadius: 4, border: '1px solid ' + hexA(t.acc2 ?? t.acc, 0.5), color: t.acc2 ?? t.acc, fontSize: 8.5, letterSpacing: '.1em' }}>HOMEBREW</span>
            )}
          </span>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: rc.color }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: rc.color, boxShadow: '0 0 9px ' + rc.color }} />
            {rc.label}
          </span>
        </div>

        {equipped && (
          <div style={{ position: 'absolute', top: -1, left: 12, padding: '2px 8px', borderRadius: '0 0 6px 6px', background: t.gold, color: '#140d04', fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em' }}>
            EQUIPADO
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0, fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 14.5, color: big ? rc.color : 'var(--ink)', textShadow: big ? '0 0 14px ' + hexA(rc.color, 0.45) : 'none' }}>
            {it.name}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            aria-label="Favoritar"
            style={{ cursor: 'pointer', flex: 'none', background: 'none', border: 'none', color: it.favorite ? t.gold : 'var(--muted)', filter: it.favorite ? `drop-shadow(0 0 6px ${hexA(t.gold, 0.7)})` : 'none' }}
          >
            <Icon name={it.favorite ? 'starFill' : 'star'} size={15} />
          </button>
        </div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[it.note, it.weight ? `${it.weight} kg` : null, it.quantity > 1 ? `x${it.quantity}` : null, it.value ? `${it.value} po` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {equippable && (
            <ItemBtn active={equipped} onClick={onEquip}>
              {equipped ? 'Desequipar' : 'Equipar'}
            </ItemBtn>
          )}
          <ItemBtn onClick={onEdit}>Editar</ItemBtn>
          <ItemBtn danger onClick={onRemove}>Remover</ItemBtn>
        </div>
      </div>
    </LoreTooltip>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  const t = useTheme();
  return (
    <button
      onClick={onClick}
      style={{ cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11.5, minHeight: 30, padding: '5px 12px', borderRadius: 999, border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.muted, background: active ? hexA(t.gold, 0.1) : 'transparent' }}
    >
      {children}
    </button>
  );
}

function ItemBtn({ children, onClick, active, danger }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 11.5,
        minHeight: 32,
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
