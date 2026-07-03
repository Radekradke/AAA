import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import {
  averageHp,
  ensureCharacterV2,
  synthesizeHistory,
  validateLevelUp,
} from '../levelUp';
import { proficiencyBonus, abilityModifier } from '../modifiers';
import { itemToInventory } from '../inventory';
import { getItem } from '@/data/items';
import { spellSlotsForClass } from '../progression';
import type { Character } from '@/types/character';

/** Personagem finalizado de teste. */
function makeChar(over: Partial<Parameters<typeof createDraftCharacter>[0]> & { subraceId?: string | null } = {}): Character {
  const draft = createDraftCharacter({ ownerId: 'test', name: 'Teste', classId: over.classId ?? 'fighter', raceId: over.raceId ?? 'human' });
  if (over.subraceId !== undefined) draft.subraceId = over.subraceId;
  return finalizeCharacter(draft);
}

describe('regras base (PHB 2014)', () => {
  it('modificador de atributo: floor((v-10)/2)', () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(20)).toBe(5);
  });

  it('bônus de proficiência por nível', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(17)).toBe(6);
  });

  it('espaços de magia: conjurador pleno e parcial', () => {
    expect(spellSlotsForClass('wizard', 1)).toEqual({ 1: 2 });
    expect(spellSlotsForClass('wizard', 3)).toEqual({ 1: 4, 2: 2 });
    expect(spellSlotsForClass('paladin', 1)).toEqual({});
    expect(spellSlotsForClass('paladin', 2)).toEqual({ 1: 2 });
    expect(spellSlotsForClass('warlock', 3)).toEqual({ 2: 2 });
  });
});

describe('personagem nível 1', () => {
  it('guerreiro humano: PV, CA e proficiências raciais', () => {
    const c = makeChar();
    const d = deriveCharacter(c);
    // FOR 15+1(humano)=16 → mod 3; CON 14+1=15 → mod 2; PV = 10 + 2
    expect(d.maxHp).toBe(12);
    expect(d.proficiency).toBe(2);
    // cota de malha (CA 16) + escudo (+2)
    expect(d.ac).toBe(18);
    expect(d.breakdowns.ac.parts.length).toBeGreaterThanOrEqual(2);
  });

  it('elfo recebe Percepção automática e visão no escuro rastreável', () => {
    const c = makeChar({ raceId: 'elf', subraceId: 'high-elf' });
    const d = deriveCharacter(c);
    expect(d.skills.find((s) => s.key === 'perception')?.proficient).toBe(true);
    expect(d.darkvision?.range).toBe(18);
  });
});

describe('deslocamento rastreável', () => {
  it('raça padrão sem bônus (humano 9 m)', () => {
    const d = deriveCharacter(makeChar());
    expect(d.speed).toBe(9);
    expect(d.breakdowns.speed.parts).toHaveLength(1);
  });

  it('Elfo da Floresta: 9 + 1,5 com origem na sub-raça', () => {
    const c = makeChar({ raceId: 'elf', subraceId: 'wood-elf' });
    const d = deriveCharacter(c);
    expect(d.speed).toBe(10.5);
    const part = d.breakdowns.speed.parts.find((p) => p.sourceType === 'subrace');
    expect(part?.value).toBe(1.5);
    expect(part?.source).toBe('Elfo da Floresta');
  });
});

describe('evolução de nível', () => {
  it('nível 1 → 2: PV pela média + CON, dado de vida e histórico', () => {
    const c = ensureCharacterV2(makeChar());
    const errors = validateLevelUp(c, { classId: 'fighter', hpMethod: 'media', hpValue: averageHp(10) });
    expect(errors).toEqual([]);
    const withLevel: Character = {
      ...c,
      level: 2,
      classLevels: [{ classId: 'fighter', level: 2 }],
      levelHistory: [...c.levelHistory, { level: 2, classId: 'fighter', classLevel: 2, hpMethod: 'media', hpValue: 6, features: [], at: 0 }],
    };
    const d = deriveCharacter(withLevel);
    // 10 (nv1) + 6 (nv2) + 2 CON × 2 níveis = 20
    expect(d.maxHp).toBe(20);
  });

  it('ASI fora de nível é rejeitado; no nível 4 é aceito', () => {
    const c = ensureCharacterV2(makeChar());
    const asi = { kind: 'asi' as const, increases: { str: 2 } };
    expect(validateLevelUp(c, { classId: 'fighter', hpMethod: 'media', hpValue: 6, asi }).length).toBeGreaterThan(0);
    const lvl3: Character = { ...c, level: 3, classLevels: [{ classId: 'fighter', level: 3 }], levelHistory: synthesizeHistory({ level: 3, classId: 'fighter', subclassId: 'champion' }) };
    expect(validateLevelUp(lvl3, { classId: 'fighter', hpMethod: 'media', hpValue: 6, asi })).toEqual([]);
  });

  it('atributo não pode passar de 20 via ASI', () => {
    const c = ensureCharacterV2(makeChar());
    c.asiBonuses = { str: 4 }; // FOR 16 + 4 = 20
    const lvl3: Character = { ...c, level: 3, classLevels: [{ classId: 'fighter', level: 3 }], levelHistory: synthesizeHistory({ level: 3, classId: 'fighter', subclassId: 'champion' }) };
    const errors = validateLevelUp(lvl3, { classId: 'fighter', hpMethod: 'media', hpValue: 6, asi: { kind: 'asi', increases: { str: 2 } } });
    expect(errors.some((e) => e.includes('20'))).toBe(true);
  });

  it('subclasse exigida no nível certo (Guerreiro 3)', () => {
    const c = ensureCharacterV2(makeChar());
    const lvl2: Character = { ...c, level: 2, classLevels: [{ classId: 'fighter', level: 2 }], levelHistory: synthesizeHistory({ level: 2, classId: 'fighter', subclassId: null }) };
    const errors = validateLevelUp(lvl2, { classId: 'fighter', hpMethod: 'media', hpValue: 6 });
    expect(errors.some((e) => e.toLowerCase().includes('subclasse'))).toBe(true);
    expect(validateLevelUp(lvl2, { classId: 'fighter', hpMethod: 'media', hpValue: 6, subclassId: 'champion' })).toEqual([]);
  });

  it('multiclasse bloqueada por padrão', () => {
    const c = ensureCharacterV2(makeChar());
    const errors = validateLevelUp(c, { classId: 'wizard', hpMethod: 'media', hpValue: 4 });
    expect(errors.some((e) => e.toLowerCase().includes('multiclasse'))).toBe(true);
  });
});

