/**
 * Bônus rastreáveis: todo valor importante da ficha é a soma de
 * modificadores com origem identificada — nada de número solto.
 */

export type ModifierSourceType =
  | 'base'
  | 'ability'
  | 'proficiency'
  | 'race'
  | 'subrace'
  | 'class'
  | 'subclass'
  | 'background'
  | 'asi'
  | 'feat'
  | 'item'
  | 'condition'
  | 'homebrew';

export interface Modifier {
  /** Nome da origem (ex.: "Elfo da Floresta", "Machado +1"). */
  source: string;
  sourceType: ModifierSourceType;
  /** O que este modificador afeta (ex.: "speed", "ac", "attack"). */
  target: string;
  value: number;
  /** Unidade para exibição (ex.: "m"). */
  unit?: string;
  /** Nome da característica (ex.: "Pés Ligeiros"). */
  label?: string;
  active?: boolean;
}

/** Decomposição de um valor final: total + partes com origem. */
export interface Breakdown {
  total: number;
  parts: Modifier[];
  /** Observação extra (ex.: teto de DES da armadura). */
  note?: string;
}

/** Cria um modificador (partes com valor 0 são omitidas por padrão). */
export function mod(
  target: string,
  value: number,
  source: string,
  sourceType: ModifierSourceType,
  extra: Partial<Pick<Modifier, 'unit' | 'label'>> = {},
): Modifier {
  return { target, value, source, sourceType, active: true, ...extra };
}

/** Soma partes num Breakdown, descartando modificadores nulos/zerados opcionais. */
export function breakdown(parts: Array<Modifier | null | undefined>, note?: string): Breakdown {
  const clean = parts.filter((p): p is Modifier => !!p && p.value !== 0 || (!!p && p.sourceType === 'base'));
  const total = clean.reduce((sum, p) => sum + p.value, 0);
  return { total, parts: clean, note };
}

const SOURCE_LABEL: Record<ModifierSourceType, string> = {
  base: 'base',
  ability: 'atributo',
  proficiency: 'proficiência',
  race: 'raça',
  subrace: 'sub-raça',
  class: 'classe',
  subclass: 'subclasse',
  background: 'antecedente',
  asi: 'aumento de atributo',
  feat: 'talento',
  item: 'item',
  condition: 'condição',
  homebrew: 'homebrew',
};

function fmtValue(v: number, unit?: string): string {
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  const num = Number.isInteger(abs) ? String(abs) : abs.toFixed(1).replace('.', ',');
  return `${sign}${num}${unit ? ` ${unit}` : ''}`;
}

/** Corpo multi-linha "ver cálculo" para tooltips (uma parte por linha). */
export function breakdownBody(b: Breakdown, unit?: string): string {
  const lines = b.parts.map((p) => {
    const origin = p.label ? `${p.label} — ${p.source}` : p.source;
    return `${fmtValue(p.value, p.unit ?? unit)}  ${origin} (${SOURCE_LABEL[p.sourceType]})`;
  });
  if (b.note) lines.push(`· ${b.note}`);
  return lines.join('\n');
}
