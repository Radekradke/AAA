import { beforeEach, describe, expect, it } from 'vitest';
import { __resetHistory, autoCapture, listHistory, MAX_ENTRIES, recordVersion, SESSION_GAP_MS, watchCharacters } from '../sheetHistory';
import type { Character } from '@/types/character';

const hero = (p: Partial<Character> = {}) => ({ id: 'h1', name: 'Kael', level: 3, hpCurrent: 20, updatedAt: 100, ...p }) as Character;

beforeEach(() => __resetHistory());

describe('histórico da ficha', () => {
  it('guarda da mais nova para a mais antiga, com teto', async () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) await recordVersion(hero({ updatedAt: i, hpCurrent: i }), 'manual', 'x', 1000 + i);
    const list = await listHistory('h1');
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(list[0].char.hpCurrent).toBe(MAX_ENTRIES + 4);
  });

  it('a mesma versão duas vezes seguidas não duplica', async () => {
    await recordVersion(hero(), 'auto', 'a');
    await recordVersion(hero(), 'auto', 'a');
    expect(await listHistory('h1')).toHaveLength(1);
  });

  it('guarda uma cópia (mexer na ficha depois não altera a versão)', async () => {
    const c = hero();
    await recordVersion(c, 'manual', 'x');
    c.hpCurrent = 1;
    expect((await listHistory('h1'))[0].char.hpCurrent).toBe(20);
  });

  it('subir de nível sempre guarda a versão de antes', () => {
    expect(autoCapture(hero({ level: 3 }), hero({ level: 4, updatedAt: 200 }))).toMatchObject({ reason: 'levelup' });
  });

  it('rascunho e "nada mudou" não entram', () => {
    expect(autoCapture(hero({ draft: true }), hero({ draft: true, updatedAt: 200 }))).toBeNull();
    expect(autoCapture(hero(), hero())).toBeNull();
  });

  it('captura automática: uma versão por sessão de edição', async () => {
    let listener: (s: { characters: Character[] }, p: { characters: Character[] }) => void = () => undefined;
    const off = watchCharacters((fn) => {
      listener = fn;
      return () => undefined;
    });
    const v1 = hero({ updatedAt: 100 });
    const v2 = hero({ updatedAt: 200, hpCurrent: 15 });
    const v3 = hero({ updatedAt: 300, hpCurrent: 10 });
    listener({ characters: [v2] }, { characters: [v1] });
    listener({ characters: [v3] }, { characters: [v2] }); // mesma sessão: não guarda de novo
    await recordVersion(hero({ updatedAt: -1 }), 'manual', 'barreira'); // espera a fila
    const list = await listHistory('h1');
    expect(list.filter((e) => e.reason === 'auto')).toHaveLength(1);
    expect(list.find((e) => e.reason === 'auto')!.char.hpCurrent).toBe(20); // o ponto de partida
    expect(SESSION_GAP_MS).toBeGreaterThan(0);
    off();
  });
});
