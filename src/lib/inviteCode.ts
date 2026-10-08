/**
 * Código curto de convite da mesa: 8 caracteres sem os que confundem ao
 * ditar ou digitar (sem 0/O, 1/I/L) — 31^8 ≈ 850 bilhões de combinações.
 * Mostrado como XXXX-XXXX; aceito em minúsculas, com espaço ou hífen.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 8;

export function newInviteCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  // rejeição de bytes ≥ 248 (248 = 8 × 31): distribuição uniforme, sem viés
  let out = '';
  while (out.length < CODE_LENGTH) {
    for (const b of rand(CODE_LENGTH * 2)) {
      if (b < 248 && out.length < CODE_LENGTH) out += CODE_ALPHABET[b % 31];
    }
  }
  return out;
}

/** Texto digitado → código canônico (8 caracteres) ou null se não for um código. */
export function normalizeCode(input: string | null | undefined): string | null {
  const c = (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** K7Q42MXP → K7Q4-2MXP */
export function formatCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Enquanto digita: só caracteres válidos, hífen no meio. */
export function typingCode(input: string): string {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, '').split('').filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
