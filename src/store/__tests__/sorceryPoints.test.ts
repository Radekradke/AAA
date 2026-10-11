import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '../characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';

const setup = (level: number) => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Vesper', classId: 'sorcerer' }));
  c.level = level;
  c.classLevels = [{ classId: 'sorcerer', level }];
  c.combat = { ...c.combat, resources: { sorcery: 1 }, spellSlots: { 1: { max: 4, used: 3 }, 2: { max: 3, used: 0 } } };
  useCharacterStore.setState({ characters: [c] });
  return c.id;
};
const get = (id: string) => useCharacterStore.getState().characters.find((c) => c.id === id)!;

describe('Pontos de Feitiçaria na ficha', () => {
  it('Fonte de Magia: espaço vira pontos (= círculo) e pontos voltam um espaço gasto', () => {
    const id = setup(5);
    const st = useCharacterStore.getState();
    expect(st.fontOfMagic(id, 'toSlot', 1)).toBe(false); // só 1 ponto, custa 2
    expect(st.fontOfMagic(id, 'toPoints', 2)).toBe(true);
    expect(get(id).combat.resources.sorcery).toBe(3);
    expect(get(id).combat.spellSlots[2].used).toBe(1);
    expect(st.fontOfMagic(id, 'toSlot', 1)).toBe(true);
    expect(get(id).combat.resources.sorcery).toBe(1);
    expect(get(id).combat.spellSlots[1].used).toBe(2);
  });

  it('Restauração Feiticeira (20º): o descanso curto devolve 4 pontos', () => {
    const id20 = setup(20);
    useCharacterStore.getState().shortRest(id20);
    expect(get(id20).combat.resources.sorcery).toBe(5);
    const id19 = setup(19);
    useCharacterStore.getState().shortRest(id19);
    expect(get(id19).combat.resources.sorcery).toBe(1);
  });
});
