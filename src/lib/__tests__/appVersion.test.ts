import { describe, expect, it } from 'vitest';
import { APP_VERSION, builtAtLabel, checkLatest } from '../appVersion';

const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('versão do app', () => {
  it('data do build legível em pt-BR', () => {
    expect(builtAtLabel('2026-10-10T15:25:00Z')).toMatch(/^10\/10\/2026 \d{2}:25$/);
    expect(builtAtLabel('')).toBe('');
    expect(builtAtLabel('lixo')).toBe('');
  });

  it('mesma versão no ar: atualizada', async () => {
    expect(await checkLatest(reply({ version: APP_VERSION }))).toBe('current');
  });

  it('outra versão no ar: desatualizada', async () => {
    expect(await checkLatest(reply({ version: 'zzz9999' }))).toBe('outdated');
  });

  it('sem internet, sem arquivo ou resposta estranha: não afirma nada', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await checkLatest(offline)).toBe('unknown');
    expect(await checkLatest(reply({}, false))).toBe('unknown');
    expect(await checkLatest(reply({ version: 42 }))).toBe('unknown');
    expect(await checkLatest(reply({ version: '' }))).toBe('unknown');
  });
});
