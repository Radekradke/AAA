import { beforeAll, describe, expect, it } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { applyDeedKinds, startDeedTracker } from '../deedTracker';
import type { RollResult } from '@/engine/dice';

const d20 = (natural: number, charId: string): RollResult => ({
  id: `r${Math.random()}`, label: 'Ataque', expr: '1d20+5', rolls: [natural], modifier: 5, total: natural + 5, sides: 20, count: 1,
  crit: natural === 20, fail: natural === 1, timestamp: Date.now(), charId,
});

describe('feitos automáticos da ficha', () => {
  const hero = { ...finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Kael', classId: 'fighter', raceId: 'human' })), hpCurrent: 12 };
  beforeAll(() => {
    useCharacterStore.setState({ characters: [hero] });
    startDeedTracker();
  });
  const get = () => useCharacterStore.getState().characters.find((c) => c.id === hero.id)!;

  it('20 e 1 naturais no d20 da ficha', () => {
    useUiStore.getState().pushRoll(d20(20, hero.id));
    useUiStore.getState().pushRoll(d20(1, hero.id));
    useUiStore.getState().pushRoll(d20(12, hero.id));
    useUiStore.getState().pushRoll({ ...d20(20, hero.id), damage: true, sides: 8 }); // dano não conta
    useUiStore.getState().clearCinematic();
    useUiStore.getState().pushRoll({ ...d20(20, hero.id), ally: 'Trovão' }); // 20 da montaria não é do herói
    expect(useUiStore.getState().cinematic).toBeNull();
    expect(get().deeds?.counts).toMatchObject({ crits: 1, fumbles: 1 });
    expect(get().deeds?.unlocked['crit-1']).toBeTruthy();
  });

  it('caiu a 0 PV e voltou', () => {
    const store = useCharacterStore.getState();
    store.applyDamage(hero.id, 12); // derruba sem dano maciço (999 mataria na hora)
    expect(get().hpCurrent).toBe(0);
    store.heal(hero.id, 3);
    expect(get().deeds?.counts).toMatchObject({ downs: 1, comebacks: 1 });
    expect(get().deeds?.unlocked['comeback-1']).toBeTruthy();
  });

  it('golpe final do mestre: só contadores válidos', () => {
    applyDeedKinds(hero.id, ['kills', 'dragons', 'inventado']);
    expect(get().deeds?.counts).toMatchObject({ kills: 1, dragons: 1 });
    expect(get().deeds?.unlocked['dragon-1']).toBeTruthy();
  });

  it('secretos: ficou com 1 PV; 20 natural no teste contra a morte', () => {
    const store = useCharacterStore.getState();
    store.heal(hero.id, 99);
    const max = get().hpCurrent;
    store.applyDamage(hero.id, max - 1);
    expect(get().hpCurrent).toBe(1);
    expect(get().deeds?.unlocked['clutch-1']).toBeTruthy();
    useUiStore.getState().pushRoll({ ...d20(20, hero.id), label: 'Teste contra a Morte', deathSave: true });
    expect(get().deeds?.unlocked['deathsave-20']).toBeTruthy();
  });
});