describe('CON retroativa e talentos no PV', () => {
  it('aumentar CON altera PV máximo retroativamente', () => {
    const c = ensureCharacterV2(makeChar());
    const before = deriveCharacter(c).maxHp;
    const boosted: Character = { ...c, asiBonuses: { con: 2 } }; // CON 15 → 17 (mod 2→3)
    expect(deriveCharacter(boosted).maxHp).toBe(before + c.level);
  });

  it('talento Durão soma +2 PV/nível rastreável', () => {
    const c = ensureCharacterV2(makeChar());
    const tough: Character = { ...c, feats: ['tough'] };
    const d = deriveCharacter(tough);
    expect(d.maxHp).toBe(deriveCharacter(c).maxHp + 2 * c.level);
    expect(d.breakdowns.maxHp.parts.some((p) => p.sourceType === 'feat')).toBe(true);
  });
});

describe('itens e magia', () => {
  it('arma +1 soma no ataque e no dano com origem no item', () => {
    const c = ensureCharacterV2(makeChar());
    const axe = itemToInventory(getItem('w-battleaxe-plus1')!);
    const armed: Character = { ...c, inventory: [...c.inventory, axe], equipped: { ...c.equipped, mainHand: axe.uid } };
    const d = deriveCharacter(armed);
    const atk = d.attacks.find((a) => a.uid === axe.uid)!;
    // FOR 16 (mod 3) + prof 2 + mágico 1
    expect(atk.attackBonus).toBe(6);
    expect(atk.damageBonus).toBe(4);
    expect(atk.hitBreakdown.parts.some((p) => p.sourceType === 'item' && p.value === 1)).toBe(true);
  });

  it('armadura média limita DES no cálculo de CA', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' })); // DES 15+1=16 → mod 3
    const half = itemToInventory(getItem('a-halfplate')!); // CA 15 + DES máx 2
    const armored: Character = { ...c, inventory: [...c.inventory, half], equipped: { ...c.equipped, armor: half.uid, shield: null } };
    const d = deriveCharacter(armored);
    expect(d.ac).toBe(17);
    expect(d.breakdowns.ac.note).toContain('limita DES');
  });

  it('CD de magia do mago = 8 + prof + INT', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'wizard' })); // INT 15+1=16 → mod 3
    const d = deriveCharacter(c);
    expect(d.spellDC).toBe(8 + 2 + 3);
    expect(d.spellAttack).toBe(5);
  });
});

describe('migração v2', () => {
  it('personagem antigo ganha campos v2 e histórico sintetizado', () => {
    const legacy = makeChar() as Partial<Character>;
    delete legacy.classLevels;
    delete legacy.levelHistory;
    delete legacy.campaign;
    delete legacy.feats;
    delete legacy.asiBonuses;
    delete (legacy as { schema?: number }).schema;
    const migrated = ensureCharacterV2({ ...(legacy as Character), level: 3 });
    expect(migrated.classLevels).toEqual([{ classId: 'fighter', level: 3 }]);
    expect(migrated.levelHistory).toHaveLength(3);
    expect(migrated.levelHistory[0].hpValue).toBe(10);
    expect(migrated.campaign.system).toBe('5e-2014');
    // PV derivado bate com a fórmula da média
    const d = deriveCharacter(migrated);
    expect(d.maxHp).toBe(10 + 6 + 6 + 2 * 3);
  });
});
