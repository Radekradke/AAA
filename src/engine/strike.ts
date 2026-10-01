/**
 * Ataque contra um alvo (regras do Livro do Jogador): d20 + bônus contra a
 * CA; 20 natural sempre acerta (crítico), 1 natural sempre erra. Dano com
 * resistência cai pela metade (arredonda para baixo), vulnerabilidade dobra,
 * imunidade zera.
 */
export type DefenseMode = 'normal' | 'half' | 'double' | 'zero';

export function attackHits(total: number, natural: number, ac: number | null): { hit: boolean; crit: boolean } {
  if (natural === 20) return { hit: true, crit: true };
  if (natural === 1) return { hit: false, crit: false };
  return { hit: ac === null ? true : total >= ac, crit: false };
}

export function applyDefense(amount: number, mode: DefenseMode): number {
  const n = Math.max(0, Math.floor(amount));
  if (mode === 'half') return Math.floor(n / 2);
  if (mode === 'double') return n * 2;
  if (mode === 'zero') return 0;
  return n;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Defesa do alvo contra um tipo de dano, lendo os textos do bloco do monstro
 * (ex.: resist "contundente, perfurante e cortante de ataques não mágicos").
 * `magical` desliga a ressalva de "não mágicos".
 */
export function defenseFor(
  type: string | undefined,
  defs: { vuln?: string; resist?: string; immune?: string },
  magical = false,
): DefenseMode {
  if (!type) return 'normal';
  const t = norm(type).split(/\s+/)[0];
  // cláusulas separadas por ";" — com ataque mágico, ignora as "de ataques não mágicos"
  const has = (text?: string) =>
    !!text &&
    norm(text)
      .split(';')
      .some((clause) => clause.includes(t) && !(magical && /nao magic/.test(clause)));
  if (has(defs.immune)) return 'zero';
  if (has(defs.resist)) return 'half';
  if (has(defs.vuln)) return 'double';
  return 'normal';
}

export const DEFENSE_LABEL: Record<DefenseMode, string> = {
  normal: '',
  half: 'resistência (metade)',
  double: 'vulnerável (dobro)',
  zero: 'imune',
};
