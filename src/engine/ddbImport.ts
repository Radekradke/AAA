import type { Character, InventoryItem } from '@/types/character';
import type { AbilityKey, CasterClass, Feat, Rarity, Spell } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { CLASSES } from '@/data/classes';
import { BACKGROUNDS } from '@/data/backgrounds';
import { FEATS, registerFeat } from '@/data/feats';
import { SPELLS, registerSpell } from '@/data/spells';
import { getItem } from '@/data/items';
import { ARMOR_EN, DRAGON_EN, enKey, FEAT_EN, LANGUAGE_EN, RACE_EN, SCHOOL_EN, SPELL_EN, SUBCLASS_EN } from '@/data/ddbNames';
import { ALIGNMENTS, fromSimpleSheet, SIMPLE_FORMAT, type SimpleSheet } from './simpleSheet';
import { customInventoryItem, itemToInventory, placeInSlots } from './inventory';
import { finalizeFeat, finalizeSpell } from './homebrewContent';
import { deriveCharacter } from './dndRules';

/**
 * Importar do D&D Beyond: o JSON público do personagem (o mesmo que o site
 * usa) vira uma "ficha simples" com os ids da Ficha Viva, montada pelas
 * regras da criação. O que o app não tem vira homebrew (magia, talento) ou
 * item criado; o resto vira aviso antes de confirmar. Integração não oficial.
 */

/* ---------- formato (parcial) do D&D Beyond ---------- */
interface DdbModifier { type?: string; subType?: string; friendlySubtypeName?: string; value?: number | null }
interface DdbSpellDef {
  name: string;
  level: number;
  school?: string;
  concentration?: boolean;
  ritual?: boolean;
  components?: number[];
  componentsDescription?: string;
  range?: { origin?: string; rangeValue?: number | null };
  duration?: { durationInterval?: number; durationUnit?: string | null; durationType?: string };
  description?: string;
  snippet?: string;
}
interface DdbClassSpell { prepared?: boolean; alwaysPrepared?: boolean; countsAsKnownSpell?: boolean; definition?: DdbSpellDef }
export interface DdbCharacter {
  id?: number;
  name?: string;
  gender?: string | null;
  age?: number | null;
  alignmentId?: number | null;
  race?: { fullName?: string; baseRaceName?: string; baseName?: string; isHomebrew?: boolean };
  classes?: { level: number; isStartingClass?: boolean; definition?: { name?: string }; subclassDefinition?: { name?: string } | null }[];
  background?: { definition?: { name?: string } | null; customBackground?: { name?: string } | null } | null;
  stats?: { id: number; value: number | null }[];
  overrideStats?: { id: number; value: number | null }[];
  baseHitPoints?: number;
  removedHitPoints?: number;
  temporaryHitPoints?: number;
  modifiers?: Record<string, DdbModifier[] | undefined>;
  feats?: { definition?: { name?: string; description?: string; snippet?: string } }[];
  classSpells?: { spells?: DdbClassSpell[] }[];
  inventory?: { quantity?: number; equipped?: boolean; isAttuned?: boolean; definition?: { name?: string; type?: string; filterType?: string; magic?: boolean; rarity?: string; weight?: number; canAttune?: boolean; armorTypeId?: number | null } }[];
  currencies?: { cp?: number; sp?: number; ep?: number; gp?: number; pp?: number };
  traits?: { personalityTraits?: string | null; ideals?: string | null; bonds?: string | null; flaws?: string | null; appearance?: string | null };
  notes?: { backstory?: string | null };
  choices?: { race?: { optionValue?: number; label?: string | null }[] };
  options?: { race?: { definition?: { name?: string } }[] };
}

