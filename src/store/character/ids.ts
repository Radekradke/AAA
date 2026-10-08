let seq = 0;

/** Id curto e único nesta sessão (prefixo + tempo + sequência). */
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
}
