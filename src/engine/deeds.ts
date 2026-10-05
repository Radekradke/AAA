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
  /** Levou dano e ficou com exatamente 1 PV. */
  clutch: number;
  /** Dias (sessões) com 3+ vinte naturais. */
  critBursts: number;
  /** Golpes finais com dano de truque. */
  cantripKills: number;
  /** 20 natural no teste contra a morte. */
  deathSaveCrits: number;
  /** Golpes finais em criatura de ND acima do nível do herói. */
  upsets: number;
}
export type DeedKind = keyof DeedCounts;
export const DEED_KINDS: DeedKind[] = ['crits', 'fumbles', 'kills', 'dragons', 'giants', 'undead', 'fiends', 'downs', 'comebacks', 'clutch', 'critBursts', 'cantripKills', 'deathSaveCrits', 'upsets'];

export interface HeroDeeds {
  counts: Partial<DeedCounts>;
  /** Feito → quando foi conquistado (ISO). */
  unlocked: Record<string, string>;
  /** Críticos do dia (sessão) — para "3 críticos na mesma sessão". */
  burst?: { day: string; crits: number };
}

/* ---------- raridade ---------- */

export type DeedRarity = 'comum' | 'raro' | 'epico' | 'lendario';
export const DEED_RARITY: Record<DeedRarity, { label: string; order: number }> = {
  comum: { label: 'Comum', order: 0 },
  raro: { label: 'Raro', order: 1 },
  epico: { label: 'Épico', order: 2 },
  lendario: { label: 'Lendário', order: 3 },
};

export type DeedIcon = { kind: 'icon'; name: 'd20' | 'swords' | 'crest' | 'moon' | 'spark' | 'inspiration' | 'levelup' | 'quill' | 'anvil' | 'banner' } | { kind: 'monster'; type: 'dragon' | 'giant' | 'undead' | 'fiend' };

export interface DeedDef {
  id: string;
  name: string;
  desc: string;
  icon: DeedIcon;
  /** Selo de humor (cor diferente). */
  funny?: boolean;
  kind: DeedKind;
  min: number;
  rarity: DeedRarity;
  /** Aparece como "???" até ser conquistado. */
  secret?: boolean;
  /** Título que o herói pode exibir sob o nome ("Lyra, Flagelo dos Dragões"). */
  title?: string;
}

