import { describe, expect, it } from 'vitest';
import type { Character } from '@/types/character';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { autoTrail, runTrail } from '../levelTrail';
import type { LevelUpPlan } from '../levelUp';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { syncSlotPools } from '../spellcasting';
import { pendingChoices } from '../classChoices';
import { useCharacterStore } from '@/store/characterStore';

const base = (classId: string, tweak?: (c: Character) => void) => {
  const d = createDraftCharacter({ ownerId: 'u', name: 'Teste', classId });
  tweak?.(d);
  const c = finalizeCharacter(d);
  c.hpCurrent = deriveCharacter(c).maxHp;
  return c;
};

/** O que precisa sair igual pelos dois caminhos (o horário do registro é o único que muda). */
const snapshot = (c: Character) => {
  const d = deriveCharacter(c);
  return {
    level: c.level,
    classLevels: c.classLevels,
    subclassId: c.subclassId,
    asiBonuses: c.asiBonuses,
    feats: c.feats,
    choices: c.choices ?? {},
    toolProfs: c.toolProfs,
    history: c.levelHistory.map(({ at: _at, ...r }) => r),
    maxHp: d.maxHp,
    hpCurrent: c.hpCurrent,
    abilities: Object.fromEntries(Object.entries(d.abilities).map(([k, a]) => [k, a.total])),
    slots: syncSlotPools(c),
    resources: characterResources(c).map((r) => [r.id, r.max]),
    hitDice: c.combat.hitDiceRemaining,
  };
};

/** Caminho "de verdade": a mesma ficha de 1º nível sobe nível por nível pela ação da aba Evoluir. */
function viaEvoluir(start: Character, plans: LevelUpPlan[]): Character {
  useCharacterStore.setState({ characters: [structuredClone(start)] });
  for (const plan of plans) {
    const r = useCharacterStore.getState().levelUp(start.id, plan);
    expect(r.errors).toEqual([]);
  }
  return useCharacterStore.getState().characters[0];
}

describe('Trilha de níveis (criar já em nível alto)', () => {
  it.each([
    ['wizard', 5],
    ['fighter', 8],
    ['rogue', 5],
    ['cleric', 11],
  ])('%s %i: a trilha dá a mesma ficha que evoluir pela aba Evoluir', (classId, level) => {
    const start = base(classId);
    const plans = autoTrail(start, level);
    expect(plans).toHaveLength(level - 1);
    const trail = runTrail(start, plans, level);
    expect(trail.steps.every((s) => s.errors.length === 0)).toBe(true);
    expect(trail.reached).toBe(level);
    expect(snapshot(trail.char)).toEqual(snapshot(viaEvoluir(start, plans)));
    // "Escolher por mim" não deixa escolha de classe pendente (as do 1º nível são da criação)
    expect(pendingChoices(trail.char).filter((p) => p.spec.classLevel > 1)).toEqual([]);
  });

  it('Guerreiro 8 pela trilha: Mestre de Batalha com manobras e aumentos de atributo', () => {
    const start = base('fighter');
    const plans = autoTrail(start, 8).map((p) => (p.subclassId ? { ...p, subclassId: 'battlemaster' } : p));
    const { char } = runTrail(start, autoTrail(start, 8, plans), 8);
    expect(char.subclassId).toBe('battlemaster');
    expect(Object.values(char.choices ?? {}).flat().length).toBeGreaterThan(0);
    expect(Object.values(char.asiBonuses).reduce((n, v) => n + (v ?? 0), 0)).toBe(6); // níveis 4, 6 e 8
    expect(pendingChoices(char).filter((p) => p.spec.classLevel > 1)).toEqual([]);
  });

  it('Clérigo 3 / Guerreiro 2: multiclasse por nível respeita o pré-requisito e bate com a aba Evoluir', () => {
    const start = base('cleric', (d) => {
      d.campaign = { ...d.campaign!, allowMulticlass: true };
      d.baseAbilities = { str: 14, dex: 10, con: 13, int: 8, wis: 15, cha: 12 };
    });
    const keep = [undefined, undefined, { classId: 'fighter' } as LevelUpPlan, { classId: 'fighter' } as LevelUpPlan];
    const plans = autoTrail(start, 5, keep);
    expect(plans.map((p) => p.classId)).toEqual(['cleric', 'cleric', 'fighter', 'fighter']);
    const trail = runTrail(start, plans, 5);
    expect(trail.char.classLevels.map((c) => [c.classId, c.level])).toEqual([['cleric', 3], ['fighter', 2]]);
    expect(snapshot(trail.char)).toEqual(snapshot(viaEvoluir(start, plans)));
  });

  it('para no nível que falta ou não vale e diz o motivo', () => {
    const start = base('wizard', (d) => { d.baseAbilities = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }; });
    const plans = autoTrail(start, 4);
    const bad = [plans[0], { ...plans[1], classId: 'barbarian' }, plans[2]];
    const r = runTrail(start, bad, 4);
    expect(r.reached).toBe(2);
    expect(r.steps[1].errors.join(' ')).toMatch(/Multiclasse/);
    const missing = runTrail(start, [plans[0]], 4);
    expect(missing.steps[1].errors).toEqual(['Escolha este nível.']);
  });
});
