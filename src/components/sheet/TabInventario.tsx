import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HoloBadge } from '@/components/ui/holo-badge';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { AddItemPicker } from '@/components/inventory/AddItemPicker';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { parseDice } from '@/engine/spellCast';
import { getItem } from '@/data/items';
import { ItemEditorModal } from '@/components/inventory/ItemEditorModal';
import { CoinsModal, COIN_DEFS, coinTotalGp } from '@/components/inventory/CoinsModal';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { RARITY } from '@/data/themes';
import { isEquipped, slotForItem, attunedCount, MAX_ATTUNEMENT, containerOf } from '@/engine/inventory';
import type { ContainerId } from '@/engine/inventory';
import { previewEquip } from '@/engine/equipPreview';
import type { EquipPreview } from '@/engine/equipPreview';
import { useUiStore } from '@/store/uiStore';
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
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

/**
 * Recipientes do inventário (estilo BG3): o que está no corpo, o que vai na
 * mochila e o que fica guardado no baú. Cada um é um selo holográfico que
 * "abre" ao toque — e recebe itens arrastados.
 */
const CONTAINERS: { id: ContainerId; label: string; icon: IconName; openIcon: IconName; color: string; empty: string; hint: string }[] = [
  { id: 'equipado', label: 'Equipado', icon: 'equipped', openIcon: 'equipped', color: 'var(--acc)', empty: 'Nada equipado', hint: 'Arraste uma arma, armadura ou escudo para cá — ou toque em Equipar.' },
  { id: 'mochila', label: 'Mochila', icon: 'satchel', openIcon: 'backpackOpen', color: '#FFE08A', empty: 'Mochila vazia', hint: 'Use + Adicionar para o catálogo ou Forjar para criar algo único.' },
  { id: 'bau', label: 'Baú', icon: 'chest', openIcon: 'chestOpen', color: '#E8AA5C', empty: 'Baú vazio', hint: 'Arraste para cá o que você quer guardar fora da mochila.' },
];

/** Leitor de tela: anúncios do arrastar em português. */
const DND_A11Y = {
  screenReaderInstructions: {
    draggable: 'Para mover este item, pressione espaço ou Enter. Use as setas para escolher o recipiente e espaço ou Enter de novo para soltar. Esc cancela.',
  },
  announcements: {
    onDragStart: ({ active }: DragStartEvent) => `Pegou ${String(active.data.current?.name ?? 'o item')}.`,
    onDragOver: ({ over }: DragOverEvent) => (over ? `Sobre ${String(over.data.current?.label ?? over.id)}.` : 'Fora dos recipientes.'),
    onDragEnd: ({ over }: DragEndEvent) => (over ? `Soltou em ${String(over.data.current?.label ?? over.id)}.` : 'Soltou fora — nada mudou.'),
    onDragCancel: () => 'Movimento cancelado.',
  },
};

const CATEGORY_ICON: Record<string, IconName> = {
  weapon: 'sword', armor: 'crest', shield: 'crest', gear: 'satchel', tool: 'anvil',
  consumable: 'spark', wondrous: 'star', ring: 'star', treasure: 'starFill', other: 'quill',
};

/** Rótulo em português da categoria (os ids do catálogo são em inglês). */
const CATEGORY_LABEL: Record<string, string> = {
  weapon: 'Arma', armor: 'Armadura', shield: 'Escudo', gear: 'Equipamento', tool: 'Ferramenta',
  consumable: 'Consumível', wondrous: 'Item maravilhoso', ring: 'Anel', treasure: 'Tesouro', other: 'Outro',
};

