import { describe, it, expect } from 'vitest';
import { hexA } from '../color';

describe('hexA', () => {
  it('converte hex longo e curto', () => {
    expect(hexA('#ff0000', 0.5)).toBe('rgba(255,0,0,0.500)');
    expect(hexA('#0f0', 1)).toBe('rgba(0,255,0,1.000)');
  });
  it('aceita variável de tema sem gerar NaN', () => {
    const v = hexA('var(--danger)', 0.4);
    expect(v).toBe('color-mix(in srgb, var(--danger) 40%, transparent)');
    expect(v).not.toContain('NaN');
  });
});
