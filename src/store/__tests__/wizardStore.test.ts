import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '../characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { characterResources } from '@/engine/classResources';

const setup = (subclassId: string | null, level = 6) => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Elminor', classId: 'wizard' }));
  c.level = level;
  c.classLevels = [{ classId: 'wizard', level }];
  c.subclassId = subclassId;
  c.hpCurrent = deriveCharacter(c).maxHp;
  c.combat = { ...c.combat, resources: {}, marks: [], spellSlots: { 1: { max: 4, used: 3 }, 2: { max: 3, used: 2 }, 3: { max: 3, used: 0 } } };
  useCharacterStore.setState({ characters: [c] });
  return c.id;
};
const get = (id: string) => useCharacterStore.getState().characters.find((c) => c.id === id)!;

describe('Mago na ficha', () => {
  it('Barreira Arcana: erguida absorve o dano antes dos PV; abjuração seguinte recarrega 2 × círculo', () => {
    const id = setup('abjuration');
    const st = useCharacterStore.getState();
    const hp = get(id).hpCurrent;
    st.applyDamage(id, 5); // sem barreira: dano direto
    expect(get(id).hpCurrent).toBe(hp - 5);
    st.chargeWard(id, 1);
    const max = characterResources(get(id)).find((r) => r.id === 'arcaneWard')!.max;
    expect(get(id).combat.resources.arcaneWard).toBe(max);
    st.applyDamage(id, max + 3);
    expect(get(id).combat.resources.arcaneWard).toBe(0);
    expect(get(id).hpCurrent).toBe(hp - 5 - 3);
    st.chargeWard(id, 2);
    expect(get(id).combat.resources.arcaneWard).toBe(4);
  });

  it('Recuperação Arcana devolve os espaços escolhidos; descanso longo limpa Portento e Sobrecarga', () => {
    const id = setup('divination');
    const st = useCharacterStore.getState();
    st.recoverSlots(id, { 1: 1, 2: 1 });
    expect([get(id).combat.spellSlots[1].used, get(id).combat.spellSlots[2].used]).toEqual([2, 1]);
    st.setPortent(id, [17, 3]);
    expect(get(id).combat.portent).toEqual([17, 3]);
    st.longRest(id);
    expect(get(id).combat.portent).toBeUndefined();
  });
});
