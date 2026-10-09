import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { getSubrace, raceOf } from '@/data/races';
import type { Character } from '@/types/character';
import type { SkillKey } from '@/types/dnd';

/**
 * Escolhas de origem do PHB 2014 que o jogador faz na criação:
 *
 * - Perícias: as da classe saem da lista dela; antecedente e raça dão as
 *   fixas. Se a mesma perícia vier de duas fontes, a repetida vira uma
 *   escolha LIVRE (PHB, cap. 4: "proficiências repetidas").
 * - Idiomas: "1 idioma à escolha" na raça/sub-raça e os idiomas do
 *   antecedente viram escolhas reais (guardadas em `extraLanguages`).
 */

/* ---------------- Ferramentas do antecedente ---------------- */

/** Onde fica a ferramenta/instrumento/jogo escolhido do antecedente. */
export const BG_TOOL_KEY = 'bg.tool';

/** Ferramentas do antecedente, com o tipo escolhido no lugar do padrão. */
export function backgroundTools(char: Character): string[] {
  const bg = getBackground(char.backgroundId);
  const pick = bg.toolChoice ? char.choices?.[BG_TOOL_KEY]?.[0] : undefined;
  return (bg.tools ?? []).map((id) => (pick && id === bg.toolChoice?.default ? pick : id));
}

/* ---------------- Perícias ---------------- */

/** Perícias da raça, com as trocas da origem personalizada (Tasha). */
export function raceSkillProfs(char: Character): SkillKey[] {
  const swap = char.customOrigin?.skillSwap ?? {};
  return (raceOf(char).skillProfs ?? []).map((k) => swap[k] ?? k);
}

export interface SkillBudget {
  bgSkills: Set<SkillKey>;
  raceSkills: Set<SkillKey>;
  /** Perícias escolhidas nos Dons (domínio, talento…). */
  giftSkills: Set<SkillKey>;
  /** Perícias que já vêm treinadas (antecedente + raça + Dons). */
  granted: Set<SkillKey>;
  /** Perícias repetidas entre raça e antecedente (cada uma vira 1 livre). */
  overlap: SkillKey[];
  classTotal: number;
  classUsed: number;
  classLeft: number;
  /** Livres: Meio-Elfo, Kenku… + as repetidas. */
  freeTotal: number;
  freeUsed: number;
  freeLeft: number;
  /** Pode marcar esta perícia agora? */
  canPick: (key: SkillKey) => boolean;
}

export function skillBudget(char: Character): SkillBudget {
  const cls = getClass(char.classId);
  const race = raceOf(char);
  const bg = getBackground(char.backgroundId);
  const bgSkills = new Set<SkillKey>(bg.skills);
  const raceSkills = new Set<SkillKey>(raceSkillProfs(char));
  const overlap = [...raceSkills].filter((k) => bgSkills.has(k));
  // perícias que vieram dos Dons (Bênçãos do Conhecimento, Acólito da Natureza…)
  const giftSkills = new Set<SkillKey>(
    Object.entries(char.choices ?? {})
      .filter(([k]) => /\.(knowledgeSkills|natureSkill|loreSkills|squatSkill|prodigySkill|skillExpertSkill)$/.test(k))
      .flatMap(([, v]) => v) as SkillKey[],
  );
  const granted = new Set<SkillKey>([...bgSkills, ...raceSkills, ...giftSkills]);
  const list = new Set(cls.skillChoices);

  const chosen = char.skillProfs.filter((k) => !granted.has(k));
  const inList = chosen.filter((k) => list.has(k)).length;
  const outList = chosen.length - inList;
  // as da lista da classe enchem primeiro a cota da classe; o resto usa as livres
  const classUsed = Math.min(inList, cls.skillPicks);
  const freeTotal = (race.extraSkillPicks ?? 0) + overlap.length;
  const freeUsed = outList + (inList - classUsed);
  const classLeft = cls.skillPicks - classUsed;
  const freeLeft = freeTotal - freeUsed;

  return {
    bgSkills,
    raceSkills,
    giftSkills,
    granted,
    overlap,
    classTotal: cls.skillPicks,
    classUsed,
    classLeft,
    freeTotal,
    freeUsed,
    freeLeft,
    canPick: (key) => !granted.has(key) && (list.has(key) ? classLeft > 0 || freeLeft > 0 : freeLeft > 0),
  };
}

/* ---------------- Idiomas ---------------- */

const PICK = /^(\d+)\s+idiomas?\s+(?:à|a)\s+escolha$/i;

export interface LanguagePicks {
  /** Idiomas fixos da raça e da sub-raça. */
  fixed: string[];
  /** Quantos idiomas o jogador escolhe (raça + sub-raça + antecedente). */
  total: number;
  /** De onde vem cada escolha (para explicar na tela). */
  sources: { label: string; count: number }[];
  /** Já escolhidos (os primeiros de `extraLanguages`). */
  chosen: string[];
  left: number;
}

export function languagePicks(char: Character): LanguagePicks {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const bg = getBackground(char.backgroundId);
  const fixed: string[] = [];
  const sources: { label: string; count: number }[] = [];
  const read = (list: string[] | undefined, label: string) => {
    let n = 0;
    for (const l of list ?? []) {
      const m = l.trim().match(PICK);
      if (m) n += Number(m[1]);
      else fixed.push(char.customOrigin?.langSwap?.[l] ?? l);
    }
    if (n) sources.push({ label, count: n });
  };
  read(race.languages ?? ['Comum'], race.label);
  read(sub?.languages, sub?.label ?? '');
  if (bg.languagesCount) sources.push({ label: bg.label, count: bg.languagesCount });
  const total = sources.reduce((a, s) => a + s.count, 0);
  const extra = (char.extraLanguages ?? []).filter((l) => !fixed.includes(l));
  const chosen = extra.slice(0, total);
  return { fixed, total, sources, chosen, left: Math.max(0, total - chosen.length) };
}

/** Texto do que ainda falta escolher ("2 idiomas à escolha"). */
export function languagesLeftText(left: number): string {
  return `${left} idioma${left > 1 ? 's' : ''} à escolha`;
}
