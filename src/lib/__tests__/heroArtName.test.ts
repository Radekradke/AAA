import { describe, it, expect } from 'vitest';
import { artKeyFromFileName, voiceKeyFromFileName } from '../heroArtName';

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

describe('voiceKeyFromFileName', () => {
  it.each([
    ['Barda.mp3', 'bard-fem'],
    ['Cleriga.mp3', 'cleric-fem'],
    ['Patrulheiro.mp3', 'ranger-masc'],
    ['Monja.mp3', 'monk-fem'],
    ['monge_femino.mp3', 'monk-fem'],
    ['Druida feminina.mp3', 'druid-fem'],
    ['ranger-masc.mp3', 'ranger-masc'],
  ])('%s → %s', (name, key) => {
    expect(voiceKeyFromFileName(name)).toBe(key);
  });

  it('nome igual nos dois sexos pede masculino/feminino', () => {
    expect(voiceKeyFromFileName('Druida.mp3')).toBeNull();
    expect(voiceKeyFromFileName('trilha.mp3')).toBeNull();
  });
});
