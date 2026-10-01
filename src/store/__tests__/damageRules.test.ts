import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '../characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';

const setup = () => {
  const draft = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Teste', classId: 'fighter' }));
  const c = { ...draft, hpCurrent: deriveCharacter(draft).maxHp };
  useCharacterStore.setState({ characters: [c] });
  return c.id;
};
const get = (id: string) => useCharacterStore.getState().characters.find((c) => c.id === id)!;

describe('dano e morte (PHB 2014)', () => {
  it('cair a 0 PV deixa inconsciente; cura acorda', () => {
    const id = setup();
    const st = useCharacterStore.getState();
    st.applyDamage(id, get(id).hpCurrent);
    expect(get(id).hpCurrent).toBe(0);
    expect(get(id).combat.conditions).toContain('Inconsciente');
    st.heal(id, 3);
    expect(get(id).hpCurrent).toBe(3);
    expect(get(id).combat.conditions).not.toContain('Inconsciente');
  });

  it('dano a 0 PV conta falha (crítico conta 2)', () => {
    const id = setup();
    const st = useCharacterStore.getState();
    st.applyDamage(id, get(id).hpCurrent);
    st.applyDamage(id, 1);
    expect(get(id).combat.deathSaves.fail).toBe(1);
    st.applyDamage(id, 1, { crit: true });
    expect(get(id).combat.deathSaves.fail).toBe(3);
  });

  it('dano maciço mata na hora', () => {
    const id = setup();
    const max = deriveCharacter(get(id)).maxHp;
    useCharacterStore.getState().applyDamage(id, get(id).hpCurrent + max);
    expect(get(id).combat.deathSaves.fail).toBe(3);
  });
});
