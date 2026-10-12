import { syncSlotPools, saveSlotPools, casterOf, changeSpellSelection, spellSelectionOf } from '@/engine/spellcasting';
import { canConcentrate, clearConcentration } from '@/engine/concentration';
import { chargesOf } from '@/engine/itemCharges';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';

/** Magias: conjurar gastando espaço, espaços, magias de itens, esquecer e copiar (grimório). */
export function spellsActions({ mutate, get }: StoreCtx): Pick<CharacterState, 'noteCast' | 'useItemSpell' | 'spendItemCharges' | 'castWithSlot' | 'forgetSpell' | 'copySpell' | 'toggleSpellSlot'> {
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
    castWithSlot(id, level, concentration, pool) {
      playSample('pagina');
      mutate(id, (c) => {
        if (concentration && !canConcentrate(c)) return;
        const pools = syncSlotPools(c);
        const kind = pool ?? (pools.spellcasting[level] && pools.spellcasting[level].used < pools.spellcasting[level].max ? 'spellcasting' : 'pact');
        const slot = pools[kind][level];
        if (!slot || slot.used >= slot.max) return;
        slot.used += 1;
        saveSlotPools(c, pools);
        if (concentration && canConcentrate(c)) { clearConcentration(c); c.combat.concentration = true; }
      });
    },
    forgetSpell(id, spellId, useSwap, classId) {
      mutate(id, (c) => {
        changeSpellSelection(c, classId ?? casterOf(c)?.classId ?? c.classId, (s) => {
          s.preparedSpells = s.preparedSpells.filter((x) => x !== spellId);
          s.knownSpells = s.knownSpells.filter((x) => x !== spellId);
          s.spellbookCopied = (s.spellbookCopied ?? []).filter((x) => x !== spellId);
          if (useSwap) s.spellSwaps = Math.max(0, (s.spellSwaps ?? 0) - 1);
        });
      });
    },
    copySpell(id, spellId, cost, classId) {
      mutate(id, (c) => {
        const origin = classId ?? casterOf(c)?.classId ?? c.classId;
        if (c.coins.gp < cost || spellSelectionOf(c, origin).knownSpells.includes(spellId)) return;
        c.coins.gp -= cost;
        changeSpellSelection(c, origin, (s) => {
          s.knownSpells = [...s.knownSpells, spellId];
          s.spellbookCopied = [...(s.spellbookCopied ?? []), spellId];
        });
      });
    },
    toggleSpellSlot(id, level, index, pool) {
      mutate(id, (c) => {
        const pools = syncSlotPools(c);
        if (!pool) {
          let used = c.combat.spellSlots[level]?.used ?? 0;
          used = used >= index ? index - 1 : index;
          for (const kind of ['spellcasting', 'pact'] as const) {
            const slot = pools[kind][level];
            if (slot) { slot.used = Math.min(slot.max, Math.max(0, used)); used -= slot.used; }
          }
          saveSlotPools(c, pools);
          return;
        }
        const slot = pools[pool][level];
        if (!slot) return;
        // clicar no pip n alterna: se já gasto até n, devolve; senão gasta até n
        slot.used = Math.max(0, Math.min(slot.max, slot.used >= index ? index - 1 : index));
        saveSlotPools(c, pools);
      });
    },
  };
}
