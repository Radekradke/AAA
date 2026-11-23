import { describe, it, expect } from 'vitest';
import { quickHero } from '../quickHero';
import { deriveCharacter } from '../dndRules';
import { pendingChoices } from '../classChoices';
import { spellLearnState } from '../spellRules';
import { CLASSES } from '@/data/classes';
import { SPELL_BY_ID } from '@/data/spells';
import { getFeat } from '@/data/feats';

/** Caminhos com número que não é número (NaN/Infinity) num objeto derivado. */
function badNumbers(o: unknown, path = '', out: string[] = [], seen = new Set<unknown>()): string[] {
  if (typeof o === 'number' && !Number.isFinite(o)) out.push(path);
  else if (o && typeof o === 'object' && !seen.has(o)) {
    seen.add(o);
    for (const [k, v] of Object.entries(o)) badNumbers(v, `${path}.${k}`, out, seen);
  }
  return out;
}

/**
 * Varredura da criação (etapa 1.1): todo herói rápido, de cada classe e em
 * cada nível, sai jogável — sem conta quebrada, sem escolha pendente e com
 * magias dentro dos limites. Pega regressões das regras de criação e da
 * Trilha de níveis de uma vez.
 */
describe('varredura do herói rápido: 12 classes × 20 níveis', () => {
  for (const cls of CLASSES) {
    it(cls.label, () => {
      const problems: string[] = [];
      for (let level = 1; level <= 20; level++) {
        for (const seed of [1, 2]) {
          const tag = `${cls.id} ${level} (semente ${seed})`;
          const c = quickHero('t', { level, classId: cls.id, seed }).char;
          const d = deriveCharacter(c);
          const bad = badNumbers(d);
          if (bad.length) problems.push(`${tag}: número inválido em ${bad.slice(0, 3).join(', ')}`);
          const pend = pendingChoices(c);
          if (pend.length) problems.push(`${tag}: escolha pendente ${pend.map((p) => `${p.spec.storeKey}×${p.missing}`).join(', ')}`);
          const sum = (c.classLevels ?? []).reduce((a, x) => a + x.level, 0);
          if (c.level !== level || sum !== level) problems.push(`${tag}: nível ${c.level}, soma das classes ${sum}`);
          if (d.proficiency !== 2 + Math.floor((level - 1) / 4)) problems.push(`${tag}: proficiência ${d.proficiency}`);
          if (d.maxHp < level || c.hpCurrent > d.maxHp) problems.push(`${tag}: PV ${c.hpCurrent}/${d.maxHp}`);
          if (d.ac < 10 || d.ac > 25) problems.push(`${tag}: CA ${d.ac}`);
          for (const a of d.abilityList) {
            // só o Campeão Primitivo (Bárbaro 20) passa de 20, em FOR e CON
            const cap = cls.id === 'barbarian' && level === 20 && (a.key === 'str' || a.key === 'con') ? 24 : 20;
            if (a.total < 3 || a.total > cap) problems.push(`${tag}: ${a.key} ${a.total}`);
          }
          for (const id of [...(c.knownSpells ?? []), ...(c.preparedSpells ?? [])]) if (!SPELL_BY_ID[id]) problems.push(`${tag}: magia ${id} não existe`);
          for (const f of c.feats ?? []) if (!getFeat(f)) problems.push(`${tag}: talento ${f} não existe`);
          const mod = d.spellProfiles ? Object.values(d.spellProfiles)[0]?.mod : undefined;
          const st = d.isCaster && mod !== undefined ? spellLearnState(c, mod) : null;
          if (st) {
            if (st.cantrips.have !== st.cantrips.max) problems.push(`${tag}: truques ${st.cantrips.have}/${st.cantrips.max}`);
            if (st.known && st.known.have !== st.known.max) problems.push(`${tag}: conhecidas ${st.known.have}/${st.known.max}`);
            if (st.prepared && st.prepared.have > st.prepared.max) problems.push(`${tag}: preparadas ${st.prepared.have}/${st.prepared.max}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
