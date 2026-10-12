import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '../characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';

const setup = () => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Seren', classId: 'druid' }));
  c.level = 4;
  c.classLevels = [{ classId: 'druid', level: 4 }];
  c.subclassId = 'moon';
  c.hpCurrent = deriveCharacter(c).maxHp;
  useCharacterStore.setState({ characters: [c] });
  return c.id;
};
const get = (id: string) => useCharacterStore.getState().characters.find((c) => c.id === id)!;

describe('Forma Selvagem na ficha', () => {
  it('o dano cai nos PV da fera; zerou, volta à forma normal e o excedente passa para o druida', () => {
    const id = setup();
    const st = useCharacterStore.getState();
    const hp = get(id).hpCurrent;
    st.wildShape(id, { beastId: 'brownBear', hp: 34 });
    st.applyDamage(id, 10);
    expect(get(id).combat.wildShape?.hp).toBe(24);
    expect(get(id).hpCurrent).toBe(hp);
    st.applyDamage(id, 30);
    expect(get(id).combat.wildShape).toBeUndefined();
    expect(get(id).hpCurrent).toBe(hp - 6);
  });

  it('voltar à forma normal e o descanso longo encerram a forma', () => {
    const id = setup();
    const st = useCharacterStore.getState();
    st.wildShape(id, { beastId: 'wolf', hp: 11 });
    st.wildShape(id, null);
    expect(get(id).combat.wildShape).toBeUndefined();
    st.wildShape(id, { beastId: 'wolf', hp: 11 });
    st.longRest(id);
    expect(get(id).combat.wildShape).toBeUndefined();
  });
});
