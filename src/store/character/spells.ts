import { syncSpellSlots } from '@/engine/spellcasting';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';

/** Magias: conjurar gastando espaço, espaços, magias de itens, esquecer e copiar (grimório). */
export function spellsActions({ mutate }: StoreCtx): Pick<CharacterState, 'noteCast' | 'useItemSpell' | 'castWithSlot' | 'forgetSpell' | 'copySpell' | 'toggleSpellSlot'> {
  return {
    noteCast(id, spellId) {
      mutate(id, (c) => {
        c.combat.castThisTurn = [...(c.combat.castThisTurn ?? []).filter((x) => x !== spellId), spellId];
      });
    },
    useItemSpell(id, key) {
      mutate(id, (c) => {
        const uses = { ...(c.combat.itemSpellUses ?? {}) };
        uses[key] = (uses[key] ?? 0) + 1;
        c.combat.itemSpellUses = uses;
      });
    },
    castWithSlot(id, level, concentration) {
      playSample('pagina');
      mutate(id, (c) => {
        if (!c.combat.spellSlots[level]) c.combat.spellSlots = syncSpellSlots(c);
        const slot = c.combat.spellSlots[level];
        if (!slot || slot.used >= slot.max) return;
        slot.used += 1;
        if (concentration) c.combat.concentration = true;
      });
    },
    forgetSpell(id, spellId, useSwap) {
      mutate(id, (c) => {
        c.preparedSpells = c.preparedSpells.filter((x) => x !== spellId);
        c.knownSpells = (c.knownSpells ?? []).filter((x) => x !== spellId);
        c.spellbookCopied = (c.spellbookCopied ?? []).filter((x) => x !== spellId);
        if (useSwap) c.spellSwaps = Math.max(0, (c.spellSwaps ?? 0) - 1);
      });
    },
    copySpell(id, spellId, cost) {
      mutate(id, (c) => {
        if (c.coins.gp < cost || (c.knownSpells ?? []).includes(spellId)) return;
        c.coins.gp -= cost;
        c.knownSpells = [...(c.knownSpells ?? []), spellId];
        c.spellbookCopied = [...(c.spellbookCopied ?? []), spellId];
      });
    },
    toggleSpellSlot(id, level, index) {
      mutate(id, (c) => {
        if (!c.combat.spellSlots[level]) c.combat.spellSlots = syncSpellSlots(c);
        const slot = c.combat.spellSlots[level];
        if (!slot) return;
        // clicar no pip n alterna: se já gasto até n, devolve; senão gasta até n
        slot.used = slot.used >= index ? index - 1 : index;
      });
    },
  };
}