/** Link do personagem → id numérico (aceita /characters/123, /profile/x/characters/123 e o id puro). */
export function ddbIdFromUrl(input: string): string | null {
  const s = String(input ?? '').trim();
  if (/^\d{3,12}$/.test(s)) return s;
  const m = s.match(/^https?:\/\/(?:www\.)?dndbeyond\.com\/(?:profile\/[^/]+\/)?characters\/(\d{3,12})(?:[/?#]|$)/i);
  return m ? m[1] : null;
}

const ABILITY_BY_ID: Record<number, AbilityKey> = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
const SCORE_SUBTYPE: Record<string, AbilityKey> = {
  'strength-score': 'str', 'dexterity-score': 'dex', 'constitution-score': 'con', 'intelligence-score': 'int', 'wisdom-score': 'wis', 'charisma-score': 'cha',
};
const SKILL_SUBTYPE: Record<string, string> = {
  acrobatics: 'acrobatics', 'animal-handling': 'animalHandling', arcana: 'arcana', athletics: 'athletics', deception: 'deception', history: 'history',
  insight: 'insight', intimidation: 'intimidation', investigation: 'investigation', medicine: 'medicine', nature: 'nature', perception: 'perception',
  performance: 'performance', persuasion: 'persuasion', religion: 'religion', 'sleight-of-hand': 'sleightOfHand', stealth: 'stealth', survival: 'survival',
};
const RARITY: Record<string, Rarity> = { common: 'comum', uncommon: 'incomum', rare: 'raro', 'very rare': 'muito-raro', legendary: 'lendario', artifact: 'lendario' };

const stripHtml = (s: string | null | undefined) =>
  String(s ?? '')
    .replace(/<br\s*\/?>|<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* ---------- magias: pelo nome em inglês ---------- */
const STOP = new Set(['of', 'the', 'and', 'or', 'from', 'with', 'to', 'into', 'a']);
const tokens = (s: string) => enKey(s).split(' ').filter((t) => t && !STOP.has(t));
const SPELL_INDEX = () =>
  SPELLS.filter((s) => /^(phb|xge|tce)-/.test(s.id)).map((s) => ({ id: s.id, t: s.id.replace(/^(phb|xge|tce)-/, '').split('-').filter((t) => !STOP.has(t)) }));

/** Acha a magia do app pelo nome em inglês (tabela para as antigas; id para as do livro). */
export function spellIdFromEnglish(name: string): string | null {
  const direct = SPELL_EN[enKey(name)];
  if (direct) return direct;
  const full = tokens(name);
  // "Mordenkainen's Sword" mantém o nome; "Leomund's Tiny Hut" não: testa com e sem o dono
  const owner = /^[a-z-]+['’]s\s/i.test(name) ? full.slice(1) : null;
  const variants = [full, ...(owner ? [owner] : [])];
  const index = SPELL_INDEX();
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i]);
  for (const v of variants) {
    const hit = index.find((s) => same(s.t, v));
    if (hit) return hit.id;
  }
  // abreviações do app: "prot-evil-good" ↔ "protection from evil and good"
  for (const v of variants) {
    const hits = index.filter((s) => s.t.length === v.length && s.t.every((t, i) => t.length >= 3 && v[i].startsWith(t)));
    if (hits.length === 1) return hits[0].id;
  }
  // nome mais longo no livro: "conjure-woodland" ↔ "conjure woodland beings"
  for (const v of variants) {
    const hits = index.filter((s) => s.t.length >= 2 && s.t.length < v.length && s.t.every((t, i) => t === v[i]));
    if (hits.length === 1) return hits[0].id;
  }
  return null;
}

/** Magia que o app não tem: vira homebrew com o que o D&D Beyond diz dela. */
export function spellFromDdb(def: DdbSpellDef, classId: string): Spell {
  const comps = (def.components ?? []).map((c) => ({ 1: 'V', 2: 'S', 3: 'M' } as Record<number, string>)[c]).filter(Boolean);
  const range = def.range?.rangeValue ? `${String(Math.round(def.range.rangeValue * 0.3 * 10) / 10).replace('.', ',')} m` : def.range?.origin === 'Self' ? 'Pessoal' : def.range?.origin === 'Touch' ? 'Toque' : undefined;
  const d = def.duration;
  const unit: Record<string, string> = { Round: 'rodada', Minute: 'min', Hour: 'hora', Day: 'dia' };
  const duration = d?.durationType === 'Instantaneous' ? 'Instantânea' : d?.durationInterval && d.durationUnit ? `${def.concentration ? 'Concentração, até ' : ''}${d.durationInterval} ${unit[d.durationUnit] ?? d.durationUnit}` : undefined;
  return finalizeSpell({
    id: '',
    name: def.name,
    level: Math.max(0, Math.min(9, def.level ?? 0)),
    school: SCHOOL_EN[enKey(def.school ?? '')] ?? def.school ?? 'Evocação',
    components: comps.join(', ') || undefined,
    material: def.componentsDescription || undefined,
    range,
    duration,
    concentration: !!def.concentration,
    ritual: !!def.ritual,
    classes: [classId as CasterClass],
    desc: `${stripHtml(def.snippet || def.description).slice(0, 1150)}${'\n'}(Importada do D&D Beyond.)`,
    homebrew: true,
    source: 'Homebrew',
  });
}

/* ---------- itens ---------- */
/** "Crossbow, Light" → "lightcrossbow"; "Chain Mail" → "chainmail". */
const itemKey = (name: string) => {
  const [a, b] = name.split(',').map((x) => x.trim());
  return enKey(b ? `${b} ${a}` : a).replace(/ /g, '');
};
export function itemIdFromEnglish(name: string): string | null {
  const k = itemKey(name);
  for (const id of [ARMOR_EN[k], `w-${k}`, `a-${k}`]) if (id && getItem(id)) return id;
  return null;
}

export interface DdbImport {
  char: Character;
  warnings: string[];
  /** Resumo para a tela antes de confirmar. */
  summary: { name: string; race: string; classes: string; level: number };
}

const mods = (d: DdbCharacter) => Object.values(d.modifiers ?? {}).flatMap((m) => m ?? []);

/** Converte o JSON do D&D Beyond num herói da Ficha Viva (sem salvar). */
export function ddbToCharacter(d: DdbCharacter, ownerId: string): DdbImport {
  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);

  // ---- classe (multiclasse: a principal entra; as outras viram aviso) ----
  const classes = (d.classes ?? []).filter((c) => c.level > 0);
  const main = [...classes].sort((a, b) => Number(!!b.isStartingClass) - Number(!!a.isStartingClass) || b.level - a.level)[0];
  const mainId = CLASSES.find((c) => c.id === enKey(main?.definition?.name ?? '').replace(/ /g, ''))?.id;
  const level = Math.max(1, Math.min(20, classes.reduce((n, c) => n + c.level, 0) || 1));
  if (!mainId) warn(`Classe "${main?.definition?.name ?? '?'}" não existe no app — usei Guerreiro.`);
  const others = classes.filter((c) => c !== main);
  if (others.length) warn(`Multiclasse: entrou ${main?.definition?.name} nível ${level} (todos os níveis). ${others.map((c) => `${c.definition?.name} ${c.level}`).join(', ')} ficou de fora — refaça pela aba Evoluir se quiser.`);
  const subName = main?.subclassDefinition?.name;
  const subclassId = subName ? SUBCLASS_EN[enKey(subName)] : undefined;
  if (subName && !subclassId) warn(`Subclasse "${subName}" não existe no app.`);

  // ---- raça ----
  const raceName = d.race?.fullName ?? d.race?.baseName ?? '';
  const race = RACE_EN[enKey(raceName)] ?? RACE_EN[enKey(d.race?.baseRaceName ?? '')];
  if (!race) warn(`Raça "${raceName}" não existe no app — usei Humano. Crie a raça como homebrew se quiser.`);
  let subraceId = race?.subraceId;
  if (race?.raceId === 'dragonborn') {
    const label = [...(d.choices?.race ?? []).map((c) => c.label ?? ''), ...(d.options?.race ?? []).map((o) => o.definition?.name ?? '')].join(' ').toLowerCase();
    const color = Object.keys(DRAGON_EN).find((c) => label.includes(c));
    subraceId = color ? DRAGON_EN[color] : undefined;
    if (!color) warn('Draconato: escolha a ancestralidade dracônica na ficha.');
  }
  const all = mods(d);
  const raceMods = d.modifiers?.race ?? [];
  const racialPicks = raceMods.filter((m) => m.type === 'bonus' && m.subType && SCORE_SUBTYPE[m.subType]).map((m) => SCORE_SUBTYPE[m.subType!]);

  // ---- atributos: base do D&D Beyond (sem raça); aumentos de classe e talento à parte ----
  const atributos: Record<string, number> = {};
  for (const s of d.stats ?? []) if (ABILITY_BY_ID[s.id] && s.value) atributos[ABILITY_BY_ID[s.id]] = s.value;
  for (const s of d.overrideStats ?? []) {
    if (ABILITY_BY_ID[s.id] && s.value) {
      atributos[ABILITY_BY_ID[s.id]] = s.value;
      warn(`${ABILITY_BY_ID[s.id].toUpperCase()} estava fixado à mão no D&D Beyond (${s.value}).`);
    }
  }
  const asi: Record<string, number> = {};
  for (const m of [...(d.modifiers?.class ?? []), ...(d.modifiers?.feat ?? [])]) {
    const k = m.type === 'bonus' && m.subType ? SCORE_SUBTYPE[m.subType] : undefined;
    if (k && m.value) asi[k] = (asi[k] ?? 0) + m.value;
  }

  // ---- perícias, especializações e idiomas ----
  const skills = new Set<string>();
  const expertise = new Set<string>();
  const languages = new Set<string>();
  for (const m of all) {
    const sk = m.subType ? SKILL_SUBTYPE[m.subType] : undefined;
    if (m.type === 'proficiency' && sk) skills.add(sk);
    if (m.type === 'expertise' && sk) expertise.add(sk);
    if (m.type === 'language' && m.subType && !/thieves|druidic/.test(m.subType)) languages.add(LANGUAGE_EN[enKey(m.friendlySubtypeName ?? m.subType)] ?? m.friendlySubtypeName ?? m.subType);
  }

  // ---- antecedente ----
  const bgName = d.background?.definition?.name ?? d.background?.customBackground?.name ?? '';
  const bg = BACKGROUNDS.find((b) => b.id === enKey(bgName).replace(/ /g, '-'));
  if (!bg) warn(`Antecedente "${bgName || 'personalizado'}" não existe no app — usei Soldado.`);

  // ---- talentos (o que falta vira homebrew) ----
  const feats: string[] = [];
  const customFeats: Feat[] = [];
  for (const f of d.feats ?? []) {
    const name = f.definition?.name ?? '';
    if (!name) continue;
    const id = FEAT_EN[enKey(name)] ?? FEATS.find((x) => x.id === enKey(name).replace(/ /g, '-') && !x.homebrew)?.id;
    if (id) feats.push(id);
    else {
      const hb = finalizeFeat({ id: '', label: name, desc: `${stripHtml(f.definition?.snippet || f.definition?.description).slice(0, 850) || name}\n(Importado do D&D Beyond.)`, source: 'Homebrew', homebrew: true });
      registerFeat(hb);
      customFeats.push(hb);
      feats.push(hb.id);
      warn(`Talento "${name}" não existe no app: entrou como homebrew (a ficha não soma os bônus dele sozinha).`);
    }
  }

  // ---- magias da classe principal ----
  const classId = mainId ?? 'fighter';
  const list = (d.classSpells ?? []).flatMap((c) => c.spells ?? []).filter((s) => s.definition?.name);
  const customSpells: Spell[] = [];
  const toId = (def: DdbSpellDef) => {
    const id = spellIdFromEnglish(def.name);
    if (id) return id;
    const hb = customSpells.find((s) => s.name === def.name) ?? spellFromDdb(def, classId);
    if (!customSpells.includes(hb)) {
      registerSpell(hb);
      customSpells.push(hb);
    }
    return hb.id;
  };
  // domínio/juramento/círculo o app já dá sozinho: não ocupam espaço de preparada
  const chosen = list.filter((s) => !s.alwaysPrepared);
  const magias = classId === 'wizard'
    ? chosen.filter((s) => s.definition!.level === 0 || s.prepared).map((s) => toId(s.definition!))
    : chosen.map((s) => toId(s.definition!));
  const grimorio = classId === 'wizard' ? chosen.filter((s) => s.definition!.level > 0).map((s) => toId(s.definition!)) : undefined;
  if (customSpells.length) warn(`${customSpells.length === 1 ? 'Magia' : 'Magias'} fora do livro do app, ${customSpells.length === 1 ? 'importada' : 'importadas'} como homebrew: ${customSpells.map((s) => s.name).join(', ')}.`);

  const t = d.traits ?? {};
  const simple: SimpleSheet = {
    formato: SIMPLE_FORMAT,
    nome: d.name ?? '',
    genero: /^f/i.test(d.gender ?? '') ? 'fem' : 'masc',
    idade: d.age ?? undefined,
    tendencia: d.alignmentId && ALIGNMENTS[d.alignmentId - 1] ? ALIGNMENTS[d.alignmentId - 1] : undefined,
    raca: race?.raceId ?? 'human',
    subraca: subraceId ?? null,
    bonusRacialEscolhido: race?.raceId === 'half-elf' ? racialPicks.filter((k) => k !== 'cha') : undefined,
    classe: classId,
    subclasse: subclassId ?? null,
    nivel: level,
    antecedente: bg?.id ?? 'soldier',
    atributos,
    pericias: [...skills],
    especializacoes: [...expertise],
    idiomas: [...languages],
    talentos: feats,
    aumentosDeAtributo: asi,
    magias,
    grimorio,
    aparencia: stripHtml(t.appearance) || undefined,
    personalidade: stripHtml(t.personalityTraits) || undefined,
    ideais: stripHtml(t.ideals) || undefined,
    vinculos: stripHtml(t.bonds) || undefined,
    defeitos: stripHtml(t.flaws) || undefined,
    historia: stripHtml(d.notes?.backstory) || undefined,
  };
  const built = fromSimpleSheet(simple, ownerId);
  const char = built.char;
  // avisos de "faltou escolher" da ficha simples que o D&D Beyond já resolveu de outro jeito ficam como estão: o jogador confere
  warnings.push(...built.warnings);
  if (customSpells.length) char.customSpells = customSpells;
  if (customFeats.length) char.customFeats = customFeats;

  // ---- inventário do D&D Beyond no lugar do kit inicial ----
  const inv: InventoryItem[] = [];
  const unknown: string[] = [];
  for (const it of d.inventory ?? []) {
    const def = it.definition;
    if (!def?.name) continue;
    const qty = Math.max(1, Math.round(it.quantity ?? 1));
    const known = itemIdFromEnglish(def.name);
    const entry = known
      ? itemToInventory(getItem(known)!, qty)
      : customInventoryItem({
          name: def.name,
          // sem números do catálogo, entra como objeto (não vira ataque nem CA errados)
          category: 'gear',
          quantity: qty,
          weight: Math.round((def.weight ?? 0) * 0.45 * 100) / 100,
          rarity: def.magic ? RARITY[enKey(def.rarity ?? '')] ?? 'incomum' : 'comum',
          attunement: def.canAttune || undefined,
          note: [def.filterType && def.filterType !== 'Other Gear' ? def.filterType : '', def.magic ? 'item mágico do D&D Beyond: confira os efeitos com o mestre' : ''].filter(Boolean).join(' · '),
        });
    if (!known) entry.homebrew = true;
    if (!known) unknown.push(def.name);
    if (it.isAttuned) entry.attuned = true;
    inv.push(entry);
    if (it.equipped && known) {
      const placed = placeInSlots({ ...char, inventory: inv }, entry);
      char.equipped = placed.equipped;
    }
  }
  if ((d.inventory ?? []).length) {
    char.inventory = inv;
    // o kit inicial saiu: nada equipado que não seja do D&D Beyond
    const mine = (uid: string | null) => (uid && inv.some((i) => i.uid === uid) ? uid : null);
    const e = char.equipped;
    char.equipped = { armor: mine(e.armor), shield: mine(e.shield), mainHand: mine(e.mainHand), offHand: mine(e.offHand), ranged: mine(e.ranged) };
  }
  if (unknown.length) warn(`${unknown.length} ${unknown.length === 1 ? 'item entrou' : 'itens entraram'} como item criado (sem números do catálogo): ${unknown.slice(0, 8).join(', ')}${unknown.length > 8 ? '…' : ''}.`);

  // ---- moedas e PV ----
  const cur = d.currencies ?? {};
  char.coins = { cp: cur.cp ?? 0, sp: cur.sp ?? 0, ep: cur.ep ?? 0, gp: cur.gp ?? 0, pp: cur.pp ?? 0 };
  const derived = deriveCharacter(char);
  char.hpCurrent = Math.max(0, derived.maxHp - Math.max(0, d.removedHitPoints ?? 0));
  if (d.temporaryHitPoints) char.combat.hpTemp = d.temporaryHitPoints;
  if (d.baseHitPoints) {
    const ddbMax = d.baseHitPoints + derived.abilities.con.mod * level;
    if (Math.abs(ddbMax - derived.maxHp) > 2) warn(`PV máximo: o D&D Beyond dizia ${ddbMax}; a ficha usa a média por nível (${derived.maxHp}). Ajuste na aba Evoluir se rolou os PV.`);
  }
  if (!ABILITY_KEYS.every((k) => atributos[k])) warn('Alguns atributos não vieram: confira na ficha.');

  return {
    char,
    warnings: Array.from(new Set(warnings)),
    summary: {
      name: char.name,
      race: raceName || 'Humano',
      classes: classes.map((c) => `${c.definition?.name ?? '?'} ${c.level}`).join(' / ') || '—',
      level,
    },
  };
}
