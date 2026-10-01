import { describe, expect, it } from 'vitest';
import { blankRace, bonusText, customLineage, finalizeRace, monogram, validateRace } from '../homebrew';
import { deriveCharacter } from '../dndRules';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { getRace, raceOf } from '@/data/races';

describe('raça homebrew', () => {
  it('monta o texto do bônus e o monograma', () => {
    expect(bonusText({ str: 2, con: 1 })).toBe('+2 FOR · +1 CON');
    expect(monogram('Povo da Névoa')).toBe('PD');
  });

  it('avisa quando passa do padrão do livro, sem bloquear', () => {
    const ok = finalizeRace({ ...blankRace(), label: 'Gente do Vale', abilityBonus: { dex: 2, wis: 1 } });
    expect(validateRace(ok).filter((w) => w.level === 'warn')).toEqual([]);
    const forte = finalizeRace({ ...blankRace(), label: 'Titã', abilityBonus: { str: 3, con: 2 }, speed: 12, resistances: ['fogo', 'frio'] });
    const txt = validateRace(forte).map((w) => w.text).join(' | ');
    expect(txt).toMatch(/\+5/);
    expect(txt).toMatch(/\+3 num atributo/);
    expect(txt).toMatch(/12 m/);
    expect(txt).toMatch(/2 resistências/);
  });

  it('finalizar gera id, limpa traços vazios e marca homebrew', () => {
    const r = finalizeRace({ ...blankRace(), label: '  Salamandrino ', traitDetails: [{ name: 'Pele de Brasa', desc: 'Resiste a fogo.' }, { name: ' ', desc: 'x' }] });
    expect(r.id).toMatch(/^hb-salamandrino-/);
    expect(r.label).toBe('Salamandrino');
    expect(r.traits).toEqual(['Pele de Brasa']);
    expect(r.homebrew).toBe(true);
  });

  it('Linhagem Personalizada segue o Tasha (+2 e 1 perícia livre)', () => {
    const r = customLineage();
    expect(r.abilityBonus).toEqual({ str: 2 });
    expect(r.extraSkillPicks).toBe(1);
  });

  it('a ficha usa a raça embutida: atributos, deslocamento, visão, resistência, idiomas', () => {
    const race = finalizeRace({
      ...blankRace(),
      label: 'Filho da Tempestade',
      abilityBonus: { con: 2, cha: 1 },
      speed: 10.5,
      darkvision: 18,
      resistances: ['elétrico'],
      languages: ['Comum', 'Primordial'],
      skillProfs: ['athletics'],
    });
    const base = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Raio', classId: 'fighter' }));
    const char = { ...base, raceId: race.id, subraceId: null, customRace: race };
    const d = deriveCharacter(char);
    expect(raceOf(char).label).toBe('Filho da Tempestade');
    expect(getRace(race.id).label).toBe('Filho da Tempestade'); // ficou registrada para o resto do app
    expect(d.speed).toBe(10.5);
    expect(d.darkvision?.range).toBe(18);
    expect(d.resistances.map((r) => r.value)).toContain('elétrico');
    expect(d.languages).toContain('Primordial');
    expect(d.abilities.con.total).toBe(base.baseAbilities.con + 2);
  });
});
