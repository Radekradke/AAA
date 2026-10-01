import { ABILITY_SHORT } from '@/data/skills';
import type { AbilityKey, Race, Subrace } from '@/types/dnd';

/**
 * Raças homebrew: o jogador cria; o app confere contra o "padrão" do Livro do
 * Jogador (2014) e avisa — sem proibir (a palavra final é do mestre).
 */
const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Texto curto do bônus ("+2 FOR · +1 CON"). */
export function bonusText(bonus: Race['abilityBonus']): string {
  const parts = KEYS.filter((k) => bonus[k]).map((k) => `${bonus[k]! > 0 ? '+' : ''}${bonus[k]} ${ABILITY_SHORT[k]}`);
  return parts.length ? parts.join(' · ') : 'sem bônus';
}

export interface HomebrewWarning {
  level: 'info' | 'warn';
  text: string;
}

/** Comparação com as raças do livro: avisos para o jogador e o mestre. */
export function validateRace(r: Race): HomebrewWarning[] {
  const out: HomebrewWarning[] = [];
  if (!r.label.trim()) out.push({ level: 'warn', text: 'Dê um nome à raça.' });
  if (r.source) {
    out.push({ level: 'info', text: `Raça oficial (${r.source}) com os números do livro — o mestre só confere se mudou algo.` });
    return out;
  }
  // com sub-raça, vale o pior caso (raça + a sub-raça que mais soma)
  const subs = r.subraces?.length ? r.subraces : [{ abilityBonus: {} } as Subrace];
  const sum = (b: Race['abilityBonus'] | undefined, k: AbilityKey) => (r.abilityBonus[k] ?? 0) + (b?.[k] ?? 0);
  const total = Math.max(...subs.map((sb) => KEYS.reduce((a, k) => a + sum(sb.abilityBonus, k), 0)));
  const max = Math.max(0, ...subs.flatMap((sb) => KEYS.map((k) => sum(sb.abilityBonus, k))));
  if (total > 3) out.push({ level: 'warn', text: `Bônus somam +${total} — no livro o padrão é +3 (o Humano, +6 espalhado em +1).` });
  if (max > 2) out.push({ level: 'warn', text: `+${max} num atributo só passa do padrão (+2).` });
  if (r.speed > 10.5) out.push({ level: 'warn', text: `Deslocamento ${String(r.speed).replace('.', ',')} m é mais rápido que qualquer raça do livro (máx. 10,5 m).` });
  if (r.speed < 7.5) out.push({ level: 'info', text: 'Deslocamento abaixo de 7,5 m é bem lento.' });
  if ((r.darkvision ?? 0) > 18) out.push({ level: 'info', text: 'Visão no escuro de 36 m é "superior" (como o Drow) — costuma vir com sensibilidade à luz.' });
  if ((r.resistances?.length ?? 0) > 1) out.push({ level: 'warn', text: `${r.resistances!.length} resistências — raças do livro têm no máximo 1.` });
  const skills = (r.skillProfs?.length ?? 0) + (r.extraSkillPicks ?? 0);
  if (skills > 2) out.push({ level: 'warn', text: `${skills} perícias de raça — o máximo do livro é 2 (Meio-Elfo).` });
  if ((r.traitDetails?.length ?? 0) > 5) out.push({ level: 'info', text: 'Muitos traços: confira com o mestre se a raça não ficou forte demais.' });
  return out;
}

