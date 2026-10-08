import type { AbilityKey, AbilityScores, SkillKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character } from '@/types/character';
import { RACES, getSubraces } from '@/data/races';
import { CLASSES, getClass } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { BACKGROUNDS } from '@/data/backgrounds';
import { SKILLS } from '@/data/skills';
import { FEATS } from '@/data/feats';
import { SPELLS, getSpell } from '@/data/spells';
import { createDraftCharacter, finalizeCharacter } from './characterBuilder';
import { deriveCharacter } from './dndRules';
import { skillBudget, languagePicks } from './originChoices';
import { subclassLevelFor } from './levelUp';
import { asiLevelsFor } from '@/data/classFeatures';
import { buildSpellSlots } from './progression';
import { cantripsKnown } from './spellcasting';

/**
 * "Ficha simples" — formato enxuto para criar um herói fora do app (ex.: o
 * ChatGPT preenche seguindo docs/CRIAR-COM-CHATGPT.md) e importar em
 * Heróis → Importar. Aceita ids ou nomes em português (sem acento também);
 * o app monta a ficha completa com as MESMAS regras da criação (equipamento
 * inicial, perícias do antecedente, PV, espaços de magia…) e devolve avisos
 * do que não reconheceu ou que fugiu da regra — nada é recusado em silêncio.
 */
export const SIMPLE_FORMAT = 'ficha-viva/simples-1';

export interface SimpleSheet {
  formato: string;
  nome: string;
  genero?: 'masc' | 'fem' | string;
  idade?: string | number;
  conceito?: string;
  tendencia?: string;
  raca: string;
  subraca?: string | null;
  /** Bônus racial à escolha (Meio-Elfo: 2 atributos). */
  bonusRacialEscolhido?: string[];
  classe: string;
  subclasse?: string | null;
  nivel?: number;
  antecedente: string;
  /** Atributos BASE (antes do bônus racial): for, des, con, int, sab, car. */
  atributos: Record<string, number>;
  pericias?: string[];
  especializacoes?: string[];
  idiomas?: string[];
  talentos?: string[];
  aumentosDeAtributo?: Record<string, number>;
  /** Truques + magias que o herói conhece/prepara. */
  magias?: string[];
  /** Só Mago: magias do grimório (as preparadas saem dele). */
  grimorio?: string[];
  aparencia?: string;
  personalidade?: string;
  ideais?: string;
  vinculos?: string;
  defeitos?: string;
  historia?: string;
}

export const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
];

export function isSimpleSheet(x: unknown): x is SimpleSheet {
  return !!x && typeof x === 'object' && typeof (x as SimpleSheet).formato === 'string' && (x as SimpleSheet).formato.startsWith('ficha-viva/simples');
}

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Acha pelo id ou pelo nome (sem acento, sem maiúscula). */
function find<T>(list: T[], input: unknown, id: (t: T) => string, label: (t: T) => string): T | undefined {
  const q = norm(input);
  if (!q) return undefined;
  return list.find((t) => norm(id(t)) === q) ?? list.find((t) => norm(label(t)) === q);
}

const ABILITY_ALIASES: Record<string, AbilityKey> = {
  for: 'str', forca: 'str', str: 'str', strength: 'str',
  des: 'dex', destreza: 'dex', dex: 'dex', dexterity: 'dex',
  con: 'con', constituicao: 'con', constitution: 'con',
  int: 'int', inteligencia: 'int', intelligence: 'int',
  sab: 'wis', sabedoria: 'wis', wis: 'wis', wisdom: 'wis',
  car: 'cha', carisma: 'cha', cha: 'cha', charisma: 'cha',
};
const abilityKey = (s: string): AbilityKey | undefined => ABILITY_ALIASES[norm(s).replace(/ /g, '')];

export interface SimpleImportResult {
  char: Character;
  /** O que não reconheci ou que fugiu da regra (o herói é criado mesmo assim). */
  warnings: string[];
}