export function TabInventario({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  // poção de cura: rola, cura e gasta uma unidade
  const drink = (it: InventoryItem) => {
    const dice = parseDice(healOf(it));
    if (!dice) return;
    const r = rollDice(dice.sides, { count: dice.count, modifier: dice.bonus, label: `${it.name} · cura` });
    store.heal(char.id, r.total);
    if (it.quantity > 1) store.updateInventoryItem(char.id, it.uid, { quantity: it.quantity - 1 });
    else store.removeInventoryItem(char.id, it.uid);
  };
  const [open, setOpen] = useState<ContainerId>(() => (char.inventory.some((it) => isEquipped(char, it)) ? 'equipado' : 'mochila'));
  const [picker, setPicker] = useState(false);
  const [forge, setForge] = useState<false | string>(false);
  const [coins, setCoins] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [dragging, setDragging] = useState<InventoryItem | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const bump = useUiStore((s) => s.bump);

  // mouse: arrasta após 6px; toque: segurar ~0,25 s (não briga com a rolagem da tela)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => () => document.body.classList.remove('fv-dragging'), []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(id);
  }, [flash]);

  const move = (it: InventoryItem, target: ContainerId) => {
    const from = containerOf(char, it);
    if (from === target) return;
    const r = store.moveItem(char.id, it.uid, target);
    const label = CONTAINERS.find((c) => c.id === target)!.label;
    if (r.ok) {
      setFlash({ ok: true, text: `${it.name} → ${label}` });
      bump(0.8);
    } else setFlash({ ok: false, text: r.reason });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const it = char.inventory.find((i) => i.uid === e.active.id);
    setDragging(null);
    document.body.classList.remove('fv-dragging');
    if (it && e.over) move(it, String(e.over.id).replace('dock-', '') as ContainerId);
  };

  // comparação estilo BG3 para cada item equipável ainda não equipado
  const previews = useMemo(() => {
    const map = new Map<string, EquipPreview>();
    for (const it of char.inventory) {
      const p = previewEquip(char, it.uid, derived);
      if (p) map.set(it.uid, p);
    }
    return map;
  }, [char, derived]);

  const attuneItems = char.inventory.filter((i) => i.attunement);

  // Carga: peso carregado × capacidade (FOR × 7,5 kg, PHB 2014)
  const carried = derived.carriedWeight;
  const capacity = derived.carryCapacity;
  const loadPct = capacity > 0 ? Math.min(100, (carried / capacity) * 100) : 0;
  const over = carried > capacity;
  const heavy = !over && carried > capacity * 0.7;
  const loadColor = over ? t.danger : heavy ? '#E0A93E' : '#3FC56B';
  const loadStatus = over ? 'Sobrecarregado' : heavy ? 'Carga pesada' : 'Dentro do limite';

  const inContainer = (id: ContainerId) => char.inventory.filter((it) => containerOf(char, it) === id);
  const openDef = CONTAINERS.find((c) => c.id === open)!;
  const visibleGroups = GROUP_DEFS
    .map((g) => ({ ...g, items: inContainer(open).filter((it) => groupOf(it) === g.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Carga — peso carregado vs. capacidade (FOR × 7,5 kg) */}
      <Panel>
        <LoreTooltip
          info={{
            title: 'Carga',
            subtitle: `${carried.toFixed(1).replace('.', ',')} / ${capacity.toFixed(1).replace('.', ',')} kg`,
            body: 'Capacidade de carga = Força × 7,5 kg (PHB 2014). Acima disso você fica sobrecarregado — a critério do mestre, o deslocamento é penalizado.',
            tags: ['Força', 'Regra da mesa'],
          }}
          anchorStyle={{ display: 'block' }}
        >
          <div className="fv-label" style={{ marginBottom: 10, cursor: 'help', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Carga</span>
            <span style={{ color: loadColor, fontWeight: 700, letterSpacing: 0, textTransform: 'none' }}>{loadStatus}</span>
          </div>
        </LoreTooltip>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: "'Chakra Petch', monospace" }}>
          <span style={{ fontWeight: 700, fontSize: 22, color: loadColor }}>{carried.toFixed(1).replace('.', ',')}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {capacity.toFixed(1).replace('.', ',')} kg</span>
        </div>
        <div style={{ marginTop: 9, height: 10, borderRadius: 5, background: 'var(--sunk-deep)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${loadPct}%`, height: '100%', background: `linear-gradient(90deg, ${hexA(loadColor, 0.55)}, ${loadColor})`, boxShadow: `0 0 12px ${hexA(loadColor, 0.6)}`, transition: 'width .4s, background .3s' }} />
        </div>
        {over && (
          <div style={{ marginTop: 9, fontSize: 12, color: t.danger, fontWeight: 600 }}>
            Acima da capacidade — o mestre pode reduzir seu deslocamento.
          </div>
        )}
      </Panel>

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
                style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (it.attuned ? hexA(t.gold, 0.4) : t.line), background: it.attuned ? hexA(t.gold, 0.07) : 'var(--sunk)', color: 'var(--ink)' }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 999, flex: 'none', border: '1px solid ' + (it.attuned ? t.gold : t.line), background: it.attuned ? t.gold : 'transparent', boxShadow: it.attuned ? '0 0 10px ' + hexA(t.gold, 0.6) : 'none' }} />
                <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: 14 }}>{it.name}</span>
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
              <button onClick={() => setPicker(true)} style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.12) }}>
                + Adicionar
              </button>
              <button
                onClick={() => setForge('weapon')}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--acc)', color: 'var(--acc)', background: 'var(--lift)' }}
              >
                <Icon name="anvil" size={14} />
                Forjar
              </button>
              <button
                onClick={() => setForge('other')}
                title="Criar item livre na categoria Outros"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, minHeight: 30, padding: '5px 14px', borderRadius: 999, border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--sunk)' }}
              >
                <Icon name="quill" size={13} />
                + Outros
              </button>
            </div>
          }
        >
          Itens
        </SectionLabel>

        <DndContext
          sensors={sensors}
          accessibility={DND_A11Y}
          autoScroll={false}
          collisionDetection={pointerFirst}
          // a barra de destinos é fixa: mede sempre, não só no início do arraste
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={(e) => {
            setDragging(char.inventory.find((i) => i.uid === e.active.id) ?? null);
            document.body.classList.add('fv-dragging'); // trava a rolagem da página
          }}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setDragging(null);
            document.body.classList.remove('fv-dragging');
          }}
        >
        {/* recipientes: toque para abrir, arraste itens para cá */}
        <div role="group" aria-label="Recipientes" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(8px,1.4vw,14px)', marginBottom: 8 }}>
          {CONTAINERS.map((c) => {
            const items = char.inventory.filter((it) => containerOf(char, it) === c.id);
            return (
              <ContainerDrop
                key={c.id}
                def={c}
                count={items.reduce((n, it) => n + Math.max(1, it.quantity), 0)}
                kg={items.reduce((w, it) => w + it.weight * it.quantity, 0)}
                isOpen={open === c.id}
                dragging={dragging}
                accepts={!dragging || c.id !== 'equipado' || slotForItem(dragging) !== null}
                isSource={!!dragging && containerOf(char, dragging) === c.id}
                onOpen={() => setOpen(c.id)}
              />
            );
          })}
        </div>
        <div aria-live="polite" style={{ minHeight: 20, marginBottom: 8, fontSize: 12, textAlign: 'center', color: flash ? (flash.ok ? '#3FC56B' : t.danger) : 'var(--muted)' }}>
          {flash ? flash.text : dragging ? `Solte ${dragging.name} num recipiente` : 'Segure e arraste um item para outro recipiente'}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={open}
            id="fv-container-panel"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
        {visibleGroups.length === 0 && (
          <EmptyState icon={openDef.openIcon} title={openDef.empty} hint={openDef.hint} />
        )}

        {visibleGroups.map((g) => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 10px' }}>
              <Icon name={g.icon} size={15} color={t.gold} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {g.label}
              </span>
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11, color: 'var(--muted)' }}>· {g.items.length}</span>
              <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--line), transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 10 }}>
              {g.items.map((it) => {
                const where = containerOf(char, it);
                return (
                  <DraggableItem key={it.uid} item={it}>
                    {(handle) => (
                      <ItemCard
                        item={it}
                        equipped={where === 'equipado'}
                        equippable={slotForItem(it) !== null}
                        preview={previews.get(it.uid) ?? null}
                        handle={handle}
                        stashLabel={where === 'bau' ? 'Levar na Mochila' : 'Guardar no Baú'}
                        loreDisabled={!!dragging}
                        onStash={() => move(it, where === 'bau' ? 'mochila' : 'bau')}
                        onEquip={() => move(it, where === 'equipado' ? 'mochila' : 'equipado')}
                        onFavorite={() => store.toggleFavorite(char.id, it.uid)}
                        onEdit={() => setEditing(it)}
                        onRemove={() => store.removeInventoryItem(char.id, it.uid)}
                        onDrink={healOf(it) ? () => drink(it) : undefined}
                      />
                    )}
                  </DraggableItem>
                );
              })}
            </div>
          </div>
        ))}
          </motion.div>
        </AnimatePresence>

        {/* o item "na mão" enquanto arrasta */}
        {/* destinos sempre à mão enquanto arrasta (a lista pode ser longa) */}
        {dragging && createPortal(<DropDock dragging={dragging} sourceId={containerOf(char, dragging)} />, document.body)}
        {createPortal(
          <DragOverlay zIndex={220} dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
            {dragging ? <CarriedItem item={dragging} /> : null}
          </DragOverlay>,
          document.body,
        )}
        </DndContext>
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