/** Id estável e único para a raça homebrew. */
export function homebrewId(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'raca';
  return `hb-${slug}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Monograma do ícone (primeira letra de cada palavra, até 2). */
export function monogram(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? '')).toUpperCase();
}

/** Raça em branco, pronta para o formulário. */
export function blankRace(author?: string): Race {
  return {
    id: '',
    label: '',
    mono: '?',
    jewel: '#B5651D',
    abilityBonus: {},
    bonus: 'sem bônus',
    desc: '',
    traits: [],
    traitDetails: [],
    speed: 9,
    size: 'Médio',
    languages: ['Comum'],
    resistances: [],
    skillProfs: [],
    extraSkillPicks: 0,
    homebrew: true,
    author,
  };
}

/**
 * Modelo "Linhagem Personalizada" (Tasha, compatível com 2014): +2 num
 * atributo, uma perícia livre e um traço de escolha (talento ou visão no escuro).
 */
export function customLineage(author?: string): Race {
  return {
    ...blankRace(author),
    label: 'Linhagem Personalizada',
    desc: 'Sua origem é única: o mundo nunca viu alguém como você.',
    abilityBonus: { str: 2 },
    extraSkillPicks: 1,
    languages: ['Comum', '1 idioma à escolha'],
    traitDetails: [
      { name: 'Talento', desc: 'Você ganha um talento à sua escolha para o qual se qualifique (ou troque por visão no escuro de 18 m).' },
      { name: 'Variável', desc: 'Escolha uma perícia em que você é proficiente.' },
    ],
  };
}

/** Prepara a raça para salvar: campos derivados (bônus, monograma, traços) e carimbo. */
export function finalizeRace(r: Race, author?: string): Race {
  const traitDetails = cleanTraits(r.traitDetails);
  const abilityBonus = cleanBonus(r.abilityBonus);
  const id = r.id || homebrewId(r.label);
  return {
    ...r,
    id,
    subraces: (r.subraces ?? []).filter((sb) => sb.label.trim()).map((sb, i) => finalizeSubrace(sb, id, i)),
    label: r.label.trim().slice(0, 40),
    desc: r.desc.trim().slice(0, 600),
    mono: monogram(r.label),
    abilityBonus,
    bonus: bonusText(abilityBonus),
    traitDetails,
    traits: traitDetails.map((t) => t.name),
    languages: (r.languages ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 8),
    resistances: [...new Set(r.resistances ?? [])],
    skillProfs: [...new Set(r.skillProfs ?? [])],
    extraSkillPicks: Math.max(0, Math.min(4, r.extraSkillPicks ?? 0)),
    darkvision: r.darkvision ? Math.round(r.darkvision) : undefined,
    homebrew: true,
    author: r.author ?? author,
    updatedAt: Date.now(),
  };
}

function cleanTraits(list: { name: string; desc: string }[] | undefined) {
  return (list ?? []).filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim().slice(0, 60), desc: t.desc.trim().slice(0, 800) }));
}

function cleanBonus(b: Race['abilityBonus'] | undefined): Race['abilityBonus'] {
  return Object.fromEntries(KEYS.filter((k) => b?.[k]).map((k) => [k, Math.max(-2, Math.min(3, Math.round(b![k]!)))]));
}

/** Sub-raça pronta para salvar (id estável dentro da raça). */
export function finalizeSubrace(sb: Subrace, raceId: string, index = 0): Subrace {
  const traitDetails = cleanTraits(sb.traitDetails);
  const abilityBonus = cleanBonus(sb.abilityBonus);
  const extra = [
    Object.keys(abilityBonus).length ? bonusText(abilityBonus) : '',
    sb.speedBonus ? `+${String(sb.speedBonus).replace('.', ',')} m` : '',
  ].filter(Boolean).join(' · ');
  return {
    ...sb,
    id: sb.id && sb.id.startsWith(raceId) ? sb.id : `${raceId}-s${index}-${Math.random().toString(36).slice(2, 6)}`,
    label: sb.label.trim().slice(0, 40),
    desc: sb.desc?.trim().slice(0, 400) || undefined,
    abilityBonus,
    bonus: extra || undefined,
    traitDetails,
    traits: traitDetails.map((t) => t.name),
    resistances: sb.resistances?.length ? [...new Set(sb.resistances)] : undefined,
    darkvision: sb.darkvision || undefined,
    speedBonus: sb.speedBonus || undefined,
  };
}

/** Sub-raça em branco para o formulário. */
export function blankSubrace(): Subrace {
  return { id: '', label: '', abilityBonus: {}, traitDetails: [] };
}
