import { warlockSlots } from '@/engine/progression';
import { deriveCharacter } from '@/engine/dndRules';
import { syncSpellSlots } from '@/engine/spellcasting';
import { characterResources, syncResources } from '@/engine/classResources';
import { getFeat } from '@/data/feats';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';
import { rechargeAll } from '@/engine/itemCharges';
import { toast } from '@/store/feedbackStore';

/** Combate e descanso: PV, PV temporários, turno, condições, concentração, efeitos de magia, recursos, dados de vida, testes contra a morte e descansos. */
export function combatActions({ get, mutate }: StoreCtx): Pick<CharacterState, 'applyDamage' | 'heal' | 'setTempHp' | 'toggleTurn' | 'resetTurn' | 'adjustMove' | 'toggleCondition' | 'setExhaustion' | 'toggleConcentration' | 'setMark' | 'applySpellEffect' | 'removeSpellEffect' | 'endConcentrationEffects' | 'gainTempHp' | 'useTurn' | 'markEventApplied' | 'useSneakAttack' | 'setResource' | 'spendHitDie' | 'setDeathSave' | 'shortRest' | 'longRest'> {
  return {
    applyDamage(id, amount, opts) {
      const char = get().getCharacter(id);
      if (!char || amount <= 0) return;
      const maxHp = deriveCharacter(char).maxHp;
      mutate(id, (c) => {
        let rem = amount;
        if (c.combat.hpTemp > 0) {
          const absorbed = Math.min(c.combat.hpTemp, rem);
          c.combat.hpTemp -= absorbed;
          rem -= absorbed;
        }
        if (rem <= 0) return;
        const ds = c.combat.deathSaves ?? { success: 0, fail: 0 };
        if (c.hpCurrent === 0) {
          // dano já a 0 PV: 1 falha (2 se crítico); dano ≥ PV máx. mata na hora
          ds.fail = rem >= maxHp ? 3 : Math.min(3, ds.fail + (opts?.crit ? 2 : 1));
        } else {
          const overflow = rem - c.hpCurrent;
          c.hpCurrent = Math.max(0, c.hpCurrent - rem);
          if (c.hpCurrent === 0) {
            // dano maciço: o que sobra depois de zerar ≥ PV máximo = morte instantânea
            if (overflow >= maxHp) ds.fail = 3;
            const conds = c.combat.conditions ?? [];
            if (!conds.includes('Inconsciente')) c.combat.conditions = [...conds, 'Inconsciente'];
          }
        }
        c.combat.deathSaves = ds;
        // cair a 0 PV rompe a concentração automaticamente (PHB)
        if (c.hpCurrent === 0) c.combat.concentration = false;
      });
    },
    heal(id, amount) {
      const char = get().getCharacter(id);
      if (!char) return;
      const max = deriveCharacter(char).maxHp;
      mutate(id, (c) => {
        // morto (3 falhas) não volta com cura comum
        if ((c.combat.deathSaves?.fail ?? 0) >= 3) return;
        const wasDown = c.hpCurrent === 0;
        c.hpCurrent = Math.min(max, c.hpCurrent + amount);
        if (c.hpCurrent > 0) {
          c.combat.deathSaves = { success: 0, fail: 0 };
          // recuperar PV acorda quem estava inconsciente por estar a 0 PV
          if (wasDown) c.combat.conditions = (c.combat.conditions ?? []).filter((x) => x !== 'Inconsciente');
        }
      });
    },
    setTempHp(id, amount) {
      mutate(id, (c) => {
        c.combat.hpTemp = Math.max(0, amount);
      });
    },
    toggleTurn(id, key) {
      mutate(id, (c) => {
        c.combat.turn[key] = !c.combat.turn[key];
      });
    },
    resetTurn(id) {
      mutate(id, (c) => {
        c.combat.turn = { action: false, bonus: false, reaction: false };
        c.combat.moveUsed = 0;
        c.combat.castThisTurn = [];
        // Escudo Arcano acaba no início do seu turno; Heroísmo renova os PV temporários
        const effects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'turn');
        c.combat.spellEffects = effects;
        const perTurn = Math.max(0, ...effects.map((e) => e.tempPerTurn ?? 0));
        if (perTurn > c.combat.hpTemp) c.combat.hpTemp = perTurn;
      });
    },
    adjustMove(id, delta) {
      const char = get().getCharacter(id);
      if (!char) return;
      const speed = deriveCharacter(char).speed;
      mutate(id, (c) => {
        c.combat.moveUsed = Math.max(0, Math.min(speed, c.combat.moveUsed + delta));
      });
    },
    toggleCondition(id, cond) {
      mutate(id, (c) => {
        c.combat.conditions = c.combat.conditions.includes(cond)
          ? c.combat.conditions.filter((x) => x !== cond)
          : [...c.combat.conditions, cond];
      });
    },
    setExhaustion(id, level) {
      mutate(id, (c) => {
        // clicar no nível atual recua um; senão define (0–6, PHB)
        const cur = c.combat.exhaustion ?? 0;
        c.combat.exhaustion = cur === level ? level - 1 : Math.max(0, Math.min(6, level));
      });
    },
    toggleConcentration(id) {
      mutate(id, (c) => {
        c.combat.concentration = !c.combat.concentration;
        // romper a concentração encerra Bruxaria, Marca do Caçador e os efeitos de concentração
        if (!c.combat.concentration) {
          c.combat.marks = (c.combat.marks ?? []).filter((m) => m === 'rage');
          c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'concentration');
        }
      });
    },
    setMark(id, mark, on) {
      mutate(id, (c) => {
        const cur = (c.combat.marks ?? []).filter((m) => m !== mark);
        c.combat.marks = on ? [...cur, mark] : cur;
      });
    },
    applySpellEffect(id, effect) {
      mutate(id, (c) => {
        const list = c.combat.spellEffects ?? [];
        const had = list.find((e) => e.spellId === effect.spellId);
        // Auxílio: o PV atual sobe junto com o máximo (só na primeira vez)
        if (effect.maxHp && !had) c.hpCurrent += effect.maxHp;
        c.combat.spellEffects = [...list.filter((e) => e.spellId !== effect.spellId), effect];
      });
    },
    removeSpellEffect(id, spellId) {
      mutate(id, (c) => {
        const gone = (c.combat.spellEffects ?? []).find((e) => e.spellId === spellId);
        c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.spellId !== spellId);
        if (gone?.maxHp) c.hpCurrent = Math.min(c.hpCurrent, deriveCharacter(c).maxHp);
      });
    },
    endConcentrationEffects(id) {
      mutate(id, (c) => {
        c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'concentration');
      });
    },
    gainTempHp(id, amount) {
      mutate(id, (c) => {
        c.combat.hpTemp = Math.max(c.combat.hpTemp, Math.max(0, amount));
      });
    },
    useTurn(id, key) {
      mutate(id, (c) => {
        c.combat.turn = { ...c.combat.turn, [key]: true };
      });
    },
    markEventApplied(id, eventId) {
      mutate(id, (c) => {
        c.appliedEvents = [...(c.appliedEvents ?? []).filter((x) => x !== eventId).slice(-150), eventId];
      });
    },
    useSneakAttack(id) {
      mutate(id, (c) => {
        c.combat.turn = { ...c.combat.turn, sneak: true };
      });
    },
    setResource(id, resId, value) {
      mutate(id, (c) => {
        c.combat.resources[resId] = Math.max(0, value);
      });
    },
    spendHitDie(id) {
      mutate(id, (c) => {
        c.combat.hitDiceRemaining = Math.max(0, c.combat.hitDiceRemaining - 1);
      });
    },
    setDeathSave(id, type, n) {
      mutate(id, (c) => {
        const ds = c.combat.deathSaves;
        const cur = ds[type];
        ds[type] = cur === n ? n - 1 : n;
      });
    },
    shortRest(id) {
      playSample('descanso');
      const char = get().getCharacter(id);
      if (!char) return;
      mutate(id, (c) => {
        for (const r of characterResources(c)) {
          if (r.recharge === 'short' && !r.unlimited) c.combat.resources[r.id] = r.max;
        }
        // magias de item com recarga em descanso curto voltam
        const uses = { ...(c.combat.itemSpellUses ?? {}) };
        for (const it of c.inventory) {
          for (const g of it.grantsSpells ?? []) {
            if (g.recharge === 'short') delete uses[`${it.uid}:${g.spellId}`];
          }
        }
        // magias de talento com recarga curta (Teleporte Feérico)
        for (const featId of c.feats ?? []) {
          for (const g of getFeat(featId)?.grantsSpells ?? []) {
            if (g.recharge === 'short') delete uses[`feat:${featId}:${g.spellId}`];
          }
        }
        c.combat.itemSpellUses = uses;
        // Magia de Pacto (Bruxo): os espaços do pacto voltam no descanso curto
        const wl = (c.classLevels ?? []).find((l) => l.classId === 'warlock')?.level ?? (c.classId === 'warlock' ? c.level : 0);
        if (wl) {
          for (const [circle, n] of Object.entries(warlockSlots(wl))) {
            const slot = c.combat.spellSlots?.[Number(circle)];
            if (slot) slot.used = Math.max(0, slot.used - n);
          }
        }
        // a Fúria dura 1 minuto: não sobrevive a um descanso
        c.combat.marks = (c.combat.marks ?? []).filter((m) => m !== 'rage');
      });
    },
    longRest(id) {
      playSample('descanso');
      const char = get().getCharacter(id);
      if (!char) return;
      const derived = deriveCharacter(char);
      // amanhecer: cajados e varinhas recuperam parte das cargas
      const recharge = rechargeAll(char);
      mutate(id, (c) => {
        c.combat.itemCharges = recharge.used;
        c.hpCurrent = derived.maxHp;
        c.combat.hpTemp = 0;
        c.combat.deathSaves = { success: 0, fail: 0 };
        c.combat.conditions = [];
        c.combat.turn = { action: false, bonus: false, reaction: false };
        c.combat.moveUsed = 0;
        c.combat.concentration = false;
        c.combat.marks = [];
        c.combat.spellEffects = [];
        c.combat.castThisTurn = [];
        // descanso longo remove 1 nível de exaustão (PHB 2014)
        c.combat.exhaustion = Math.max(0, (c.combat.exhaustion ?? 0) - 1);
        // todas as magias de item recarregam no descanso longo
        c.combat.itemSpellUses = {};
        // munição que não foi recolhida depois da luta ficou para trás
        c.combat.ammoSpent = {};
        // recupera metade dos dados de vida
        c.combat.hitDiceRemaining = Math.min(
          derived.hitDiceMax,
          c.combat.hitDiceRemaining + Math.max(1, Math.floor(derived.hitDiceMax / 2)),
        );
        c.combat.resources = syncResources(c, c.combat.resources, true);
        c.combat.spellSlots = syncSpellSlots(c, true);
        // companheiro de patrulheiro volta com PV cheio
        if (c.companion) c.companion = { ...c.companion, hpCurrent: undefined };
      });
      if (recharge.report.length) {
        toast(recharge.report.map((r) => `${r.name}: +${r.regained} carga${r.regained === 1 ? '' : 's'} (${r.left}/${r.max})`).join(' · '), { tone: 'info' });
      }
    },
  };
}