/** Solta onde o dedo/ponteiro está; sem ponteiro (teclado), pela caixa do item. */
const pointerFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** Barra de destinos fixa embaixo da tela, visível só durante o arrastar. */
function DropDock({ dragging, sourceId }: { dragging: InventoryItem; sourceId: ContainerId }) {
  return (
    <div className="fv-dock" role="group" aria-label="Soltar em">
      {CONTAINERS.map((c) => (
        <DockZone key={c.id} def={c} accepts={c.id !== 'equipado' || slotForItem(dragging) !== null} isSource={c.id === sourceId} />
      ))}
    </div>
  );
}

function DockZone({ def, accepts, isSource }: { def: (typeof CONTAINERS)[number]; accepts: boolean; isSource: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dock-${def.id}`, data: { label: def.label } });
  const lit = isOver && accepts && !isSource;
  const color = accepts ? def.color : 'var(--danger)';
  return (
    <div
      ref={setNodeRef}
      className={'fv-dock-zone' + (isOver ? ' is-over' : '') + (!accepts ? ' is-refuse' : '') + (isSource ? ' is-source' : '')}
      style={{ ['--drop-color' as string]: color }}
    >
      <Icon name={lit ? def.openIcon : def.icon} size={26} color={isSource ? 'var(--muted)' : color} />
      <span>{isSource ? `${def.label} (aqui)` : !accepts ? 'Não equipa' : def.label}</span>
    </div>
  );
}

/* ---------- recipientes que recebem itens arrastados ---------- */

function ContainerDrop({ def, count, kg, isOpen, dragging, accepts, isSource, onOpen }: {
  def: (typeof CONTAINERS)[number];
  count: number;
  kg: number;
  isOpen: boolean;
  dragging: InventoryItem | null;
  accepts: boolean;
  isSource: boolean;
  onOpen: () => void;
}) {
  const t = useTheme();
  const { setNodeRef, isOver } = useDroppable({ id: def.id, data: { label: def.label } });
  const target = !!dragging && !isSource;
  const hovering = isOver && target;
  // a tampa abre quando você passa com o item por cima
  const lit = isOpen || (hovering && accepts);
  const state = !dragging ? '' : !accepts ? ' is-refuse' : isSource ? ' is-source' : ' is-target';
  return (
    <div ref={setNodeRef} className={'fv-drop' + state + (hovering ? ' is-over' : '')} style={{ ['--drop-color' as string]: accepts ? def.color : t.danger }}>
      <HoloBadge
        tone="steel"
        className="fv-holo-subtle"
        active={lit}
        expanded={isOpen}
        controls="fv-container-panel"
        ariaLabel={`${def.label}: ${count} ${count === 1 ? 'item' : 'itens'}${isOpen ? ' (aberto)' : ''}`}
        onClick={onOpen}
        style={{ width: '100%' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 'clamp(12px,2vw,16px) 6px', textAlign: 'center', boxShadow: isOpen ? `inset 0 0 0 1px ${def.color}, inset 0 -3px 0 ${def.color}` : undefined, borderRadius: 'var(--radius-lg)' }}>
          <Icon name={lit ? def.openIcon : def.icon} size={34} color={lit ? def.color : t.muted} style={{ filter: lit ? `drop-shadow(0 0 8px ${hexA(def.color, 0.6)})` : undefined, transition: 'color .25s' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(13px,1.6vw,15px)', color: lit ? 'var(--ink)' : 'var(--muted)' }}>{def.label}</div>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.35 }}>
            <div>{count} {count === 1 ? 'item' : 'itens'}</div>
            <div>{kg.toFixed(1).replace('.', ',')} kg</div>
          </div>
        </div>
      </HoloBadge>
    </div>
  );
}

/* ---------- item arrastável ---------- */

interface DragHandle {
  ref: (el: HTMLElement | null) => void;
  props: Record<string, unknown>;
}

/**
 * Mouse e toque arrastam pelo card inteiro (toque: segurar); o teclado usa
 * só a alça ⠿ — assim Enter nos botões do card continua sendo clique.
 */
function DraggableItem({ item, children }: { item: InventoryItem; children: (handle: DragHandle) => React.ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: item.uid, data: { name: item.name } });
  const { onKeyDown, ...pointerListeners } = (listeners ?? {}) as Record<string, (e: unknown) => void>;
  return (
    <div ref={setNodeRef} {...pointerListeners} className="fv-draggable" style={{ opacity: isDragging ? 0.3 : 1 }}>
      {children({ ref: setActivatorNodeRef, props: { ...attributes, onKeyDown } })}
    </div>
  );
}

/** O item "na mão" durante o arrastar. */
function CarriedItem({ item: it }: { item: InventoryItem }) {
  const rc = RARITY[it.rarity] ?? RARITY.comum;
  return (
    <div className="fv-carried" style={{ borderColor: rc.color, boxShadow: `0 18px 40px rgba(0,0,0,.6), 0 0 22px ${hexA(rc.color, 0.45)}` }}>
      <Icon name={CATEGORY_ICON[it.category] ?? 'satchel'} size={18} color={rc.color} />
      <span>{it.name}</span>
    </div>
  );
}

/* ---------- carta de item ---------- */

/** Dados de cura da poção (fichas antigas não copiaram o campo: busca no catálogo). */
const healOf = (it: InventoryItem) => it.heal ?? getItem(it.itemId)?.heal;

function ItemCard({ item: it, equipped, equippable, preview, handle, stashLabel, loreDisabled, onStash, onEquip, onFavorite, onEdit, onRemove, onDrink }: {
  item: InventoryItem;
  /** Arrastando: a dica de "segurar" não pode abrir por cima dos destinos. */
  loreDisabled: boolean;
  equipped: boolean;
  equippable: boolean;
  preview: EquipPreview | null;
  handle: DragHandle;
  stashLabel: string;
  onStash: () => void;
  onEquip: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Poções de cura: bebe (rola a cura, aplica nos PV e gasta uma). */
  onDrink?: () => void;
}) {
  const t = useTheme();
  const rc = RARITY[it.rarity] ?? RARITY.comum;
  const big = it.rarity !== 'comum';
  const icon = CATEGORY_ICON[it.category] ?? 'satchel';
  const borderColor = equipped ? t.gold : it.favorite ? hexA(t.gold, 0.55) : hexA(rc.color, big ? 0.5 : 0.18);

  return (
    <LoreTooltip info={itemLore(it)} anchorStyle={{ display: 'block' }} disabled={loreDisabled}>
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
            {equipped ? (
              <span className="fv-item-equipped">
                <Icon name="equipped" size={11} /> Equipado
              </span>
            ) : (
              <Icon name={icon} size={12} />
            )}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CATEGORY_LABEL[it.category] ?? it.category}</span>
            {it.homebrew && (
              <span style={{ flex: 'none', padding: '1px 6px', borderRadius: 4, border: '1px solid ' + hexA(t.acc2 ?? t.acc, 0.5), color: t.acc2 ?? t.acc, fontSize: 8.5, letterSpacing: '.1em' }}>HOMEBREW</span>
            )}
          </span>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: rc.color }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: rc.color, boxShadow: '0 0 9px ' + rc.color }} />
            {rc.label}
            <button ref={handle.ref} {...handle.props} type="button" aria-label={`Arrastar ${it.name}`} title="Arrastar para outro recipiente" className="fv-drag-handle">
              ⠿
            </button>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: big ? rc.color : 'var(--ink)', textShadow: big ? '0 0 14px ' + hexA(rc.color, 0.45) : 'none' }}>
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
          {[it.note, it.weight ? `${String(it.weight).replace(".", ",")} kg` : null, it.quantity > 1 ? `x${it.quantity}` : null, it.value ? `${it.value} po` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {/* comparação estilo BG3: o que muda se equipar */}
        {preview && (preview.deltas.length > 0 || preview.warnings.length > 0) && (
          <div className="fv-compare">
            <div className="fv-compare-head">
              Ao equipar{preview.replaces ? <span> · troca {preview.replaces.name}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {preview.deltas.map((d) => {
                const c = d.better === true ? '#3FC56B' : d.better === false ? t.danger : t.acc;
                return (
                  <span key={d.label} className="fv-compare-chip" style={{ borderColor: hexA(c, 0.45), color: c }}>
                    <b>{d.label}</b> {d.from} → {d.to}{d.better === true ? ' ▲' : d.better === false ? ' ▼' : ''}
                  </span>
                );
              })}
            </div>
            {preview.warnings.map((w) => (
              <div key={w} style={{ marginTop: 5, fontSize: 11, color: '#E0A93E' }}>⚠ {w}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {equippable && (
            <ItemBtn active={equipped} onClick={onEquip}>
              {equipped ? 'Desequipar' : 'Equipar'}
            </ItemBtn>
          )}
          {onDrink && <ItemBtn active onClick={onDrink}>Beber · {healOf(it)}</ItemBtn>}
          {!equipped && <ItemBtn onClick={onStash}>{stashLabel}</ItemBtn>}
          <ItemBtn onClick={onEdit}>Editar</ItemBtn>
          <button type="button" className="fv-item-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Remover ${it.name}`} title="Remover">
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
    </LoreTooltip>
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
        background: active ? 'rgba(255,224,138,.12)' : 'var(--sunk)',
        transition: '.2s',
      }}
    >
      {children}
    </button>
  );
}
