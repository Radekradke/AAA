import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '../characterStore';
import { useHomebrewStore } from '../homebrewStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { characterResources } from '@/engine/classResources';
import { blankFeat, blankSpell, finalizeFeat, finalizeSpell, registerCharacterHomebrew, upcastText, validateFeat, validateSpell } from '@/engine/homebrewContent';
import { damageRoll, healRoll } from '@/engine/spellCast';
import { getSpell, spellsForClass, SPELL_BY_ID } from '@/data/spells';
import { getFeat } from '@/data/feats';
import { sheetRuleNotes } from '@/engine/tableRules';
import { characterImportError } from '@/engine/characterImport';

const ember = () =>
  finalizeSpell({ ...blankSpell(), name: 'Lança de Brasas', level: 2, classes: ['wizard', 'sorcerer'], attack: 'ranged', damage: { dice: '3d8', type: 'fogo' }, higher: upcastText(2, '1d8'), desc: 'Uma lança de fogo.' });
const storm = () =>
  finalizeFeat({ ...blankFeat(), label: 'Sangue de Tempestade', desc: 'Você aguenta raios.', abilityChoice: ['con'], hpPerLevel: 1, resistances: ['elétrico'], uses: { id: '', label: 'Rugido', desc: '', recharge: 'short', max: 1 } });

const wizard = () => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Ilse', classId: 'wizard' }));
  c.level = 3;
  c.classLevels = [{ classId: 'wizard', level: 3 }];
  return c;
};
const get = (id: string) => useCharacterStore.getState().characters.find((c) => c.id === id)!;

describe('magias e talentos homebrew', () => {
  it('a magia criada entra na lista da classe e conjura com os dados do motor (inclusive por círculo)', () => {
    const sp = ember();
    useHomebrewStore.getState().saveSpell(sp);
    expect(getSpell(sp.id)?.name).toBe('Lança de Brasas');
    expect(spellsForClass('wizard', 2).some((s) => s.id === sp.id)).toBe(true);
    expect(spellsForClass('cleric', 9).some((s) => s.id === sp.id)).toBe(false);
    expect(damageRoll(sp, 2, 3)).toMatchObject({ count: 3, sides: 8 });
    expect(damageRoll(sp, 4, 3)).toMatchObject({ count: 5, sides: 8 });
  });

  it('nunca troca uma magia oficial e a versão mais nova vence', () => {
    const official = SPELL_BY_ID['sp-firebolt'];
    registerCharacterHomebrew({ customSpells: [{ ...official, homebrew: true, name: 'Falsa', updatedAt: Date.now() }] });
    expect(getSpell('sp-firebolt')?.name).toBe(official.name);
    const sp = ember();
    useHomebrewStore.getState().saveSpell(sp);
    registerCharacterHomebrew({ customSpells: [{ ...sp, name: 'Antiga', updatedAt: 1 }] });
    expect(getSpell(sp.id)?.name).toBe('Lança de Brasas');
  });

  it('a ficha que aprende a magia leva uma cópia embutida, que sai quando ela esquece', () => {
    const sp = ember();
    useHomebrewStore.getState().saveSpell(sp);
    const c = wizard();
    useCharacterStore.setState({ characters: [c] });
    useCharacterStore.getState().updateCharacter(c.id, (d) => void (d.knownSpells = [...d.knownSpells, sp.id]));
    expect(get(c.id).customSpells?.map((s) => s.id)).toEqual([sp.id]);
    expect(sheetRuleNotes(get(c.id)).some((n) => n.kind === 'homebrew' && n.text.includes('Lança de Brasas'))).toBe(true);
    useCharacterStore.getState().updateCharacter(c.id, (d) => void (d.knownSpells = d.knownSpells.filter((x) => x !== sp.id)));
    expect(get(c.id).customSpells).toBeUndefined();
  });

  it('editar a magia na biblioteca atualiza a cópia das fichas', () => {
    const sp = ember();
    const lib = useHomebrewStore.getState();
    lib.saveSpell(sp);
    const c = wizard();
    c.knownSpells = [...c.knownSpells, sp.id];
    useCharacterStore.setState({ characters: [c] });
    lib.saveSpell({ ...sp, damage: { dice: '4d8', type: 'fogo' }, updatedAt: (sp.updatedAt ?? 0) + 1 });
    expect(get(c.id).customSpells?.[0].damage?.dice).toBe('4d8');
  });

  it('ficha vinda de outro aparelho ensina a biblioteca', () => {
    const sp = { ...ember(), id: 'hb-veio-de-fora', name: 'Veio de Fora' };
    const c = wizard();
    c.knownSpells = [sp.id];
    c.customSpells = [sp];
    useCharacterStore.setState({ characters: [c] });
    expect(useHomebrewStore.getState().spells.some((s) => s.id === sp.id)).toBe(true);
    expect(getSpell(sp.id)?.name).toBe('Veio de Fora');
  });

  it('talento homebrew: PV por nível, resistência e contador de usos entram na ficha', () => {
    const f = storm();
    useHomebrewStore.getState().saveFeat(f);
    expect(getFeat(f.id)?.source).toBe('Homebrew');
    const c = wizard();
    const before = deriveCharacter(c).maxHp;
    c.feats = [f.id];
    useCharacterStore.setState({ characters: [c] });
    const d = deriveCharacter(get(c.id));
    expect(d.maxHp).toBe(before + 3);
    expect(characterResources(get(c.id)).some((r) => r.label === 'Rugido' && r.recharge === 'short')).toBe(true);
    expect(get(c.id).customFeats?.[0].id).toBe(f.id);
  });

  it('o editor compara com o padrão do livro e bloqueia o que a ficha não entende', () => {
    expect(validateSpell(finalizeSpell({ ...blankSpell(), name: 'X', classes: ['wizard'], level: 1, damage: { dice: '10d10', type: 'fogo' } })).some((w) => w.level === 'warn')).toBe(true);
    expect(validateSpell(finalizeSpell({ ...blankSpell(), name: 'X', classes: ['wizard'], damage: { dice: 'muito', type: 'fogo' } })).some((w) => w.level === 'error')).toBe(true);
    expect(validateSpell(finalizeSpell({ ...blankSpell(), name: '', classes: [] })).filter((w) => w.level === 'error')).toHaveLength(2);
    expect(healRoll(finalizeSpell({ ...blankSpell(), name: 'Bálsamo', heal: '2d8 + mod.', classes: ['cleric'] }), 1, 3)).toMatchObject({ count: 2, sides: 8, bonus: 3 });
    expect(validateFeat(finalizeFeat({ ...blankFeat(), label: 'Forte', desc: 'x', hpPerLevel: 3, initiativeBonus: 5, resistances: ['fogo', 'frio'] })).some((w) => w.level === 'warn')).toBe(true);
  });

  it('importar JSON recusa homebrew malformado', () => {
    const c = wizard();
    expect(characterImportError({ ...c, customSpells: [ember()] }, wizard())).toBeNull();
    expect(characterImportError({ ...c, customSpells: [{ id: 'x', name: 'Sem selo', level: 1, school: 'Evocação' }] }, wizard())).toMatch(/homebrew/i);
    expect(characterImportError({ ...c, customFeats: [{ ...storm(), hpPerLevel: 'muito' }] }, wizard())).toMatch(/número/);
  });
});
