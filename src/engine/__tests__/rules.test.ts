import { describe, expect, it, vi } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import {
  averageHp,
  ensureCharacterV2,
  expertiseSlots,
  featPrereqIssue,
  synthesizeHistory,
  validateLevelUp,
} from '../levelUp';
import { getFeat } from '@/data/feats';
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

  it('Patrulheiro conjura com Sabedoria (não Destreza)', () => {
    // ranger nível 2 é o primeiro com espaços de magia
    const base = ensureCharacterV2(makeChar({ classId: 'ranger', raceId: 'human' }));
    const c: Character = { ...base, level: 2, classLevels: [{ classId: 'ranger', level: 2 }], levelHistory: synthesizeHistory({ level: 2, classId: 'ranger', subclassId: null }) };
    const d = deriveCharacter(c);
    const wisMod = d.abilities.wis.mod;
    const dexMod = d.abilities.dex.mod;
    expect(wisMod).not.toBe(dexMod); // prioridade humano: dex16/wis14
    expect(d.spellDC).toBe(8 + d.proficiency + wisMod);
    expect(d.spellAttack).toBe(d.proficiency + wisMod);
  });
});

describe('progressão de classe (CLASS_FEATURES 1–20)', () => {
  it('todas as 12 classes têm característica no nível 20', async () => {
    const { CLASS_FEATURES } = await import('@/data/classFeatures');
    const { CLASSES } = await import('@/data/classes');
    for (const cls of CLASSES) {
      expect(CLASS_FEATURES[cls.id]?.[20]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('cada "Aumento de Atributo" cai num nível de ASI da classe', async () => {
    const { CLASS_FEATURES, isAsiLevel } = await import('@/data/classFeatures');
    for (const [classId, byLevel] of Object.entries(CLASS_FEATURES)) {
      for (const [lvl, feats] of Object.entries(byLevel)) {
        if (feats.includes('Aumento de Atributo')) {
          expect(isAsiLevel(classId, Number(lvl))).toBe(true);
        }
      }
    }
  });

  it('todo nível de ASI da classe lista "Aumento de Atributo"', async () => {
    const { CLASS_FEATURES, asiLevelsFor } = await import('@/data/classFeatures');
    for (const classId of Object.keys(CLASS_FEATURES)) {
      for (const lvl of asiLevelsFor(classId)) {
        expect(CLASS_FEATURES[classId][lvl] ?? []).toContain('Aumento de Atributo');
      }
    }
  });
});

describe('bônus mecânicos de subclasse', () => {
  function leveled(classId: string, subclassId: string, level: number): Character {
    const base = ensureCharacterV2(makeChar({ classId }));
    return {
      ...base,
      level,
      subclassId,
      classLevels: [{ classId, level }],
      levelHistory: synthesizeHistory({ level, classId, subclassId }),
    };
  }

  it('Linhagem Dracônica: +1 PV/nível e CA sem armadura = 13 + DES', () => {
    const c = leveled('sorcerer', 'draconic', 3);
    const semSub: Character = { ...c, subclassId: null };
    expect(deriveCharacter(c).maxHp).toBe(deriveCharacter(semSub).maxHp + 3); // +1 × 3 níveis
    const noArmor: Character = { ...c, equipped: { ...c.equipped, armor: null, shield: null } };
    const d = deriveCharacter(noArmor);
    expect(d.ac).toBe(13 + d.abilities.dex.mod);
    expect(d.breakdowns.ac.parts.some((p) => p.sourceType === 'subclass')).toBe(true);
    expect(d.languages).toContain('Dracônico'); // idioma concedido pela linhagem
  });

  it('Campeão: crítico amplia para 19 no nível 3 e 18 no nível 15', () => {
    expect(deriveCharacter(leveled('fighter', 'champion', 3)).critMin).toBe(19);
    expect(deriveCharacter(leveled('fighter', 'champion', 14)).critMin).toBe(19);
    expect(deriveCharacter(leveled('fighter', 'champion', 15)).critMin).toBe(18);
    // sem subclasse: crítico só no 20
    expect(deriveCharacter(ensureCharacterV2(makeChar())).critMin).toBe(20);
  });

  it('a rolagem de ataque respeita o critMin (natural 19 vira crítico com Campeão)', async () => {
    const { roll } = await import('../dice');
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // 1 + floor(0.9×20) = 19
    expect(roll(20, { critMin: 20 }).crit).toBe(false); // padrão: 19 não é crítico
    expect(roll(20, { critMin: 19 }).crit).toBe(true); // Campeão: 19 é crítico
    spy.mockRestore();
  });

  it('Domínio da Vida concede proficiência de armadura pesada (exibição)', () => {
    const c = leveled('cleric', 'life', 1);
    expect(deriveCharacter(c).grantedProficiencies).toContain('Armadura pesada');
  });
});

describe('Defesa sem Armadura (PHB 2014)', () => {
  it('Bárbaro sem armadura: CA = 10 + DES + CON', () => {
    const base = ensureCharacterV2(makeChar({ classId: 'barbarian', raceId: 'human' }));
    const c: Character = { ...base, equipped: { ...base.equipped, armor: null, shield: null } };
    const d = deriveCharacter(c);
    expect(d.ac).toBe(10 + d.abilities.dex.mod + d.abilities.con.mod);
  });

  it('Monge sem armadura: CA = 10 + DES + SAB (perde o traço com escudo)', () => {
    const base = ensureCharacterV2(makeChar({ classId: 'monk', raceId: 'human' }));
    const noShield: Character = { ...base, equipped: { ...base.equipped, armor: null, shield: null } };
    const d = deriveCharacter(noShield);
    expect(d.ac).toBe(10 + d.abilities.dex.mod + d.abilities.wis.mod);
  });
});

describe('migração v2/v3', () => {
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

  it('v3 acrescenta ferramentas, expertise e idiomas sem quebrar', () => {
    const legacy = makeChar() as Partial<Character>;
    delete legacy.toolProfs;
    delete legacy.skillExpertise;
    delete legacy.extraLanguages;
    delete (legacy as { schema?: number }).schema;
    const migrated = ensureCharacterV2(legacy as Character);
    expect(migrated.schema).toBe(3);
    expect(migrated.toolProfs).toEqual([]);
    expect(migrated.skillExpertise).toEqual([]);
    expect(migrated.extraLanguages).toEqual([]);
    expect(() => deriveCharacter(migrated)).not.toThrow();
  });
});

describe('expertise (PHB 2014)', () => {
  it('expertise dobra o bônus de proficiência da perícia', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' }));
    c.skillProfs = ['stealth'];
    const before = deriveCharacter(c).skills.find((s) => s.key === 'stealth')!;
    const withExp = deriveCharacter({ ...c, skillExpertise: ['stealth'] });
    const after = withExp.skills.find((s) => s.key === 'stealth')!;
    expect(after.expertise).toBe(true);
    expect(after.bonus).toBe(before.bonus + 2); // prof +2 dobrado no nível 1
  });

  it('expertise em Percepção reflete na Percepção Passiva', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' }));
    c.skillProfs = ['perception'];
    const base = deriveCharacter(c).passivePerception;
    const withExp = deriveCharacter({ ...c, skillExpertise: ['perception'] });
    expect(withExp.passivePerception).toBe(base + 2);
  });

  it('Ladino tem 2 vagas de expertise no nível 1 e 4 no nível 6', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' }));
    expect(expertiseSlots(c)).toBe(2);
    const lvl6: Character = { ...c, level: 6, classLevels: [{ classId: 'rogue', level: 6 }] };
    expect(expertiseSlots(lvl6)).toBe(4);
    expect(expertiseSlots(ensureCharacterV2(makeChar()))).toBe(0); // guerreiro
  });
});

describe('antecedentes aplicam ferramentas, equipamento e ouro', () => {
  it('Criminoso concede Ferramentas de Ladrão e jogo de dados', () => {
    const draft = createDraftCharacter({ ownerId: 't', name: 'X', classId: 'fighter', raceId: 'human' });
    draft.backgroundId = 'criminal';
    const c = finalizeCharacter(draft);
    expect(c.toolProfs.some((t) => t.id === 'thieves-tools')).toBe(true);
    expect(c.toolProfs.some((t) => t.id === 'dice-set')).toBe(true);
    expect(c.skillProfs).toContain('deception');
    expect(c.skillProfs).toContain('stealth');
  });

  it('Ladino ganha Ferramentas de Ladrão pela classe (sem duplicar com Órfão)', () => {
    const draft = createDraftCharacter({ ownerId: 't', name: 'X', classId: 'rogue', raceId: 'human' });
    draft.backgroundId = 'urchin';
    const c = finalizeCharacter(draft);
    expect(c.toolProfs.filter((t) => t.id === 'thieves-tools')).toHaveLength(1);
  });

  it('Acólito recebe equipamento inicial e 15 po', () => {
    const draft = createDraftCharacter({ ownerId: 't', name: 'X', classId: 'cleric', raceId: 'human' });
    draft.backgroundId = 'acolyte';
    const c = finalizeCharacter(draft);
    expect(c.inventory.some((i) => i.name === 'Símbolo sagrado')).toBe(true);
    expect(c.coins.gp).toBeGreaterThanOrEqual(15);
  });
});

describe('arma mágica estruturada e pré-requisitos de talento', () => {
  it('magicBonus estruturado soma no ataque e dano', () => {
    const c = ensureCharacterV2(makeChar());
    const axe = itemToInventory(getItem('w-battleaxe')!);
    axe.weapon = { ...axe.weapon!, magicBonus: 2 };
    const armed: Character = { ...c, inventory: [...c.inventory, axe], equipped: { ...c.equipped, mainHand: axe.uid } };
    const atk = deriveCharacter(armed).attacks.find((a) => a.uid === axe.uid)!;
    expect(atk.attackBonus).toBe(3 + 2 + 2); // FOR 3 + prof 2 + mágica 2
    expect(atk.damageBonus).toBe(3 + 2);
  });

  it('dano extra de outro tipo entra no ataque, expressão e rolagem', async () => {
    const { rollDamage, damageExpr } = await import('../combat');
    const c = ensureCharacterV2(makeChar());
    const sword = itemToInventory(getItem('w-longsword')!); // 1d8 cortante
    sword.weapon = { ...sword.weapon!, bonusDamage: { dice: 2, die: 6, type: 'fogo' } };
    const armed: Character = { ...c, inventory: [...c.inventory, sword], equipped: { ...c.equipped, mainHand: sword.uid } };
    const atk = deriveCharacter(armed).attacks.find((a) => a.uid === sword.uid)!;
    expect(atk.bonusDamage).toEqual({ dice: 2, die: 6, type: 'fogo' });
    expect(damageExpr(atk)).toContain('+2d6 fogo');
    // dano mínimo: 1 (dado da arma) + 3 (FOR) + 2 (2 dados de fogo, mín. 1 cada)
    const r = rollDamage(atk);
    expect(r.total).toBeGreaterThanOrEqual(1 + 3 + 2);
    expect(r.expr).toContain('fogo');
  });

  it('talento com mínimo de atributo é bloqueado quando não atende', () => {
    const c = ensureCharacterV2(makeChar({ classId: 'wizard' }));
    c.baseAbilities = { ...c.baseAbilities, dex: 8 };
    const issue = featPrereqIssue(c, getFeat('defensive-duelist')!);
    expect(issue).toContain('DES');
    expect(featPrereqIssue(c, getFeat('tough')!)).toBeNull();
  });

  it('talento racial de Xanathar exige a raça certa', () => {
    const human = ensureCharacterV2(makeChar());
    expect(featPrereqIssue(human, getFeat('orcish-fury')!)).not.toBeNull();
    const halfOrc = ensureCharacterV2(makeChar({ raceId: 'half-orc', subraceId: null }));
    expect(featPrereqIssue(halfOrc, getFeat('orcish-fury')!)).toBeNull();
  });

  it('talento que exige conjuração é bloqueado para marciais', () => {
    const fighter = ensureCharacterV2(makeChar());
    expect(featPrereqIssue(fighter, getFeat('warcaster')!)).not.toBeNull();
    const wizard = ensureCharacterV2(makeChar({ classId: 'wizard' }));
    expect(featPrereqIssue(wizard, getFeat('warcaster')!)).toBeNull();
  });
});

describe('ferramentas: cálculo próprio (sem perícia)', () => {
  it('Ferramentas de Ladrão: DES + proficiência; expertise dobra', async () => {
    const { calculateToolCheck } = await import('../toolCheck');
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' })); // DES 16 → +3, prof +2
    const tool = { id: 'thieves-tools', label: 'Ferramentas de Ladrão' };
    expect(calculateToolCheck(c, tool).total).toBe(3 + 2);
    expect(calculateToolCheck(c, { ...tool, expertise: true }).total).toBe(3 + 4);
    expect(calculateToolCheck(c, tool).ability).toBe('dex');
  });

  it('perícia relacionada NÃO entra: Prestidigitação não altera a ferramenta', async () => {
    const { calculateToolCheck } = await import('../toolCheck');
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' }));
    const before = calculateToolCheck(c, { id: 'thieves-tools', label: 'FL' }).total;
    const withSleight: Character = { ...c, skillProfs: ['sleightOfHand'], skillExpertise: ['sleightOfHand'] };
    expect(calculateToolCheck(withSleight, { id: 'thieves-tools', label: 'FL' }).total).toBe(before);
  });

  it('troca de atributo (mestre pediu INT) e bônus manual', async () => {
    const { calculateToolCheck } = await import('../toolCheck');
    const c = ensureCharacterV2(makeChar({ classId: 'rogue' })); // INT 15+? rogue prioridade: int 2º → 14? dex16 int14 → +2
    const chk = calculateToolCheck(c, { id: 'thieves-tools', label: 'FL', manualBonus: 1 }, 'int');
    expect(chk.ability).toBe('int');
    expect(chk.total).toBe(chk.abilityMod + 2 + 1);
  });

  it('atributo padrão por ferramenta: Kit de Disfarce usa CAR', async () => {
    const { toolDefaultAbility } = await import('@/data/tools');
    expect(toolDefaultAbility('disguise-kit')).toBe('cha');
    expect(toolDefaultAbility('smiths-tools')).toBe('int');
    expect(toolDefaultAbility('lute')).toBe('cha');
  });
});