export function fromSimpleSheet(s: SimpleSheet, ownerId: string): SimpleImportResult {
  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);

  // ---- raça, classe, antecedente ----
  const race = find(RACES, s.raca, (r) => r.id, (r) => r.label);
  if (!race) warn(`Raça "${s.raca}" não encontrada — usei Humano.`);
  const cls = find(CLASSES, s.classe, (c) => c.id, (c) => c.label);
  if (!cls) warn(`Classe "${s.classe}" não encontrada — usei Guerreiro.`);
  const bg = find(BACKGROUNDS, s.antecedente, (b) => b.id, (b) => b.label);
  if (!bg) warn(`Antecedente "${s.antecedente}" não encontrado — usei Soldado.`);

  const c = createDraftCharacter({ ownerId, raceId: race?.id ?? 'human', classId: cls?.id ?? 'fighter', backgroundId: bg?.id ?? 'soldier' });

  // ---- identidade ----
  c.name = String(s.nome ?? '').trim().slice(0, 80) || 'Herói Sem Nome';
  c.gender = norm(s.genero).startsWith('f') ? 'fem' : 'masc';
  c.age = s.idade != null ? String(s.idade) : '';
  c.concept = String(s.conceito ?? '').trim();
  const al = ALIGNMENTS.find((a) => norm(a) === norm(s.tendencia));
  if (al) c.alignment = al;
  else if (s.tendencia) warn(`Tendência "${s.tendencia}" fora da lista — ficou "${c.alignment}".`);

  // ---- sub-raça ----
  const subs = getSubraces(c.raceId);
  if (subs.length) {
    const sub = find(subs, s.subraca, (x) => x.id, (x) => x.label);
    if (sub) c.subraceId = sub.id;
    else warn(`${s.subraca ? `Sub-raça "${s.subraca}" não encontrada` : 'Sub-raça não informada'} — usei ${subs.find((x) => x.id === c.subraceId)?.label ?? subs[0].label}.`);
  } else c.subraceId = null;

  // ---- bônus racial à escolha (Meio-Elfo) ----
  const raceDef = race ?? RACES.find((r) => r.id === 'human')!;
  if (raceDef.abilityChoice) {
    const picks = (s.bonusRacialEscolhido ?? []).map(abilityKey).filter((k): k is AbilityKey => !!k && !raceDef.abilityChoice!.exclude?.includes(k));
    const uniq = Array.from(new Set(picks)).slice(0, raceDef.abilityChoice.count);
    if (uniq.length === raceDef.abilityChoice.count) c.raceAbilityChoice = uniq;
    else {
      c.raceAbilityChoice = raceDef.abilityChoice.default;
      warn(`${raceDef.label}: escolha ${raceDef.abilityChoice.count} atributos para o bônus racial — usei o padrão.`);
    }
  }

  // ---- nível e subclasse ----
  const level = Math.max(1, Math.min(20, Math.round(Number(s.nivel) || 1)));
  c.level = level;
  c.classLevels = [{ classId: c.classId, level }];
  const subcls = s.subclasse ? find(subclassesFor(c.classId), s.subclasse, (x) => x.id, (x) => x.label) : undefined;
  if (subcls) {
    const at = subclassLevelFor(c.classId);
    if (level < at) warn(`${subcls.label} só entra no nível ${at} — a subclasse fica para quando subir.`);
    else c.subclassId = subcls.id;
  } else if (s.subclasse) warn(`Subclasse "${s.subclasse}" não encontrada para ${getClass(c.classId).label}.`);

  // ---- atributos base ----
  const base = {} as AbilityScores;
  for (const k of ABILITY_KEYS) base[k] = 10;
  for (const [key, v] of Object.entries(s.atributos ?? {})) {
    const k = abilityKey(key);
    if (!k) continue;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) continue;
    if (n < 3 || n > 20) warn(`${key.toUpperCase()} ${n} fora de 3–20 — ajustei.`);
    base[k] = Math.max(3, Math.min(20, n));
  }
  c.baseAbilities = base;
  const vals = ABILITY_KEYS.map((k) => base[k]).sort((a, b) => b - a);
  const isArray = vals.join() === '15,14,13,12,10,8';
  const cost = (v: number) => (v <= 13 ? v - 8 : v === 14 ? 7 : 9);
  const pointBuy = vals.every((v) => v >= 8 && v <= 15) ? vals.reduce((a, v) => a + cost(v), 0) : -1;
  if (!isArray && pointBuy !== 27 && vals.some((v) => v > 15)) warn('Atributos acima de 15 antes do bônus racial: só valem se foram rolados nos dados.');

  // ---- aumentos de atributo e talentos (níveis 4, 8…) ----
  for (const [key, v] of Object.entries(s.aumentosDeAtributo ?? {})) {
    const k = abilityKey(key);
    const n = Math.round(Number(v));
    if (k && n > 0) c.asiBonuses[k] = (c.asiBonuses[k] ?? 0) + n;
  }
  for (const t of s.talentos ?? []) {
    const f = find(FEATS, t, (x) => x.id, (x) => x.label);
    if (f) c.feats.push(f.id);
    else warn(`Talento "${t}" não encontrado.`);
  }

  const asiSlots = asiLevelsFor(c.classId).filter((l) => l <= level).length;
  const asiUsed = Object.values(c.asiBonuses).reduce((a, v) => a + (v ?? 0), 0) / 2 + c.feats.length;
  if (asiUsed > asiSlots) warn(`Aumentos/talentos demais para o nível ${level}: são ${asiSlots} (cada um = +2 em atributos ou 1 talento).`);
  else if (asiUsed < asiSlots) warn(`Sobrou ${asiSlots - asiUsed} aumento de atributo/talento do nível ${level} — escolha na aba Evoluir.`);

  // ---- perícias (as do antecedente e da raça entram sozinhas) ----
  const skillKey = (x: string): SkillKey | undefined => find(SKILLS, x, (k) => k.key, (k) => k.label)?.key;
  for (const p of s.pericias ?? []) {
    const k = skillKey(p);
    if (k) c.skillProfs.push(k);
    else warn(`Perícia "${p}" não encontrada.`);
  }
  c.skillProfs = Array.from(new Set(c.skillProfs));
  const b = skillBudget(c);
  // tira as que já vêm de graça (antecedente/raça) e avisa se passou da cota
  c.skillProfs = c.skillProfs.filter((k) => !b.granted.has(k));
  const after = skillBudget(c);
  if (after.classLeft < 0 || after.freeLeft < 0) warn(`Perícias demais: a classe dá ${after.classTotal}${after.freeTotal ? ` (+${after.freeTotal} livres)` : ''} além das do antecedente/raça.`);
  else if (after.classLeft > 0) warn(`Faltou escolher ${after.classLeft} perícia(s) da lista de ${getClass(c.classId).label} — escolha na ficha.`);
  for (const p of s.especializacoes ?? []) {
    const k = skillKey(p);
    if (k) c.skillExpertise.push(k);
  }

  // ---- idiomas à escolha ----
  const fixed = languagePicks(c).fixed;
  c.extraLanguages = Array.from(new Set((s.idiomas ?? []).map((l) => String(l).trim()).filter((l) => l && !fixed.some((f) => norm(f) === norm(l)))));
  const lp = languagePicks(c);
  if (c.extraLanguages.length > lp.total) warn(`Idiomas demais: são ${lp.total} à escolha além de ${fixed.join(', ')}.`);

  // ---- magias ----
  const spellId = (x: string) => find(SPELLS, x, (sp) => sp.id, (sp) => sp.name)?.id;
  const ids = (list?: string[]) =>
    (list ?? []).flatMap((x) => {
      const id = spellId(x);
      if (!id) warn(`Magia "${x}" não encontrada.`);
      return id ? [id] : [];
    });
  const spells = Array.from(new Set(ids(s.magias)));
  if (spells.length && !getClass(c.classId).spellcasting) warn(`${getClass(c.classId).label} não conjura magias (as magias foram ignoradas).`);
  else if (spells.length) {
    const offList = spells.filter((id) => !(getSpell(id)?.classes ?? []).includes(c.classId as never));
    if (offList.length) warn(`Fora da lista de ${getClass(c.classId).label}: ${offList.map((id) => getSpell(id)?.name).join(', ')} (só valem se a subclasse der).`);
    const maxCircle = Math.max(0, ...Object.keys(buildSpellSlots(c.classId, level)).map(Number));
    const tooHigh = spells.filter((id) => (getSpell(id)?.level ?? 0) > maxCircle);
    if (tooHigh.length) warn(`Círculo alto demais para o nível ${level} (máx. ${maxCircle}º): ${tooHigh.map((id) => getSpell(id)?.name).join(', ')}.`);
    const cantrips = spells.filter((id) => getSpell(id)?.level === 0).length;
    const maxCantrips = cantripsKnown(c.classId, level);
    if (cantrips > maxCantrips) warn(`Truques demais: ${getClass(c.classId).label} conhece ${maxCantrips} no nível ${level}.`);
    c.preparedSpells = spells;
    if (c.classId === 'wizard') c.knownSpells = Array.from(new Set([...ids(s.grimorio), ...spells.filter((id) => (getSpell(id)?.level ?? 0) >= 1)]));
  }

  // ---- história (vai para as Notas da ficha) ----
  const sections: [string, string | undefined][] = [
    ['Aparência', s.aparencia],
    ['Personalidade', s.personalidade],
    ['Ideais', s.ideais],
    ['Vínculos', s.vinculos],
    ['Defeitos', s.defeitos],
    ['História', s.historia],
  ];
  c.notes = sections.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${k}: ${String(v).trim()}`).join('\n\n');

  // ---- monta como o "Despertar" da criação ----
  const char = finalizeCharacter(c);
  char.hpCurrent = deriveCharacter(char).maxHp;
  return { char, warnings };
}
