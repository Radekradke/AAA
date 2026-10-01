import { afterEach, describe, expect, it } from 'vitest';
import { SPELLS, spellsForClass, getSpell } from '../spells';
import { XGE_SPELLS } from '../spellsXge';
import { TCE_SPELLS } from '../spellsTce';
import { setEnabledPacks } from '../contentPacks';

afterEach(() => setEnabledPacks({}));

describe('magias do Xanathar e do Tasha', () => {
  it('quantidades e origem', () => {
    expect(XGE_SPELLS).toHaveLength(94);
    expect(TCE_SPELLS).toHaveLength(21);
    expect(XGE_SPELLS.every((s) => s.source === 'XGE' && s.id.startsWith('xge-'))).toBe(true);
    expect(TCE_SPELLS.every((s) => s.source === 'TCE' && s.id.startsWith('tce-'))).toBe(true);
  });

  it('ids e nomes não colidem com o Livro do Jogador', () => {
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    expect(new Set(SPELLS.map((s) => s.name)).size).toBe(SPELLS.length);
  });

  it('toda magia tem escola, classes e tempo de conjuração válidos', () => {
    for (const s of [...XGE_SPELLS, ...TCE_SPELLS]) {
      expect(s.school.length, s.name).toBeGreaterThan(3);
      expect(s.classes?.length, s.name).toBeGreaterThan(0);
      expect(s.classes?.every(Boolean), s.name).toBe(true);
      expect(s.castingTime, s.name).toBeTruthy();
    }
  });

  it('só aparecem nas listas com o pacote ligado', () => {
    const has = (cls: string, id: string) => spellsForClass(cls, 9).some((s) => s.id === id);
    expect(has('cleric', 'xge-toll-the-dead')).toBe(false);
    setEnabledPacks({ xge: true });
    expect(has('cleric', 'xge-toll-the-dead')).toBe(true);
    expect(has('sorcerer', 'tce-mind-sliver')).toBe(false);
    setEnabledPacks({ tce: true });
    expect(has('sorcerer', 'tce-mind-sliver')).toBe(true);
  });

  it('ficha que já tem a magia sempre a encontra', () => {
    expect(getSpell('xge-shadow-blade')?.name).toBe('Lâmina das Sombras');
  });

  it('alguns números do livro', () => {
    const by = (id: string) => getSpell(id)!;
    expect(by('xge-toll-the-dead').damage?.dice).toBe('1d8');
    expect(by('xge-healing-spirit').castingTime).toBe('1 ação bônus');
    expect(by('xge-absorb-elements').castingTime).toBe('Reação');
    expect(by('tce-spirit-shroud').classes).toEqual(['cleric', 'warlock', 'paladin', 'wizard']);
    expect(by('xge-catnap').concentration).toBe(false);
    expect(by('xge-shadow-blade').concentration).toBe(true);
  });
});
