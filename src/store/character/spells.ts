import { warlockSlots } from '@/engine/progression';
import { syncSpellSlots } from '@/engine/spellcasting';
import { chargesOf } from '@/engine/itemCharges';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';
import { characterResources } from '@/engine/classResources';
import { SLOT_COST } from '@/engine/sorcerer';

/** Magias: conjurar gastando espaço, espaços, magias de itens, esquecer e copiar (grimório). */
export function spellsActions({ mutate, get }: StoreCtx): Pick<CharacterState, 'noteCast' | 'useItemSpell' | 'spendItemCharges' | 'castWithSlot' | 'forgetSpell' | 'copySpell' | 'toggleSpellSlot' | 'restorePactSlots' | 'fontOfMagic'> {
  return {
    noteCast(id, spellId) {
      mutate(id, (c) => {
        c.combat.castThisTurn = [...(c.combat.castThisTurn ?? []).filter((x) => x !== spellId), spellId];
      });
    },
    spendItemCharges(id, uid, n) {
      const it = get().getCharacter(id)?.inventory.find((i) => i.uid === uid);
      const ch = it && chargesOf(it);
      if (!ch) return 0;
      let left = 0;
      mutate(id, (c) => {
        const used = { ...(c.combat.itemCharges ?? {}) };
        used[uid] = Math.max(0, Math.min(ch.max, (used[uid] ?? 0) + n));
        c.combat.itemCharges = used;
        left = ch.max - used[uid];
      });
      return left;
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
    fontOfMagic(id, dir, level) {
      // Fonte de Magia (Feiticeiro 2º): espaço vira pontos (= círculo) ou pontos viram espaço (tabela, até o 5º)
      const char = get().getCharacter(id);
      const max = char ? characterResources(char).find((r) => r.id === 'sorcery')?.max ?? 0 : 0;
      if (!char || !max) return false;
      const points = Math.min(max, char.combat.resources.sorcery ?? max);
      const slots = char.combat.spellSlots?.[level] ? char.combat.spellSlots : syncSpellSlots(char);
      const slot = slots[level];
      if (!slot) return false;
      if (dir === 'toPoints') {
        if (slot.used >= slot.max || points >= max) return false;
      } else {
        const cost = SLOT_COST[level];
        if (!cost || points < cost || slot.used <= 0) return false;
      }
      mutate(id, (c) => {
        if (!c.combat.spellSlots?.[level]) c.combat.spellSlots = syncSpellSlots(c);
        const s = c.combat.spellSlots[level];
        if (dir === 'toPoints') {
          s.used += 1;
          c.combat.resources.sorcery = Math.min(max, points + level);
        } else {
          s.used -= 1;
          c.combat.resources.sorcery = points - SLOT_COST[level];
        }
      });
      return true;
    },
    restorePactSlots(id) {
      // Mestre Místico (Bruxo 20º): todos os espaços de Magia de Pacto voltam
      mutate(id, (c) => {
        const wl = (c.classLevels ?? []).find((l) => l.classId === 'warlock')?.level ?? (c.classId === 'warlock' ? c.level : 0);
        if (!wl) return;
        if (!c.combat.spellSlots) c.combat.spellSlots = syncSpellSlots(c);
        for (const [circle, n] of Object.entries(warlockSlots(wl))) {
          const slot = c.combat.spellSlots[Number(circle)];
          if (slot) slot.used = Math.max(0, slot.used - n);
        }
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
