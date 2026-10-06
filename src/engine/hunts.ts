import type { CardTier, HeroDeeds } from './deeds';

/**
 * Bestiário de caçadas: cada golpe final numa criatura do bestiário soma na
 * ficha do herói. Quanto mais ele caça a mesma criatura, mais sabe dela —
 * primeiro o básico, depois CA e PV, resistências, ataques e, por fim, a
 * ficha inteira. A carta da caçada troca de moldura junto.
 */

export interface HuntEntry {
  /** Golpes finais nessa criatura. */
  n: number;
  /** Primeiro e último abate (ISO). */
  first: string;
  last: string;
}

export type HuntStage = 'rastro' | 'presa' | 'estudada' | 'especialidade' | 'nemesis';

export interface HuntTierDef {
  id: HuntStage;
  min: number;
  label: string;
  /** O que esse nível revela (frase curta, para avisos e cadeados). */
  reveals: string;
  frame: CardTier;
}

export const HUNT_TIERS: HuntTierDef[] = [
  { id: 'rastro', min: 1, label: 'Primeiro abate', reveals: 'tipo, tamanho, ND, deslocamento e idiomas', frame: 'bronze' },
  { id: 'presa', min: 3, label: 'Presa conhecida', reveals: 'CA e pontos de vida', frame: 'bronze' },
  { id: 'estudada', min: 5, label: 'Estudada', reveals: 'resistências, imunidades, vulnerabilidades e sentidos', frame: 'prata' },
  { id: 'especialidade', min: 10, label: 'Especialidade', reveals: 'ataques, salvaguardas e características', frame: 'ouro' },
  { id: 'nemesis', min: 25, label: 'Nêmesis', reveals: 'a ficha inteira (atributos, perícias e reações)', frame: 'lendaria' },
];

/** Nível de conhecimento alcançado com `n` abates (null = nunca abateu). */
export function huntTier(n: number): HuntTierDef | null {
  let out: HuntTierDef | null = null;
  for (const t of HUNT_TIERS) if (n >= t.min) out = t;
  return out;
}

/** Próximo nível a conquistar (null = já é nêmesis). */
export function nextHuntTier(n: number): HuntTierDef | null {
  return HUNT_TIERS.find((t) => n < t.min) ?? null;
}

/** O que o herói já sabe da criatura. */
export interface HuntKnowledge {
  basics: boolean;
  defense: boolean;
  resist: boolean;
  attacks: boolean;
  full: boolean;
}

export function huntKnowledge(n: number): HuntKnowledge {
  const at = (id: HuntStage) => n >= HUNT_TIERS.find((t) => t.id === id)!.min;
  return { basics: at('rastro'), defense: at('presa'), resist: at('estudada'), attacks: at('especialidade'), full: at('nemesis') };
}

/** Só ids do bestiário (slug), nada que venha torto do evento. */
const REF = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const isHuntRef = (ref: unknown): ref is string => typeof ref === 'string' && REF.test(ref);

/** Soma um abate e devolve o nível recém-alcançado (se subiu). */
export function addHunt(deeds: HeroDeeds | undefined, ref: string, now = new Date()): { deeds: HeroDeeds; tier: HuntTierDef | null } {
  const base: HeroDeeds = deeds ?? { counts: {}, unlocked: {} };
  if (!isHuntRef(ref)) return { deeds: base, tier: null };
  const at = now.toISOString();
  const prev = base.hunts?.[ref];
  const n = (prev?.n ?? 0) + 1;
  const entry: HuntEntry = { n, first: prev?.first ?? at, last: at };
  const before = huntTier(prev?.n ?? 0);
  const after = huntTier(n);
  return { deeds: { ...base, hunts: { ...base.hunts, [ref]: entry } }, tier: after && after.id !== before?.id ? after : null };
}

/** Caçadas do herói: as mais caçadas primeiro (empate: a mais recente). */
export function huntsOf(deeds: HeroDeeds | undefined): [string, HuntEntry][] {
  return Object.entries(deeds?.hunts ?? {})
    .filter(([ref, h]) => isHuntRef(ref) && h && h.n > 0)
    .sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last));
}

/** Abates de uma criatura entre os heróis dados (vale o melhor caçador). */
export function bestHunt(heroes: { deeds?: HeroDeeds }[], ref: string): number {
  return heroes.reduce((max, h) => Math.max(max, h.deeds?.hunts?.[ref]?.n ?? 0), 0);
}
