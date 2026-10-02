import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, formatCode, newInviteCode, normalizeCode, typingCode } from '../inviteCode';

describe('código de convite', () => {
  it('gera 8 caracteres do alfabeto sem ambíguos', () => {
    for (let i = 0; i < 200; i++) {
      const c = newInviteCode();
      expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('distribuição sem viés (todas as letras aparecem)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const ch of newInviteCode()) seen.add(ch);
    expect(seen.size).toBe(31);
  });

  it('aceita minúsculas, espaço e hífen; recusa o que não é código', () => {
    expect(normalizeCode('k7q4-2mxp')).toBe('K7Q42MXP');
    expect(normalizeCode(' K7Q4 2MXP ')).toBe('K7Q42MXP');
    expect(normalizeCode('K7Q4-2MX')).toBeNull(); // curto
    expect(normalizeCode('K7Q4-2MX0')).toBeNull(); // 0 não existe no alfabeto
    expect(normalizeCode('a1b2c3d4e5f6g')).toBeNull(); // token antigo de convite (link)
  });

  it('formata e ajuda a digitar', () => {
    expect(formatCode('K7Q42MXP')).toBe('K7Q4-2MXP');
    expect(typingCode('k7q42')).toBe('K7Q4-2');
    expect(typingCode('k7q4-2mxp99')).toBe('K7Q4-2MXP');
    expect(typingCode('o0il')).toBe(''); // ambíguos somem
  });
});
