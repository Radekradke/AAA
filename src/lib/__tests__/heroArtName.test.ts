import { describe, it, expect } from 'vitest';
import { artKeyFromFileName } from '../heroArtName';

describe('nome do arquivo do retrato → classe + aparência', () => {
  it.each([
    ['cleric-fem.webp', 'cleric-fem'],
    ['barbarian-masc.png', 'barbarian-masc'],
    ['Clériga feminina.webp', 'cleric-fem'],
    ['Clérigo masculino.webp', 'cleric-masc'],
    ['Bárbara feminina.png', 'barbarian-fem'],
    ['Guerreira feminina.jpg', 'fighter-fem'],
    ['Druida Masculino.webp', 'druid-masc'],
    ['Druida feminina.webp', 'druid-fem'],
    ['Barda feminina.webp', 'bard-fem'],
    ['bruxo_masc.webp', 'warlock-masc'],
    ['Patrulheira Feminina.webp', 'ranger-fem'],
  ])('%s → %s', (name, key) => {
    expect(artKeyFromFileName(name)).toBe(key);
  });

  it('ignora nomes que não são retrato de classe', () => {
    expect(artKeyFromFileName('LEIA-ME.md')).toBeNull();
    expect(artKeyFromFileName('Imagem do ChatGPT 29 de set.png')).toBeNull();
    expect(artKeyFromFileName('Cavaleiro masculino.webp')).toBeNull();
  });
});
