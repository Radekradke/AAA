import { describe, expect, it } from 'vitest';
import { GAME_ICONS } from '../gameIcons';
import { GAME_ICONS_CORE } from '../gameIconsCore';

describe('ícones do núcleo (pacote de entrada)', () => {
  it('cada ícone do núcleo é igual ao do conjunto completo', () => {
    for (const [name, paths] of Object.entries(GAME_ICONS_CORE)) {
      expect(GAME_ICONS[name as keyof typeof GAME_ICONS], name).toEqual(paths);
    }
  });
});
