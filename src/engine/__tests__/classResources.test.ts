import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { characterResources, resourceMaxMap } from '../classResources';
import type { Character } from '@/types/character';

function at(classId: string, level: number, patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId }));
  return { ...c, ...patch, level, classLevels: [{ classId, level }] };
}
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('recursos de classe seguem o PHB 2014 por nível', () => {
  it('Feiticeiro: Pontos de Feitiçaria só a partir do 2º nível e iguais ao nível', () => {
    expect(resourceMaxMap(at('sorcerer', 1)).sorcery).toBeUndefined();
    expect(resourceMaxMap(at('sorcerer', 2)).sorcery).toBe(2);
    expect(resourceMaxMap(at('sorcerer', 10)).sorcery).toBe(10);
    expect(resourceMaxMap(at('sorcerer', 20)).sorcery).toBe(20);
  });

  it('Guerreiro: Surto 1 no 2º e 2 no 17º; Indomável 1/2/3 no 9º/13º/17º', () => {
    expect(resourceMaxMap(at('fighter', 1)).surge).toBeUndefined();
    expect(resourceMaxMap(at('fighter', 2)).surge).toBe(1);
    expect(resourceMaxMap(at('fighter', 17)).surge).toBe(2);
    expect(resourceMaxMap(at('fighter', 8)).indomitable).toBeUndefined();
    expect(resourceMaxMap(at('fighter', 9)).indomitable).toBe(1);
    expect(resourceMaxMap(at('fighter', 13)).indomitable).toBe(2);
    expect(resourceMaxMap(at('fighter', 17)).indomitable).toBe(3);
  });

  it('Mestre de Batalha: 4/5/6 dados de d8 → d10 → d12', () => {
    const r3 = res(at('fighter', 3, { subclassId: 'battlemaster' }));
    expect(r3.superiority.max).toBe(4);
    expect(r3.superiority.die).toBe('d8');
    expect(res(at('fighter', 7, { subclassId: 'battlemaster' })).superiority.max).toBe(5);
    expect(res(at('fighter', 10, { subclassId: 'battlemaster' })).superiority.die).toBe('d10');
    const r18 = res(at('fighter', 18, { subclassId: 'battlemaster' }));
    expect(r18.superiority.max).toBe(6);
    expect(r18.superiority.die).toBe('d12');
    expect(res(at('fighter', 7, { subclassId: 'champion' })).superiority).toBeUndefined();
  });

  it('Bárbaro: Fúria 2/3/4/5/6 e ilimitada no 20º', () => {
    expect(resourceMaxMap(at('barbarian', 1)).rage).toBe(2);
    expect(resourceMaxMap(at('barbarian', 3)).rage).toBe(3);
    expect(resourceMaxMap(at('barbarian', 12)).rage).toBe(5);
    expect(res(at('barbarian', 20)).rage.unlimited).toBe(true);
  });

  it('Bardo: usos = mod. de Carisma; dado sobe; recarga curta a partir do 5º', () => {
    const b1 = res(at('bard', 1));
    expect(b1.inspiration.die).toBe('d6');
    expect(b1.inspiration.recharge).toBe('long');
    const b5 = res(at('bard', 5));
    expect(b5.inspiration.die).toBe('d8');
    expect(b5.inspiration.recharge).toBe('short');
    expect(res(at('bard', 15)).inspiration.die).toBe('d12');
  });

  it('Clérigo, Druida e Monge começam o recurso no 2º nível', () => {
    expect(resourceMaxMap(at('cleric', 1)).channel).toBeUndefined();
    expect(resourceMaxMap(at('cleric', 6)).channel).toBe(2);
    expect(resourceMaxMap(at('cleric', 18)).channel).toBe(3);
    expect(resourceMaxMap(at('druid', 1)).wildshape).toBeUndefined();
    expect(resourceMaxMap(at('monk', 1)).ki).toBeUndefined();
    expect(resourceMaxMap(at('monk', 9)).ki).toBe(9);
  });

  it('Paladino: Cura pelas Mãos = 5 × nível', () => {
    expect(resourceMaxMap(at('paladin', 7)).layhands).toBe(35);
  });
});
