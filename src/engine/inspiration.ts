import type { Character } from '@/types/character';

/**
 * Inspiração. Regra do PHB 2014: o personagem TEM ou NÃO TEM inspiração —
 * não acumula. Muitas mesas deixam acumular; isso é uma regra da mesa,
 * ligada por ficha em `campaign.stackingInspiration` (até 10 pontos).
 * O booleano antigo (`inspiration`) continua espelhado para fichas/sync
 * anteriores.
 */
export const INSPIRATION_MAX = 10;

type InspirationFields = Pick<Character, 'inspiration' | 'inspirationPoints'> & { campaign?: Partial<Character['campaign']> };

/**
 * A mesa deixa acumular? Ficha que já acumulava antes da opção existir
 * (mais de 1 ponto, sem escolha gravada) continua acumulando: nada some.
 */
export function stacksInspiration(c: InspirationFields): boolean {
  const rule = c.campaign?.stackingInspiration;
  if (typeof rule === 'boolean') return rule;
  return (c.inspirationPoints ?? 0) > 1;
}

/** Máximo de pontos: 1 na regra 2014; 10 com a regra da mesa. */
export function inspirationMax(c: InspirationFields): number {
  return stacksInspiration(c) ? INSPIRATION_MAX : 1;
}

/** Pontos atuais (ficha antiga sem contador: booleano vira 0 ou 1). */
export function inspirationCount(c: InspirationFields): number {
  const max = inspirationMax(c);
  if (typeof c.inspirationPoints === 'number') return Math.max(0, Math.min(max, Math.floor(c.inspirationPoints)));
  return c.inspiration ? 1 : 0;
}

/** Define os pontos (com limites da regra em vigor) mantendo o booleano legado coerente. */
export function setInspirationCount(c: Character, n: number): void {
  // quem já acumulava sem a opção gravada: grava agora, para não "desligar" ao cair para 1 ponto
  if (c.campaign && c.campaign.stackingInspiration === undefined && stacksInspiration(c)) c.campaign = { ...c.campaign, stackingInspiration: true };
  const v = Math.max(0, Math.min(inspirationMax(c), Math.floor(n)));
  c.inspirationPoints = v;
  c.inspiration = v > 0;
}
