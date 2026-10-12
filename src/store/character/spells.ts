import { syncSlotPools, saveSlotPools, casterOf, changeSpellSelection, spellSelectionOf } from '@/engine/spellcasting';
import { canConcentrate, clearConcentration } from '@/engine/concentration';
import { chargesOf } from '@/engine/itemCharges';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';
import { characterResources } from '@/engine/classResources';
import { SLOT_COST } from '@/engine/sorcerer';

/** Magias: conjurar gastando espaço, espaços, magias de itens, esquecer e copiar (grimório). */
export function spellsActions({ mutate, get }: StoreCtx): Pick<CharacterState, 'noteCast' | 'useItemSpell' | 'spendItemCharges' | 'castWithSlot' | 'forgetSpell' | 'copySpell' | 'toggleSpellSlot' | 'restorePactSlots' | 'fontOfMagic' | 'recoverSlots' | 'chargeWard'> {
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
    fontOfMagic(id, dir, level, pool) {
      // Fonte de Magia (Feiticeiro 2º): espaço vira pontos (= círculo) ou pontos viram espaço (tabela, até o 5º)
      const char = get().getCharacter(id);
      const max = char ? characterResources(char).find((r) => r.id === 'sorcery')?.max ?? 0 : 0;
      if (!char || !max) return false;
      const points = Math.min(max, char.combat.resources.sorcery ?? max);
      const pools = syncSlotPools(char);
      if (dir === 'toSlot' && pool === 'pact') return false;
      const kind = pool ?? (dir === 'toPoints' && !(pools.spellcasting[level] && pools.spellcasting[level].used < pools.spellcasting[level].max) ? 'pact' : 'spellcasting');
      const slot = pools[kind][level];
      if (!slot) return false;
      if (dir === 'toPoints') {
        if (slot.used >= slot.max || points >= max) return false;
      } else {
        const cost = SLOT_COST[level];
        if (!cost || points < cost || slot.used <= 0) return false;
      }
      mutate(id, (c) => {
        const live = syncSlotPools(c);
        const s = live[kind][level];
        if (dir === 'toPoints') {
          s.used += 1;
          c.combat.resources.sorcery = Math.min(max, points + level);
        } else {
          s.used -= 1;
          c.combat.resources.sorcery = points - SLOT_COST[level];
        }
        saveSlotPools(c, live);
      });
      return true;
    },
    recoverSlots(id, picks) {
      // Recuperação Arcana / Recuperação Natural: devolve espaços gastos escolhidos
      mutate(id, (c) => {
        const pools = syncSlotPools(c);
        for (const [lv, n] of Object.entries(picks)) {
          const slot = pools.spellcasting[Number(lv)];
          if (slot && n > 0) slot.used = Math.max(0, slot.used - n);
        }
        saveSlotPools(c, pools);
      });
    },
    chargeWard(id, slotLevel) {
      // Barreira Arcana: a 1ª abjuração do dia ergue a barreira cheia; as seguintes recuperam 2 × círculo
      const char = get().getCharacter(id);
      const ward = char ? characterResources(char).find((r) => r.id === 'arcaneWard') : undefined;
      if (!char || !ward) return;
      mutate(id, (c) => {
        const up = (c.combat.marks ?? []).includes('arcaneWard');
        const hp = Math.min(ward.max, c.combat.resources.arcaneWard ?? ward.max);
        c.combat.resources.arcaneWard = up ? Math.min(ward.max, hp + 2 * slotLevel) : ward.max;
        if (!up) c.combat.marks = [...(c.combat.marks ?? []), 'arcaneWard'];
      });
    },
    restorePactSlots(id) {
      // Mestre Místico (Bruxo 20º): todos os espaços de Magia de Pacto voltam
      mutate(id, (c) => {
        const pools = syncSlotPools(c);
        for (const slot of Object.values(pools.pact)) slot.used = 0;
        saveSlotPools(c, pools);
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