export const DEEDS: DeedDef[] = [
  { id: 'crit-1', name: 'Primeiro crítico', desc: 'Tirou o primeiro 20 natural.', icon: { kind: 'icon', name: 'd20' }, kind: 'crits', min: 1, rarity: 'comum' },
  { id: 'crit-10', name: 'Mão abençoada', desc: '10 vinte naturais.', icon: { kind: 'icon', name: 'd20' }, kind: 'crits', min: 10, rarity: 'raro', title: 'Mão Abençoada' },
  { id: 'crit-50', name: 'Favorito dos deuses', desc: '50 vinte naturais.', icon: { kind: 'icon', name: 'inspiration' }, kind: 'crits', min: 50, rarity: 'lendario', title: 'Favorito dos Deuses' },
  { id: 'fumble-1', name: 'Tropeço histórico', desc: 'O primeiro 1 natural a gente nunca esquece.', icon: { kind: 'icon', name: 'd20' }, kind: 'fumbles', min: 1, funny: true, rarity: 'comum' },
  { id: 'fumble-20', name: 'Azarado crônico', desc: '20 uns naturais. Os dados têm algo contra você.', icon: { kind: 'icon', name: 'moon' }, kind: 'fumbles', min: 20, funny: true, rarity: 'raro', title: 'Inimigo dos Dados' },
  { id: 'kill-1', name: 'Primeira vitória', desc: 'Deu o golpe final numa criatura.', icon: { kind: 'icon', name: 'swords' }, kind: 'kills', min: 1, rarity: 'comum' },
  { id: 'kill-25', name: 'Veterano', desc: '25 golpes finais.', icon: { kind: 'icon', name: 'swords' }, kind: 'kills', min: 25, rarity: 'raro', title: 'Veterano de Guerra' },
  { id: 'kill-100', name: 'Lenda do campo de batalha', desc: '100 inimigos derrotados.', icon: { kind: 'icon', name: 'crest' }, kind: 'kills', min: 100, rarity: 'lendario', title: 'Lenda do Campo de Batalha' },
  { id: 'dragon-1', name: 'Matador de dragões', desc: 'Derrubou um dragão.', icon: { kind: 'monster', type: 'dragon' }, kind: 'dragons', min: 1, rarity: 'epico', title: 'Flagelo dos Dragões' },
  { id: 'giant-1', name: 'Derruba-gigantes', desc: 'Derrubou um gigante.', icon: { kind: 'monster', type: 'giant' }, kind: 'giants', min: 1, rarity: 'raro', title: 'Derruba-Gigantes' },
  { id: 'undead-10', name: 'Caçador de mortos-vivos', desc: '10 mortos-vivos devolvidos ao túmulo.', icon: { kind: 'monster', type: 'undead' }, kind: 'undead', min: 10, rarity: 'raro', title: 'Guardião do Túmulo' },
  { id: 'fiend-1', name: 'Exorcista', desc: 'Derrubou um corruptor.', icon: { kind: 'monster', type: 'fiend' }, kind: 'fiends', min: 1, rarity: 'raro', title: 'Exorcista' },
  { id: 'comeback-1', name: 'Voltou do abismo', desc: 'Caiu a 0 PV e voltou.', icon: { kind: 'icon', name: 'spark' }, kind: 'comebacks', min: 1, rarity: 'comum' },
  { id: 'comeback-5', name: 'Teimoso demais para morrer', desc: 'Voltou de 0 PV cinco vezes.', icon: { kind: 'icon', name: 'levelup' }, kind: 'comebacks', min: 5, rarity: 'epico', title: 'Indomável' },
  // secretos: "???" até alguém conquistar
  { id: 'clutch-1', name: 'Por um fio', desc: 'Levou um golpe e ficou com 1 PV.', icon: { kind: 'icon', name: 'quill' }, kind: 'clutch', min: 1, rarity: 'raro', secret: true, title: 'Por Um Fio' },
  { id: 'burst-1', name: 'Fúria dos dados', desc: '3 críticos na mesma sessão.', icon: { kind: 'icon', name: 'inspiration' }, kind: 'critBursts', min: 1, rarity: 'epico', secret: true, title: 'Tempestade de Críticos' },
  { id: 'cantrip-kill-1', name: 'Truque mortal', desc: 'Derrotou uma criatura com um truque.', icon: { kind: 'icon', name: 'spark' }, kind: 'cantripKills', min: 1, rarity: 'raro', secret: true, title: 'Mestre dos Truques' },
  { id: 'deathsave-20', name: 'Recusou a morte', desc: '20 natural num teste contra a morte.', icon: { kind: 'icon', name: 'banner' }, kind: 'deathSaveCrits', min: 1, rarity: 'epico', secret: true, title: 'Desafiante da Morte' },
  { id: 'upset-1', name: 'Davi contra Golias', desc: 'Derrotou um inimigo de ND acima do seu nível.', icon: { kind: 'icon', name: 'anvil' }, kind: 'upsets', min: 1, rarity: 'epico', secret: true, title: 'Algoz dos Poderosos' },
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

/** Dia local (AAAA-MM-DD): a "sessão" do feito de críticos seguidos. */
export function localDay(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 20 natural: soma o crítico e, no 3º do mesmo dia, a "Fúria dos dados". */
export function addCrit(deeds: HeroDeeds | undefined, now = new Date()): { deeds: HeroDeeds; unlocked: DeedDef[] } {
  const first = addDeed(deeds, 'crits', 1, now);
  const day = localDay(now);
  const n = (deeds?.burst?.day === day ? deeds.burst.crits : 0) + 1;
  const withBurst: HeroDeeds = { ...first.deeds, burst: { day, crits: n } };
  if (n !== 3) return { deeds: withBurst, unlocked: first.unlocked };
  const second = addDeed(withBurst, 'critBursts', 1, now);
  return { deeds: { ...second.deeds, burst: withBurst.burst }, unlocked: [...first.unlocked, ...second.unlocked] };
}

/** Título escolhido (só vale se o feito estiver conquistado). */
export function heroTitle(c: { title?: string | null; deeds?: HeroDeeds }): string | null {
  const d = c.title ? DEED_BY_ID[c.title] : undefined;
  return d?.title && c.deeds?.unlocked[d.id] ? d.title : null;
}

/** Títulos que o herói já pode usar. */
export function availableTitles(deeds: HeroDeeds | undefined): DeedDef[] {
  return DEEDS.filter((d) => d.title && deeds?.unlocked[d.id]);
}

/** Feitos conquistados, do mais recente ao mais antigo. */
export function earnedDeeds(deeds: HeroDeeds | undefined): { def: DeedDef; at: string }[] {
  return Object.entries(deeds?.unlocked ?? {})
    .map(([id, at]) => ({ def: DEED_BY_ID[id], at }))
    .filter((x) => !!x.def)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** ND em número ("1/4" → 0,25; "5" → 5). */
export function crValue(cr: string | number | null | undefined): number | null {
  if (cr === null || cr === undefined || cr === '') return null;
  if (typeof cr === 'number') return cr;
  const [a, b] = cr.split('/').map(Number);
  const v = b ? a / b : a;
  return Number.isFinite(v) ? v : null;
}

/** Tipo da criatura (texto do bestiário) → contador extra do golpe final. */
export function killKindsFor(monsterType: string | null | undefined, extra: { cr?: string | number | null; level?: number | null; cantrip?: boolean } = {}): DeedKind[] {
  const t = (monsterType ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const out: DeedKind[] = ['kills'];
  if (t.includes('dragao')) out.push('dragons');
  if (t.includes('gigante')) out.push('giants');
  if (t.includes('morto')) out.push('undead');
  if (t.includes('corruptor') || t.includes('demonio') || t.includes('diabo') || t.includes('infernal')) out.push('fiends');
  if (extra.cantrip) out.push('cantripKills');
  const cr = crValue(extra.cr);
  if (cr !== null && extra.level && cr > extra.level) out.push('upsets');
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
