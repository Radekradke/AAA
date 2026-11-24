import { Modal } from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
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
import { Icon, InlineIcon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { RARITY } from '@/data/themes';
import { isEquipped, canEquip, attunedCount, MAX_ATTUNEMENT, containerOf, isWearable, isWorn, attunementBlock, offHandCandidate } from '@/engine/inventory';
import { BODY_SLOTS, bodySlotOf } from '@/engine/bodySlots';
import type { ContainerId } from '@/engine/inventory';
import { previewEquip } from '@/engine/equipPreview';
import { isPack } from '@/engine/packs';
import type { EquipTarget, EquipPreview } from '@/engine/equipPreview';
import { useUiStore } from '@/store/uiStore';
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { InventoryItem } from '@/types/character';
import type { DamageType } from '@/types/dnd';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemLore } from '@/lib/lore';
import type { LoreInfo } from '@/lib/lore';
import { PortraitPicker } from '@/components/character/PortraitPicker';

/** Arte do item: menor que um retrato (fica salva na ficha). */
const ITEM_ART_MAX = { w: 480, h: 600 };

/** Detalhes do item + a carta com a arte (quando o jogador enviou uma). */
function itemInfo(it: InventoryItem): LoreInfo {
  const lore = itemLore({ ...getItem(it.itemId ?? ''), ...it });
  const art = itemArt(it);
  return { ...lore, ...(art ? { art: { src: art, rarity: it.rarity } } : {}) };
}
import { useInk } from '@/lib/contrast';
import { itemArt } from '@/lib/itemArt';
import '@/styles/inventario.css';
import { chargesLeft, chargesOf } from '@/engine/itemCharges';
import { ammoCount, ammoKindOfItem, perBundle } from '@/engine/ammo';

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
  { id: 'equipado', label: 'Equipado', icon: 'equipped', openIcon: 'equipped', color: 'var(--acc)', empty: 'Nada equipado', hint: 'Arraste uma arma, armadura, escudo ou item vestível para cá — ou toque em Equipar/Vestir. Partes do corpo ficam sempre aqui.' },
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
  const ink = useInk();
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
  const [equipRequest, setEquipRequest] = useState<{ uid: string; target: EquipTarget } | null>(null);
  const requestedItem = char.inventory.find((i) => i.uid === equipRequest?.uid);
  const equipComparison = equipRequest ? previewEquip(char, equipRequest.uid, derived, equipRequest.target) : null;
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

  const move = (it: InventoryItem, target: ContainerId, confirmed = false) => {
    const from = containerOf(char, it);
    if (from === target) return;
    if (target === 'equipado' && !confirmed) { setEquipRequest({ uid: it.uid, target }); return; }
    const r = store.moveItem(char.id, it.uid, target);
    const label = CONTAINERS.find((c) => c.id === target)!.label;
    if (r.ok) {
      setFlash({ ok: true, text: r.note ?? `${it.name} → ${label}` });
      bump(0.8);
    } else setFlash({ ok: false, text: r.reason });
  };

  const toOffHand = (it: InventoryItem, confirmed = false) => {
    if (!confirmed) { setEquipRequest({ uid: it.uid, target: 'offHand' }); return; }
    const r = store.equipOffHand(char.id, it.uid);
    if (r.ok) {
      setFlash({ ok: true, text: r.note ?? `${it.name} na segunda mão` });
      bump(0.8);
    } else setFlash({ ok: false, text: r.reason });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const it = char.inventory.find((i) => i.uid === e.active.id);
    setDragging(null);
    document.body.classList.remove('fv-dragging');
    if (it && e.over) move(it, String(e.over.id).replace('dock-', '') as ContainerId);
  };

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
      className="animate-riseIn fv-inv"
    >
      {/* Carga — peso carregado vs. capacidade (FOR × 7,5 kg) */}
      <Panel>
        <LoreTooltip
          info={{
            title: 'Carga',
            subtitle: `${carried.toFixed(1).replace('.', ',')} / ${capacity.toFixed(1).replace('.', ',')} kg`,
            body: 'Capacidade de carga = Força × 7,5 kg (PHB 2014). Acima disso você fica sobrecarregado — a critério do mestre, o deslocamento é penalizado.',
            tags: ['Força', 'PHB 2014'],
          }}
          anchorStyle={{ display: 'block' }}
        >
          {/* o ✦ do rótulo é um item do flex: o status vai para a direita com margem automática */}
          <div className="fv-label fv-inv-loadlabel">
            <span>Carga</span>
            <span className="fv-tone fv-inv-loadstatus" style={{ '--c': loadColor } as React.CSSProperties}>{loadStatus}</span>
          </div>
        </LoreTooltip>
        <div className="fv-inv-loadrow">
          <span className="fv-inv-loadnum" style={{ color: ink(loadColor, 3.2) }}>{carried.toFixed(1).replace('.', ',')}</span>
          <span className="fv-inv-loadcap">/ {capacity.toFixed(1).replace('.', ',')} kg</span>
        </div>
        <div className="fv-inv-bar">
          <div className="fv-inv-bar-fill" style={{ width: `${loadPct}%`, background: `linear-gradient(90deg, ${hexA(loadColor, 0.55)}, ${loadColor})`, boxShadow: `0 0 12px ${hexA(loadColor, 0.6)}` }} />
        </div>
        {over && (
          <div className="fv-inv-over">
            Acima da capacidade — o mestre pode reduzir seu deslocamento.
          </div>
        )}
      </Panel>

      {/* Moedas — resumo compacto + modal de gestão */}
      <Panel>
        <SectionLabel
          right={
            <button type="button" className="fv-inv-manage" onClick={() => setCoins(true)}>
              Gerenciar
            </button>
          }
        >
          Moedas
        </SectionLabel>
        <div className="fv-inv-coins">
          {COIN_DEFS.map((c) => (
            <span key={c.k} className="fv-chip fv-inv-coin">
              <span aria-hidden className="fv-inv-coin-dot" style={{ background: c.color, boxShadow: `0 0 7px ${hexA(c.color, 0.5)}` }} />
              <b>{char.coins[c.k]}</b>&nbsp;{c.code}
            </span>
          ))}
        </div>
        <div className="fv-inv-total">
          Total aproximado <b>{coinTotalGp(char).toString().replace('.', ',')} po</b>
        </div>
      </Panel>

      {/* Sintonia */}
      <Panel>
        <div className="fv-label fv-inv-mb13">
          Sintonia <span className="fv-label-count">· {attunedCount(char)} de {MAX_ATTUNEMENT}</span>
        </div>
        <div className="fv-inv-attune-list">
          {attuneItems.length === 0 && <div className="fv-inv-attune-empty">Nenhum item que exija sintonia na mochila.</div>}
          {attuneItems.map((it) => (
            <LoreTooltip key={it.uid} info={itemInfo(it)} anchorStyle={{ display: 'block' }}>
              <button
                type="button"
                className={'fv-inv-attune' + (it.attuned ? ' is-on' : '')}
                onClick={() => {
                  if (!it.attuned && attunedCount(char) >= MAX_ATTUNEMENT) {
                    setFlash({ ok: false, text: `Já tem ${MAX_ATTUNEMENT} itens sintonizados (o máximo) — desfaça uma sintonia antes.` });
                    return;
                  }
                  const blocked = !it.attuned && attunementBlock(char, it);
                  if (blocked) {
                    setFlash({ ok: false, text: blocked });
                    return;
                  }
                  setEquipRequest({ uid: it.uid, target: 'attune' });
                }}
              >
                <span className="fv-inv-attune-dot" />
                <span className="fv-inv-attune-name">{it.name}</span>
                <span className="fv-inv-attune-state" style={it.attuned && isWearable(it) && !isWorn(it) ? { color: '#E0A93E' } : undefined}>
                  {it.attuned ? (isWearable(it) && !isWorn(it) ? 'sintonizado · vista para valer' : 'sintonizado') : attunementBlock(char, it) ? 'não é para a sua classe' : 'sem sintonia'}
                </span>
              </button>
            </LoreTooltip>
          ))}
        </div>
      </Panel>

      {/* Mochila & Equipamento */}
      <Panel full>
        <SectionLabel
          right={
            <div className="fv-inv-tools">
              <button type="button" className="fv-inv-tool is-add" onClick={() => setPicker(true)}>
                + Adicionar
              </button>
              <button type="button" className="fv-inv-tool is-forge" onClick={() => setForge('weapon')}>
                <Icon name="anvil" size={14} />
                Forjar
              </button>
              <button type="button" className="fv-inv-tool" onClick={() => setForge('other')} title="Criar item livre na categoria Outros">
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
        <div role="group" aria-label="Recipientes" className="fv-inv-boxes">
          {CONTAINERS.map((c) => {
            const items = char.inventory.filter((it) => containerOf(char, it) === c.id);
            return (
              <ContainerDrop
                key={c.id}
                def={c}
                count={items.reduce((n, it) => n + Math.max(1, it.quantity), 0)}
                kg={items.reduce((w, it) => (it.wear === 'body' ? w : w + it.weight * it.quantity), 0)}
                isOpen={open === c.id}
                dragging={dragging}
                accepts={!dragging || (dragging.wear === 'body' ? c.id === 'equipado' : c.id !== 'equipado' || canEquip(dragging))}
                isSource={!!dragging && containerOf(char, dragging) === c.id}
                onOpen={() => setOpen(c.id)}
              />
            );
          })}
        </div>
        <div aria-live="polite" className={'fv-inv-flash' + (flash && !flash.ok ? ' is-bad' : '')} style={flash?.ok ? { color: '#3FC56B' } : undefined}>
          {flash ? flash.text : dragging ? `Solte ${dragging.name} num recipiente` : 'Segure e arraste um item para outro recipiente'}
        </div>

        <AnimatePresence mode="wait">
          <m.div
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
          <div key={g.id} className="fv-inv-group">
            <div className="fv-inv-group-head">
              <Icon name={g.icon} size={15} color="var(--color-metal)" />
              <span className="fv-inv-group-name">{g.label}</span>
              <span className="fv-inv-group-count">· {g.items.length}</span>
              <span aria-hidden className="fv-inv-group-rule" />
            </div>
            <div className="fv-inv-grid">
              {g.items.map((it) => {
                const where = containerOf(char, it);
                return (
                  <DraggableItem key={it.uid} item={it}>
                    {(handle) => (
                      <ItemCard
                        item={it}
                        equipped={where === 'equipado'}
                        equippable={canEquip(it)}
                        preview={null}
                        handle={handle}
                        stashLabel={where === 'bau' ? 'Levar na Mochila' : 'Guardar no Baú'}
                        loreDisabled={!!dragging}
                        onStash={() => move(it, where === 'bau' ? 'mochila' : 'bau')}
                        onEquip={() => move(it, where === 'equipado' ? 'mochila' : 'equipado')}
                        onOffHand={offHandCandidate(char, it) ? () => toOffHand(it) : undefined}
                        offHand={char.equipped.offHand === it.uid && char.equipped.mainHand !== it.uid}
                        onFavorite={() => store.toggleFavorite(char.id, it.uid)}
                        onEdit={() => setEditing(it)}
                        onRemove={() => store.removeInventoryItem(char.id, it.uid)}
                        onDrink={healOf(it) ? () => drink(it) : undefined}
                        canActivate={where === 'equipado' && it.attuned && !char.combat.turn.bonus}
                        onActivate={(it.requiresActivation ?? getItem(it.itemId)?.requiresActivation) ? () => {
                          if (where !== 'equipado' || !it.attuned || char.combat.turn.bonus) return;
                          store.updateInventoryItem(char.id, it.uid, { activated: !it.activated });
                          store.useTurn(char.id, 'bonus');
                        } : undefined}
                        onResistance={it.itemId === 'm-ring-resist' ? (resistanceType) => store.updateInventoryItem(char.id, it.uid, { resistanceType }) : undefined}
                        onOpenPack={isPack(it.itemId) ? () => store.openPackItem(char.id, it.uid) : undefined}
                        charges={chargesOf(it) ? { left: chargesLeft(char, it), max: chargesOf(it)!.max, regain: chargesOf(it)!.regain } : undefined}
                        onCharge={(n) => store.spendItemCharges(char.id, it.uid, n)}
                        onArt={(img) => store.updateInventoryItem(char.id, it.uid, { image: img })}
                      />
                    )}
                  </DraggableItem>
                );
              })}
            </div>
          </div>
        ))}
          </m.div>
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

      {equipRequest && <Modal title="Comparar antes de equipar" onClose={() => setEquipRequest(null)} footer={<>
        <button type="button" className="fv-btn-ghost" onClick={() => setEquipRequest(null)}>Cancelar</button>
        <button type="button" className="fv-btn-gold" disabled={!requestedItem || !equipComparison || equipComparison.blocked} onClick={() => { if (requestedItem) { if (equipRequest.target === "attune") store.toggleAttune(char.id, requestedItem.uid); else if (equipRequest.target === "offHand") toOffHand(requestedItem, true); else move(requestedItem, "equipado", true); } setEquipRequest(null); }}>{equipRequest.target === 'attune' ? 'Confirmar sintonia' : 'Confirmar troca'}</button>
      </>}>
        <div className="fv-experience"><h3>{requestedItem?.name ?? "Item indisponível"}</h3>
        {equipComparison ? <><p>{equipComparison.removed?.length ? "Sai: " + equipComparison.removed.join(", ") : "Nenhum item precisa sair."}</p>
          <table className="fv-experience-table"><thead><tr><th>Característica</th><th>Agora</th><th>Depois</th></tr></thead><tbody>{equipComparison.facts?.map((f) => <tr key={f.label}><th>{f.label}</th><td>{f.from}</td><td>{f.to}</td></tr>)}</tbody></table>
          {equipComparison.deltas.filter((d) => !["CA", "Desloc.", "Acerto", "Dano"].includes(d.label)).map((d) => <p key={d.label}>{d.label}: {d.from} → {d.to}</p>)}
          {equipComparison.warnings.length > 0 && <ul>{equipComparison.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}</> : <p role="status">O item mudou ou já está equipado. Feche e confira o inventário novamente.</p>}</div>
      </Modal>}
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
        <DockZone key={c.id} def={c} accepts={dragging.wear === 'body' ? c.id === 'equipado' : c.id !== 'equipado' || canEquip(dragging)} isSource={c.id === sourceId} />
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
        <div className={'fv-inv-box' + (lit ? ' is-lit' : '')} style={isOpen ? { boxShadow: `inset 0 0 0 1px ${def.color}, inset 0 -3px 0 ${def.color}` } : undefined}>
          <Icon name={lit ? def.openIcon : def.icon} size={34} color={lit ? def.color : t.muted} className="fv-inv-box-icon" style={lit ? { filter: `drop-shadow(0 0 8px ${hexA(def.color, 0.6)})` } : undefined} />
          <div className="fv-inv-box-name">{def.label}</div>
          <div className="fv-inv-box-meta">
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
    <div ref={setNodeRef} {...pointerListeners} className={'fv-draggable' + (isDragging ? ' is-dragging' : '')}>
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

function ItemCard({ item: it, equipped, equippable, preview, handle, stashLabel, loreDisabled, onStash, onEquip, onOffHand, offHand, onFavorite, onEdit, onRemove, onDrink, onOpenPack, onArt, charges, onCharge, onActivate, canActivate, onResistance }: {
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
  /** "Equipar na segunda mão" (arma de uma mão ao lado da principal). */
  onOffHand?: () => void;
  /** Este item está na mão secundária. */
  offHand?: boolean;
  onFavorite: () => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Poções de cura: bebe (rola a cura, aplica nos PV e gasta uma). */
  onDrink?: () => void;
  onActivate?: () => void;
  canActivate?: boolean;
  onResistance?: (type: DamageType | undefined) => void;
  /** Pacote fechado (ficha antiga): abre nos itens de dentro. */
  onOpenPack?: () => void;
  /** Item com cargas (cajado, varinha, Anel da Evasão…). */
  charges?: { left: number; max: number; regain: string };
  /** Gasta (positivo) ou devolve (negativo) cargas. */
  onCharge?: (n: number) => void;
  /** Arte do item (carta ao lado dos detalhes). */
  onArt: (img: string | null) => void;
}) {
  const t = useTheme();
  const ink = useInk();
  const rc = RARITY[it.rarity] ?? RARITY.comum;
  const big = it.rarity !== 'comum';
  const art = itemArt(it);
  const icon = CATEGORY_ICON[it.category] ?? 'satchel';
  const borderColor = equipped ? t.gold : it.favorite ? hexA(t.gold, 0.55) : hexA(rc.color, big ? 0.5 : 0.18);

  return (
    <LoreTooltip info={itemInfo(it)} anchorStyle={{ display: 'block' }} disabled={loreDisabled}>
      <div
        className="fv-inv-card"
        data-item={it.name}
        style={{
          border: '1px solid ' + borderColor,
          boxShadow:
            (equipped ? `0 0 18px ${hexA(t.gold, 0.22)},` : big ? `0 0 24px ${hexA(rc.color, 0.22)},` : '') +
            `inset 0 0 28px ${hexA(rc.color, big ? 0.12 : 0.04)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        <div className="fv-inv-card-top">
          <span className="fv-inv-card-kind">
            {it.wear === 'body' ? (
              <span className="fv-item-equipped">
                <Icon name="equipped" size={11} /> Corpo
              </span>
            ) : equipped ? (
              <span className="fv-item-equipped">
                <Icon name="equipped" size={11} /> {isWearable(it) ? 'Vestido' : 'Equipado'}
              </span>
            ) : (
              <Icon name={icon} size={12} />
            )}
            {/* vestível / parte do corpo: o selo já diz o que é */}
            {!it.wear && <span className="fv-inv-card-cat">{bodySlotOf(it) ? BODY_SLOTS[bodySlotOf(it)!].label : CATEGORY_LABEL[it.category] ?? it.category}</span>}
            {it.homebrew && (
              <span className="fv-inv-homebrew">HOMEBREW</span>
            )}
          </span>
          <span className="fv-inv-rarity" style={{ color: ink(rc.color) }}>
            <span className="fv-inv-rarity-dot" style={{ background: rc.color, boxShadow: '0 0 9px ' + rc.color }} />
            {rc.label}
            <button ref={handle.ref} {...handle.props} type="button" aria-label={`Arrastar ${it.name}`} title="Arrastar para outro recipiente" className="fv-drag-handle">
              <InlineIcon name="grip" />
            </button>
          </span>
        </div>

        <div className="fv-inv-card-row">
          {/* miniatura da carta (só com foto); sem foto, só o botão discreto de enviar */}
          <span className={'fv-item-thumb' + (art ? ' has-art' : ' is-empty')} style={art ? { borderColor: hexA(rc.color, big ? 0.7 : 0.35) } : undefined}>
            {art && <img src={art} alt="" />}
            <PortraitPicker variant="badge" portrait={it.image} onChange={onArt} max={ITEM_ART_MAX} labels={{ add: `Enviar arte de ${it.name}`, change: `Trocar arte de ${it.name}` }} />
          </span>
          <div className="fv-inv-card-name" style={big ? { color: ink(rc.color), textShadow: '0 0 14px ' + hexA(rc.color, 0.45) } : undefined}>
            {it.name}
          </div>
          <button
            type="button"
            className={'fv-item-fav' + (it.favorite ? ' is-on' : '')}
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            aria-label="Favoritar"
          >
            <Icon name={it.favorite ? 'starFill' : 'star'} size={15} />
          </button>
        </div>
        <div className="fv-inv-card-meta">
          {[it.note, it.weight && it.wear !== 'body' ? `${String(it.weight).replace(".", ",")} kg` : null, qtyLabel(it), it.value ? `${it.value} po` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {charges && (
          <div className="fv-inv-charges" aria-label={`${charges.left} de ${charges.max} cargas`}>
            <span className="fv-charge-pips" aria-hidden>
              {Array.from({ length: charges.max }, (_, i) => <i key={i} className={i < charges.left ? 'is-on' : ''} />)}
            </span>
            <span className="fv-inv-charges-n">{charges.left}/{charges.max} cargas</span>
            <button type="button" disabled={charges.left === 0} onClick={(e) => { e.stopPropagation(); onCharge?.(1); }} aria-label={`Gastar 1 carga de ${it.name}`}>−1</button>
            <button type="button" disabled={charges.left === charges.max} onClick={(e) => { e.stopPropagation(); onCharge?.(-1); }} aria-label={`Devolver 1 carga a ${it.name}`}>+1</button>
          </div>
        )}

        {/* comparação estilo BG3: o que muda se equipar */}
        {preview && (preview.deltas.length > 0 || preview.warnings.length > 0) && (
          <div className="fv-compare">
            <div className="fv-compare-head">
              {isWearable(it) ? 'Ao vestir' : 'Ao equipar'}{preview.replaces ? <span> · sai {preview.replaces.name}</span> : null}
            </div>
            <div className="fv-inv-compare-chips">
              {preview.deltas.map((d) => {
                const c = d.better === true ? '#3FC56B' : d.better === false ? t.danger : t.acc;
                return (
                  <span key={d.label} className="fv-compare-chip" style={{ borderColor: hexA(c, 0.45), color: ink(c) }}>
                    <b>{d.label}</b> {d.from} → {d.to}{d.better === true ? <> <InlineIcon name="triUp" size={10} /></> : d.better === false ? <> <InlineIcon name="triDown" size={10} /></> : ''}
                  </span>
                );
              })}
            </div>
            {preview.warnings.map((w) => (
              <div key={w} className="fv-inv-compare-warn" style={{ color: '#E0A93E' }}><InlineIcon name="warning" /> {w}</div>
            ))}
          </div>
        )}

        <div className="fv-inv-actions">
          {onActivate && <button type="button" className="fv-btn-ghost" aria-pressed={!!it.activated} disabled={!canActivate} onClick={(e) => { e.stopPropagation(); onActivate(); }}>{it.activated ? 'Apagar lâmina' : 'Acender lâmina'} · ação bônus</button>}
          {onResistance && <label className="fv-inv-resist">Resistência
            <select className="fv-input" aria-label={`Resistência de ${it.name}`} value={it.resistanceType ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onResistance(e.target.value ? e.target.value as DamageType : undefined)}>
              <option value="">Escolha a gema</option>
              {(['ácido', 'frio', 'fogo', 'força', 'elétrico', 'necrótico', 'veneno', 'psíquico', 'radiante', 'trovejante'] as DamageType[]).map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>}
          {equippable && (
            <ItemBtn active={equipped} onClick={onEquip}>
              {isWearable(it) ? (equipped ? 'Tirar' : 'Vestir') : equipped ? 'Desequipar' : 'Equipar'}
            </ItemBtn>
          )}
          {onOffHand && <ItemBtn onClick={onOffHand}>Equipar na segunda mão</ItemBtn>}
          {offHand && <span className="fv-inv-offhand">na segunda mão</span>}
          {onDrink && <ItemBtn active onClick={onDrink}>Beber · {healOf(it)}</ItemBtn>}
          {onOpenPack && <ItemBtn active onClick={onOpenPack}>Abrir pacote</ItemBtn>}
          {!equipped && it.wear !== 'body' && <ItemBtn onClick={onStash}>{stashLabel}</ItemBtn>}
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
      type="button"
      className={'fv-inv-btn' + (active ? ' is-active' : '') + (danger ? ' is-danger' : '')}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {children}
    </button>
  );
}

/** "x3", ou a contagem de munição ("33 flechas") quando o pacote já foi aberto por disparos. */
function qtyLabel(it: InventoryItem): string | null {
  const kind = ammoKindOfItem(it);
  if (kind && (perBundle(it) > 1 || it.ammoLeft !== undefined)) {
    const n = ammoCount(it);
    return `${n} ${n === 1 ? kind.one : kind.many}`;
  }
  return it.quantity > 1 ? `x${it.quantity}` : null;
}
