import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MOODS, TRACKS } from '@/data/soundtrack';

const root = resolve(__dirname, '../../..');

describe('trilha sonora', () => {
  it('cada faixa tem arquivo em public/music e crédito em CREDITOS.txt', () => {
    const credits = readFileSync(resolve(root, 'public/music/CREDITOS.txt'), 'utf8');
    for (const t of TRACKS) {
      expect(existsSync(resolve(root, 'public', t.file.slice(1))), t.file).toBe(true);
      expect(credits, t.file).toContain(t.file.replace('/music/', ''));
      expect(t.source).toMatch(/^https:\/\/opengameart\.org\/content\//);
    }
  });

  it('ids únicos e todo ambiente com pelo menos 3 faixas', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    for (const m of MOODS) expect(TRACKS.filter((t) => t.mood === m.id).length, m.id).toBeGreaterThanOrEqual(3);
    expect(TRACKS.length).toBeGreaterThanOrEqual(28);
  });
});
