import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ddbIdFromUrl, ddbToCharacter, itemIdFromEnglish, spellIdFromEnglish, type DdbCharacter } from '../ddbImport';
import { deriveCharacter } from '../dndRules';
import { characterImportError } from '../characterImport';
import { getSpell } from '@/data/spells';
import { getFeat } from '@/data/feats';

/** Personagens sintéticos no formato do endpoint público do D&D Beyond (sem dados reais). */
const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, 'fixtures/ddb', `${name}.json`), 'utf8')) as DdbCharacter;

describe('importar do D&D Beyond', () => {
  it('lê o id do link (com ou sem perfil) e recusa o resto', () => {
    expect(ddbIdFromUrl('https://www.dndbeyond.com/characters/123456789')).toBe('123456789');
    expect(ddbIdFromUrl('https://dndbeyond.com/profile/Fulano/characters/98765/builder')).toBe('98765');
    expect(ddbIdFromUrl('123456')).toBe('123456');
    expect(ddbIdFromUrl('https://evil.example/characters/123456')).toBeNull();
    expect(ddbIdFromUrl('https://www.dndbeyond.com/monsters/123')).toBeNull();
  });

  it('acha magias e itens pelo nome em inglês, inclusive as abreviadas do app', () => {
    expect(spellIdFromEnglish('Fireball')).toBe('sp-bolafogo');
    expect(spellIdFromEnglish('Guiding Bolt')).toBe('phb-guiding-bolt');
    expect(spellIdFromEnglish('Protection from Evil and Good')).toBe('phb-prot-evil-good');
    expect(spellIdFromEnglish("Leomund's Tiny Hut")).toBe('phb-tiny-hut');
    expect(spellIdFromEnglish("Mordenkainen's Sword")).toBe('phb-mordenkainens-sword');
    expect(spellIdFromEnglish('Toll the Dead')).toBe('xge-toll-the-dead');
    expect(spellIdFromEnglish('Conjure Woodland Beings')).toBe('phb-conjure-woodland');
    expect(spellIdFromEnglish('Healing Word')).toBe('sp-palavracura');
    expect(spellIdFromEnglish('Bonfire Lance')).toBeNull();
    expect(itemIdFromEnglish('Crossbow, Light')).toBe('w-lightcrossbow');
    expect(itemIdFromEnglish('Chain Mail')).toBe('a-chainmail');
    expect(itemIdFromEnglish('Studded Leather')).toBe('a-studded');
    expect(itemIdFromEnglish('Cloak of Many Stars')).toBeNull();
  });

  it('mago: raça, subclasse, atributos, perícias, magias (a que falta vira homebrew), moedas e PV', () => {
    const { char, warnings, summary } = ddbToCharacter(fixture('mago'), 'u');
    expect(summary).toMatchObject({ name: 'Ilse Varga', level: 5 });
    expect([char.raceId, char.subraceId, char.classId, char.subclassId, char.backgroundId, char.level]).toEqual(['elf', 'high-elf', 'wizard', 'evocation', 'sage', 5]);
    expect(char.gender).toBe('fem');
    expect(char.alignment).toBe('Neutro e Bom');
    const d = deriveCharacter(char);
    expect(d.abilities.int.total).toBe(18); // 15 + 1 (Alto Elfo) + 2 (aumento)
    expect(d.abilities.dex.total).toBe(16);
    expect(d.skills.find((s) => s.key === 'arcana')?.proficient).toBe(true);
    expect(d.skills.find((s) => s.key === 'perception')?.proficient).toBe(true);
    const hb = char.customSpells ?? [];
    expect(hb.map((s) => s.name)).toEqual(['Bonfire Lance']);
    expect(getSpell(hb[0].id)?.range).toBe('18 m');
    expect(char.preparedSpells).toEqual(expect.arrayContaining(['sp-firebolt', 'xge-toll-the-dead', 'sp-misseis', 'sp-bolafogo', hb[0].id]));
    expect(char.preparedSpells).not.toContain('sp-detectar');
    expect(char.knownSpells).toEqual(expect.arrayContaining(['sp-detectar', 'phb-tiny-hut', 'sp-bolafogo']));
    expect(char.coins).toEqual({ cp: 3, sp: 12, ep: 0, gp: 41, pp: 1 });
    expect(char.hpCurrent).toBe(d.maxHp - 4);
    expect(char.inventory.map((i) => i.name)).toEqual(['Bordão', 'Spellbook']);
    expect(char.equipped.mainHand).toBe(char.inventory[0].uid);
    expect(char.notes).toContain('Estudou em Candlekeep.');
    expect(warnings.join(' ')).toMatch(/Bonfire Lance/);
    expect(characterImportError(char, char)).toBeNull();
  });

  it('guerreiro: equipamento vestido, talento do app e talento que vira homebrew, item mágico desconhecido', () => {
    const { char, warnings } = ddbToCharacter(fixture('guerreiro'), 'u');
    expect([char.raceId, char.classId, char.subclassId, char.level]).toEqual(['half-orc', 'fighter', 'battlemaster', 6]);
    expect(char.feats[0]).toBe('gwm');
    const iron = getFeat(char.feats[1]);
    expect(iron?.homebrew && iron.label).toBe('Iron Will');
    expect(char.customFeats?.[0].label).toBe('Iron Will');
    const byName = (n: string) => char.inventory.find((i) => i.name === n)!;
    expect(char.equipped.mainHand).toBe(byName('Espada Grande').uid);
    expect(char.equipped.armor).toBe(byName('Cota de Malha').uid);
    expect(byName('Cloak of Many Stars')).toMatchObject({ homebrew: true, attuned: true, rarity: 'raro', category: 'gear' });
    const d = deriveCharacter(char);
    expect(d.ac).toBe(16);
    expect(d.abilities.str.total).toBe(19);
    expect(char.combat.hpTemp).toBe(5);
    expect(warnings.join(' ')).toMatch(/Iron Will/);
    expect(warnings.join(' ')).toMatch(/item criado/);
  });

  it('multiclasse: entra a classe principal com todos os níveis e um aviso; magia sempre preparada não ocupa vaga', () => {
    const { char, warnings, summary } = ddbToCharacter(fixture('multiclasse'), 'u');
    expect(summary.classes).toBe('Cleric 3 / Fighter 2');
    expect([char.classId, char.subclassId, char.level]).toEqual(['cleric', 'life', 5]);
    expect(warnings.join(' ')).toMatch(/Multiclasse/);
    expect(char.preparedSpells).toEqual(expect.arrayContaining(['sp-chama', 'sp-bencao', 'phb-guiding-bolt', 'phb-prot-evil-good']));
    expect(char.preparedSpells).not.toContain('sp-curar');
    expect(char.customSpells).toBeUndefined();
  });
});
