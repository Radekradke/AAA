import { describe, it, expect } from 'vitest';
import { normalize, scoreEntry, searchAll } from '@/lib/globalSearch';
import type { SearchEntry } from '@/lib/globalSearch';

const E = (id: string, kind: SearchEntry['kind'], title: string, extra: Partial<SearchEntry> = {}): SearchEntry => ({ id, kind, title, ...extra });

describe('busca geral', () => {
  it('ignora acento e maiúsculas', () => {
    expect(normalize('Mísseis Mágicos!')).toBe('misseis magicos');
    expect(scoreEntry(E('1', 'magia', 'Mísseis Mágicos'), 'misseis')).toBeGreaterThan(0);
  });

  it('todas as palavras precisam aparecer (no nome ou nas palavras-chave)', () => {
    const bola = E('b', 'magia', 'Bola de Fogo', { keywords: 'fireball evocação' });
    expect(scoreEntry(bola, 'bola fogo')).toBeGreaterThan(0);
    expect(scoreEntry(bola, 'fireball')).toBeGreaterThan(0);
    expect(scoreEntry(bola, 'bola gelo')).toBe(0);
  });

  it('ordena: igual > começa com > palavra começa com > contém; curto antes de longo', () => {
    const list = [E('a', 'magia', 'Luz do Dia'), E('b', 'magia', 'Globos de Luz'), E('c', 'magia', 'Luz'), E('d', 'magia', 'Arco Luzente')];
    expect(searchAll(list, 'luz')[0].items.map((x) => x.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('agrupa por tipo, limita por grupo e põe primeiro o grupo do melhor resultado', () => {
    const list = [
      ...Array.from({ length: 9 }, (_, i) => E(`m${i}`, 'magia', `Escudo ${i}`)),
      E('t', 'tela', 'Configurações'),
      E('h', 'heroi', 'Escudo', { boost: 5 }),
    ];
    const g = searchAll(list, 'escudo', 4);
    expect(g.map((x) => x.kind)).toEqual(['heroi', 'magia']);
    expect(g[1].items).toHaveLength(4);
    expect(searchAll(list, '')).toEqual([]);
  });
});
