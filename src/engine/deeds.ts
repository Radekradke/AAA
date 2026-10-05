/**
 * A carta do herói conta a história dele: moldura que sobe com o nível,
 * feitos (selos) tirados das rolagens e do combate, e cicatrizes que o
 * mestre — ou o próprio jogador — grava com data e sessão.
 */

/* ---------- moldura por nível ---------- */

export type CardTier = 'bronze' | 'prata' | 'ouro' | 'lendaria';

export const CARD_TIERS: Record<CardTier, { label: string; from: number; to: number }> = {
  bronze: { label: 'Bronze', from: 1, to: 4 },
  prata: { label: 'Prata', from: 5, to: 10 },
  ouro: { label: 'Ouro', from: 11, to: 16 },
  lendaria: { label: 'Lendária', from: 17, to: 20 },
};

export function cardTier(level: number): CardTier {
  if (level >= 17) return 'lendaria';
  if (level >= 11) return 'ouro';
  if (level >= 5) return 'prata';
  return 'bronze';
}

/* ---------- feitos ---------- */

/** Contadores que alimentam os feitos (persistidos na ficha). */
export interface DeedCounts {
  /** 20 natural no d20. */
  crits: number;
  /** 1 natural no d20. */
  fumbles: number;
  /** Golpes finais em criaturas. */
  kills: number;
  dragons: number;
  giants: number;
  undead: number;
  fiends: number;
  /** Caiu a 0 PV. */
  downs: number;
  /** Voltou de 0 PV. */
  comebacks: number;
}
export type DeedKind = keyof DeedCounts;
export const DEED_KINDS: DeedKind[] = ['crits', 'fumbles', 'kills', 'dragons', 'giants', 'undead', 'fiends', 'downs', 'comebacks'];

export interface HeroDeeds {
  counts: Partial<DeedCounts>;
  /** Feito → quando foi conquistado (ISO). */
  unlocked: Record<string, string>;
}

export type DeedIcon = { kind: 'icon'; name: 'd20' | 'swords' | 'crest' | 'moon' | 'spark' | 'inspiration' | 'levelup' } | { kind: 'monster'; type: 'dragon' | 'giant' | 'undead' | 'fiend' };

export interface DeedDef {
  id: string;
  name: string;
  desc: string;
  icon: DeedIcon;
  /** Selo de humor (cor diferente). */
  funny?: boolean;
  kind: DeedKind;
  min: number;
}

export const DEEDS: DeedDef[] = [
  { id: 'crit-1', name: 'Primeiro crítico', desc: 'Tirou o primeiro 20 natural.', icon: { kind: 'icon', name: 'd20' }, kind: 'crits', min: 1 },
  { id: 'crit-10', name: 'Mão abençoada', desc: '10 vinte naturais.', icon: { kind: 'icon', name: 'd20' }, kind: 'crits', min: 10 },
  { id: 'crit-50', name: 'Favorito dos deuses', desc: '50 vinte naturais.', icon: { kind: 'icon', name: 'inspiration' }, kind: 'crits', min: 50 },
  { id: 'fumble-1', name: 'Tropeço histórico', desc: 'O primeiro 1 natural a gente nunca esquece.', icon: { kind: 'icon', name: 'd20' }, kind: 'fumbles', min: 1, funny: true },
  { id: 'fumble-20', name: 'Azarado crônico', desc: '20 uns naturais. Os dados têm algo contra você.', icon: { kind: 'icon', name: 'moon' }, kind: 'fumbles', min: 20, funny: true },
  { id: 'kill-1', name: 'Primeira vitória', desc: 'Deu o golpe final numa criatura.', icon: { kind: 'icon', name: 'swords' }, kind: 'kills', min: 1 },
  { id: 'kill-25', name: 'Veterano', desc: '25 golpes finais.', icon: { kind: 'icon', name: 'swords' }, kind: 'kills', min: 25 },
  { id: 'kill-100', name: 'Lenda do campo de batalha', desc: '100 inimigos derrotados.', icon: { kind: 'icon', name: 'crest' }, kind: 'kills', min: 100 },
  { id: 'dragon-1', name: 'Matador de dragões', desc: 'Derrubou um dragão.', icon: { kind: 'monster', type: 'dragon' }, kind: 'dragons', min: 1 },
  { id: 'giant-1', name: 'Derruba-gigantes', desc: 'Derrubou um gigante.', icon: { kind: 'monster', type: 'giant' }, kind: 'giants', min: 1 },
  { id: 'undead-10', name: 'Caçador de mortos-vivos', desc: '10 mortos-vivos devolvidos ao túmulo.', icon: { kind: 'monster', type: 'undead' }, kind: 'undead', min: 10 },
  { id: 'fiend-1', name: 'Exorcista', desc: 'Derrubou um corruptor.', icon: { kind: 'monster', type: 'fiend' }, kind: 'fiends', min: 1 },
  { id: 'comeback-1', name: 'Voltou do abismo', desc: 'Caiu a 0 PV e voltou.', icon: { kind: 'icon', name: 'spark' }, kind: 'comebacks', min: 1 },
  { id: 'comeback-5', name: 'Teimoso demais para morrer', desc: 'Voltou de 0 PV cinco vezes.', icon: { kind: 'icon', name: 'levelup' }, kind: 'comebacks', min: 5 },
];

export const DEED_BY_ID: Record<string, DeedDef> = Object.fromEntries(DEEDS.map((d) => [d.id, d]));

export function emptyDeeds(): HeroDeeds {
  return { counts: {}, unlocked: {} };
}

/**
 * Soma um contador e devolve os feitos que acabaram de ser conquistados
 * (para o aviso "Feito conquistado!"). Não muta o original.
 */
export function addDeed(deeds: HeroDeeds | undefined, kind: DeedKind, by = 1, now = new Date()): { deeds: HeroDeeds; unlocked: DeedDef[] } {
  const base = deeds ?? emptyDeeds();
  const counts = { ...base.counts, [kind]: Math.max(0, (base.counts[kind] ?? 0) + by) };
  const unlocked = { ...base.unlocked };
  const fresh: DeedDef[] = [];
  for (const d of DEEDS) {
    if (d.kind !== kind || unlocked[d.id] || (counts[kind] ?? 0) < d.min) continue;
    unlocked[d.id] = now.toISOString();
    fresh.push(d);
  }
  return { deeds: { counts, unlocked }, unlocked: fresh };
}

/** Feitos conquistados, do mais recente ao mais antigo. */
export function earnedDeeds(deeds: HeroDeeds | undefined): { def: DeedDef; at: string }[] {
  return Object.entries(deeds?.unlocked ?? {})
    .map(([id, at]) => ({ def: DEED_BY_ID[id], at }))
    .filter((x) => !!x.def)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Tipo da criatura (texto do bestiário) → contador extra do golpe final. */
export function killKindsFor(monsterType: string | null | undefined): DeedKind[] {
  const t = (monsterType ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const out: DeedKind[] = ['kills'];
  if (t.includes('dragao')) out.push('dragons');
  if (t.includes('gigante')) out.push('giants');
  if (t.includes('morto')) out.push('undead');
  if (t.includes('corruptor') || t.includes('demonio') || t.includes('diabo') || t.includes('infernal')) out.push('fiends');
  return out;
}

/* ---------- cicatrizes ---------- */

export interface Scar {
  id: string;
  text: string;
  /** Quando aconteceu (ISO). */
  date: string;
  /** Nome da sessão em que aconteceu (se houver). */
  session?: string | null;
  by: 'mestre' | 'jogador';
}
