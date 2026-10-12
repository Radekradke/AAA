import type { Character } from '@/types/character';
import { deriveCharacter } from './dndRules';
import { characterResources, syncResources } from './classResources';
import { syncSlotPools, saveSlotPools } from './spellcasting';
import { recoverHitDice, syncHitDicePools } from './hitDice';
import { getFeat } from '@/data/feats';
import { chargesOf } from './itemCharges';
export type RestKind = 'short' | 'long';
export function canLongRest(c: Character) { return c.hpCurrent > 0 && c.combat.deathSaves.fail < 3 && (c.combat.exhaustion ?? 0) < 6; }
export function previewRest(char: Character, kind: RestKind) {
  const after = structuredClone(char);
  applyRest(after, kind);
  const changes: Array<{ label: string; before: string; after: string }> = [];
  const add = (label: string, a: number | string, b: number | string) => { if (a !== b) changes.push({ label, before: String(a), after: String(b) }); };
  add('PV', char.hpCurrent, after.hpCurrent);
  add('PV temporários', char.combat.hpTemp, after.combat.hpTemp);
  add('Exaustão', char.combat.exhaustion ?? 0, after.combat.exhaustion ?? 0);
  for (const r of characterResources(char)) add(r.label, char.combat.resources[r.id] ?? r.max, after.combat.resources[r.id] ?? r.max);
  const a = syncSlotPools(char), b = syncSlotPools(after);
  for (const pool of ['spellcasting', 'pact'] as const) for (const [level, slot] of Object.entries(a[pool])) add(`Espaços ${pool === 'pact' ? 'do pacto' : 'comuns'} · círculo ${level}`, slot.max - slot.used, (b[pool][Number(level)]?.max ?? 0) - (b[pool][Number(level)]?.used ?? 0));
  const diceA = syncHitDicePools(char), diceB = syncHitDicePools(after);
  for (const [sides, pool] of Object.entries(diceA)) add(`Dados de Vida d${sides}`, pool.remaining, diceB[Number(sides)]?.remaining ?? 0);
  const removed = [
    ...(char.combat.spellEffects ?? []).filter((e) => !(after.combat.spellEffects ?? []).some((x) => x.spellId === e.spellId)).map((e) => e.name),
    ...(char.combat.marks ?? []).filter((m) => !(after.combat.marks ?? []).includes(m)),
    ...char.combat.conditions.filter((c) => !after.combat.conditions.includes(c)),
    ...(char.combat.concentration && !after.combat.concentration ? ['Concentração'] : []),
  ];
  const charges = kind === 'long' ? char.inventory.filter((i) => chargesOf(i) && (char.combat.itemCharges?.[i.uid] ?? 0) > 0).map((i) => `${i.name}: ${chargesOf(i)!.regain} cargas, limitado ao máximo ${chargesOf(i)!.max}`) : [];
  const spellUses = Object.keys(char.combat.itemSpellUses ?? {}).filter((k) => after.combat.itemSpellUses?.[k] === undefined).length;
  return { changes, removed, charges, spellUses, blocked: kind === 'long' && !canLongRest(char) };
}
/** Determinístico: cargas só são roladas ao confirmar. */
export function applyRest(c: Character, kind: RestKind): void {
  if (kind === 'short') {
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
        const pools = syncSlotPools(c);
        for (const slot of Object.values(pools.pact)) slot.used = 0;
        saveSlotPools(c, pools);
        // Restauração Feiticeira (Feiticeiro 20º): +4 pontos de feitiçaria no descanso curto
        const sorc = characterResources(c).find((r) => r.id === 'sorcery');
        const sorcLv = (c.classLevels ?? []).find((l) => l.classId === 'sorcerer')?.level ?? (c.classId === 'sorcerer' ? c.level : 0);
        if (sorc && sorcLv >= 20) c.combat.resources.sorcery = Math.min(sorc.max, (c.combat.resources.sorcery ?? sorc.max) + 4);
        // a Fúria dura 1 minuto: não sobrevive a um descanso (Frenesi cobra 1 de exaustão)
        if ((c.combat.marks ?? []).includes('frenzy')) c.combat.exhaustion = Math.min(6, (c.combat.exhaustion ?? 0) + 1);
        c.combat.marks = (c.combat.marks ?? []).filter((m) => !['rage', 'frenzy', 'reckless', 'assassinate', 'dodge', 'sacredWeapon', 'vow', 'camouflage', 'draconicWard'].includes(m));
        // Fúria Implacável: a CD volta a 10 depois de um descanso
        delete c.combat.resources.relentless;
  } else {
        c.combat.hpTemp = 0;
        c.combat.deathSaves = { success: 0, fail: 0 };
        c.combat.conditions = [];
        c.combat.turn = { action: false, bonus: false, reaction: false };
        c.combat.moveUsed = 0;
        c.combat.concentration = false;
        c.combat.marks = [];
        delete c.combat.sacredWeaponUid;
        delete c.combat.resources.relentless;
        // Portento rola de novo e a Sobrecarga volta a ser grátis a cada descanso longo
        delete c.combat.portent;
        delete c.combat.overchannel;
        delete c.combat.wildShape;
        c.combat.spellEffects = [];
        c.combat.castThisTurn = [];
        // descanso longo remove 1 nível de exaustão (PHB 2014)
        c.combat.exhaustion = Math.max(0, (c.combat.exhaustion ?? 0) - 1);
        const derived = deriveCharacter(c);
        c.hpCurrent = derived.maxHp;
        // todas as magias de item recarregam no descanso longo
        c.combat.itemSpellUses = {};
        // munição que não foi recolhida depois da luta ficou para trás
        c.combat.ammoSpent = {};
        // recupera metade dos dados de vida
        recoverHitDice(c);
        c.combat.resources = syncResources(c, c.combat.resources, true);
        saveSlotPools(c, syncSlotPools(c, true));
        // companheiro de patrulheiro volta com PV cheio
        if (c.companion) c.companion = { ...c.companion, hpCurrent: undefined };
  }
}
