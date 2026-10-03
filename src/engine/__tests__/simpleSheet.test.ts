import { describe, expect, it } from 'vitest';
import { fromSimpleSheet, isSimpleSheet, SIMPLE_FORMAT } from '../simpleSheet';
import type { SimpleSheet } from '../simpleSheet';
import { deriveCharacter } from '../dndRules';

const base = (over: Partial<SimpleSheet> = {}): SimpleSheet => ({
  formato: SIMPLE_FORMAT,
  nome: 'Borin Pedrafunda',
  genero: 'masc',
  raca: 'Anão',
  subraca: 'Anão da Colina',
  classe: 'Clérigo',
  subclasse: 'Domínio da Vida',
  nivel: 1,
  antecedente: 'Acólito',
  tendencia: 'Leal e Bom',
  atributos: { for: 14, des: 8, con: 13, int: 10, sab: 15, car: 12 },
  pericias: ['Medicina', 'Persuasão'],
  idiomas: ['Celestial', 'Gigante'],
  magias: ['Chama Sagrada', 'Orientação', 'Luz', 'Curar Ferimentos', 'Bênção'],
  ...over,
});

describe('ficha simples (ChatGPT → app)', () => {
  it('reconhece o formato', () => {
    expect(isSimpleSheet(base())).toBe(true);
    expect(isSimpleSheet({ name: 'x' })).toBe(false);
  });

  it('monta a ficha com as regras da criação, sem avisos', () => {
    const { char, warnings } = fromSimpleSheet(base(), 'u1');
    expect(warnings).toEqual([]);
    expect(char).toMatchObject({ name: 'Borin Pedrafunda', raceId: 'dwarf', subraceId: 'hill-dwarf', classId: 'cleric', backgroundId: 'acolyte', level: 1, ownerId: 'u1', alignment: 'Leal e Bom' });
    expect(char.subclassId).toBe('life');
    // perícias do antecedente entram sozinhas, as da classe vêm do JSON
    expect(char.skillProfs).toEqual(expect.arrayContaining(['insight', 'religion', 'medicine', 'persuasion']));
    expect(char.extraLanguages).toEqual(['Celestial', 'Gigante']);
    expect(char.preparedSpells.length).toBe(5);
    expect(char.inventory.length).toBeGreaterThan(0); // equipamento inicial
    expect(char.hpCurrent).toBe(deriveCharacter(char).maxHp);
  });

  it('aceita ids e nomes sem acento', () => {
    const { char, warnings } = fromSimpleSheet(base({ raca: 'dwarf', subraca: 'anao da colina', classe: 'clerigo', antecedente: 'ACOLITO', pericias: ['medicina', 'persuasion'] }), 'u1');
    expect(warnings).toEqual([]);
    expect(char.classId).toBe('cleric');
    expect(char.skillProfs).toContain('medicine');
  });

  it('não conta duas vezes a perícia que o antecedente já dá', () => {
    const { char, warnings } = fromSimpleSheet(base({ pericias: ['Medicina', 'Persuasão', 'Religião'] }), 'u1');
    expect(warnings).toEqual([]);
    expect(char.skillProfs.filter((k) => k === 'religion')).toHaveLength(1);
  });

  it('avisa o que não reconhece ou foge da regra (e cria o herói mesmo assim)', () => {
    const { char, warnings } = fromSimpleSheet(
      base({
        raca: 'Hobbit',
        classe: 'Clérigo',
        subclasse: 'Domínio do Sol',
        atributos: { for: 18, des: 8, con: 13, int: 10, sab: 15, car: 12 },
        pericias: ['Medicina', 'Persuasão', 'História', 'Voar'],
        magias: ['Bola de Fogo', 'Luz'],
      }),
      'u1',
    );
    expect(char.raceId).toBe('human');
    const all = warnings.join('\n');
    expect(all).toMatch(/Raça "Hobbit"/);
    expect(all).toMatch(/Subclasse "Domínio do Sol"/);
    expect(all).toMatch(/acima de 15/);
    expect(all).toMatch(/Perícia "Voar"/);
    expect(all).toMatch(/Perícias demais/);
    expect(all).toMatch(/Fora da lista de Clérigo: Bola de Fogo/);
    expect(all).toMatch(/Círculo alto demais/);
  });

  it('subclasse antes do nível dela fica para depois', () => {
    const { char, warnings } = fromSimpleSheet(base({ classe: 'Guerreiro', subclasse: 'Campeão', antecedente: 'Soldado', pericias: ['Percepção', 'Sobrevivência'], idiomas: [], magias: [] }), 'u1');
    expect(char.subclassId).toBeNull();
    expect(warnings.join()).toMatch(/Campeão só entra no nível 3/);
  });

  it('cobra os aumentos de atributo do nível', () => {
    const lv4 = base({ nivel: 4, magias: [] });
    expect(fromSimpleSheet(lv4, 'u1').warnings.join()).toMatch(/Sobrou 1 aumento/);
    const ok = fromSimpleSheet({ ...lv4, aumentosDeAtributo: { sab: 2 } }, 'u1');
    expect(ok.warnings).toEqual([]);
    expect(ok.char.asiBonuses.wis).toBe(2);
  });

  it('Meio-Elfo: bônus à escolha e história nas notas', () => {
    const { char, warnings } = fromSimpleSheet(
      base({ raca: 'Meio-Elfo', subraca: null, bonusRacialEscolhido: ['for', 'sab'], pericias: ['Medicina', 'Persuasão', 'Atletismo', 'Percepção'], idiomas: ['Celestial', 'Gigante', 'Orc'], historia: 'Criado num templo.' }),
      'u1',
    );
    expect(warnings).toEqual([]);
    expect(char.raceAbilityChoice).toEqual(['str', 'wis']);
    expect(char.notes).toContain('História: Criado num templo.');
  });
});
