import { describe, expect, it } from 'vitest';
import { HEAVY_ACTIONS } from '../character/heavyKeys';
import { heavyCharacterActions } from '../character/heavy';
import type { StoreCtx } from '../character/types';

describe('ações da ficha fora do pacote de entrada', () => {
  it('a lista do store e as ações de character/heavy são as mesmas', () => {
    const ctx = { set: () => {}, get: () => ({}), mutate: () => {} } as unknown as StoreCtx;
    const keys = Object.keys(heavyCharacterActions(ctx)).sort();
    expect(keys).toEqual([...HEAVY_ACTIONS].sort());
  });

  it('o store avisa quem chama antes de carregar e funciona depois', async () => {
    const { useCharacterStore, loadCharacterActions } = await import('../characterStore');
    expect(() => useCharacterStore.getState().startDraft({ ownerId: 'x' })).toThrow(/antes de carregar/);
    await loadCharacterActions();
    const id = useCharacterStore.getState().startDraft({ ownerId: 'x' });
    expect(useCharacterStore.getState().getCharacter(id)?.draft).toBe(true);
  });
});
