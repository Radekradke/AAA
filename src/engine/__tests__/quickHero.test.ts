import { describe, expect, it } from 'vitest';
import { CLASSES, getClass } from '@/data/classes';
import { quickHero } from '../quickHero';
import { deriveCharacter } from '../dndRules';
import { languagePicks, skillBudget } from '../originChoices';
import { pendingChoices } from '../classChoices';
import { casterForClass, casterProfiles } from '../spellcasting';
import { spellLearnState } from '../spellRules';
import { characterImportError } from '../characterImport';

describe('Herói rápido', () => {
  for (const cls of CLASSES) {
    for (const level of [1, 3, 5, 11, 20]) {
      it(`${cls.label} nível ${level}: ficha válida, sem nada pendente`, () => {
        const { char, summary } = quickHero('u', { level, classId: cls.id, seed: 1000 + level });
        expect(char.classId).toBe(cls.id);
        expect(char.level).toBe(level);
        expect(char.classLevels.reduce((n, c) => n + c.level, 0)).toBe(level);
        expect(char.name.length).toBeGreaterThan(1);
        const d = deriveCharacter(char);
        expect(char.hpCurrent).toBe(d.maxHp);
        expect(summary.hp).toBe(d.maxHp);
        expect(skillBudget(char).classLeft).toBe(0);
        expect(languagePicks(char).left).toBe(0);
        expect(pendingChoices(char)).toEqual([]);
        if (level >= 3) expect(char.subclassId).toBeTruthy();
        for (const p of casterProfiles(char)) {
          const mod = d.abilities[casterForClass(char, p.classId)?.ability ?? getClass(p.classId).prim].mod;
          const st = spellLearnState(char, mod, p.classId);
          if (!st || st.maxCircle === 0) continue;
          expect(st.cantrips.have).toBe(st.cantrips.max);
          if (st.known) expect(st.known.have).toBe(st.known.max);
          if (st.prepared) expect(st.prepared.have).toBe(st.prepared.max);
        }
        expect(characterImportError(char, char)).toBeNull();
      });
    }
  }

  it('a mesma semente dá o mesmo herói; outra semente, outro', () => {
    const a = quickHero('u', { level: 3, seed: 42 }).summary;
    const b = quickHero('u', { level: 3, seed: 42 }).summary;
    expect(b).toEqual(a);
    const others = [43, 44, 45, 46].map((s) => quickHero('u', { level: 3, seed: s }).summary.name);
    expect(new Set([a.name, ...others]).size).toBeGreaterThan(1);
  });

  it('o estilo escolhe entre as classes dele', () => {
    for (let s = 0; s < 8; s++) {
      expect(['rogue', 'ranger', 'monk']).toContain(quickHero('u', { level: 2, style: 'explorer', seed: s }).char.classId);
      expect(['fighter', 'paladin', 'barbarian']).toContain(quickHero('u', { level: 2, style: 'guardian', seed: s }).char.classId);
    }
  });
});
