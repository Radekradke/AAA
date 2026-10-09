import type { AbilityKey, ArmorData, MagicEffects, Rarity, SkillKey, Spell, WeaponData } from '@/types/dnd';
import type { Breakdown } from '@/engine/effects';
import { breakdownBody } from '@/engine/effects';
import { ABILITY_LABELS, ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { getCondition } from '@/data/conditions';
import type { SpellAutomation } from '@/engine/spellAutomation';
import { spellAutomation } from '@/engine/spellAutomation';
import { itemDescription } from '@/data/itemDescriptions';
import { itemTags } from '@/engine/itemTags';

export interface LoreInfo {
  title: string;
  subtitle?: string;
  body: string;
  tags?: string[];
  /** Arte (item com imagem): aparece como carta ao lado do texto. */
  art?: { src: string; rarity: string };
  /** Cor do nome (raridade do item, como no BG3). */
  titleColor?: string;
  /** Número em destaque: dano da arma, CA da armadura, cura da poção. */
  headline?: { value: string; label?: string };
  /** Propriedades e efeitos, uma por linha (Versátil, Acuidade, +1 CA…). */
  props?: string[];
  /** Rodapé discreto: peso e preço. */
  footer?: string[];
  /** Magias: o que a ficha aplica, o que só rola e o que fica com a mesa. */
  automation?: SpellAutomation;
  /** Descrição imersiva do item (em itálico, antes das regras). */
  flavor?: string;
}

export const ABILITY_LORE: Record<AbilityKey, LoreInfo> = {
  str: {
    title: 'Força',
    subtitle: 'Atributo físico',
    body: 'Mede potência corporal, empurrões, saltos, escaladas, agarrões e ataques com muitas armas corpo a corpo.',
    tags: ['FOR', 'Atletismo', 'Dano corpo a corpo'],
  },
  dex: {
    title: 'Destreza',
    subtitle: 'Atributo físico',
    body: 'Representa reflexos, equilíbrio, furtividade, pontaria, iniciativa e defesa quando a armadura permite usar agilidade.',
    tags: ['DES', 'Iniciativa', 'CA'],
  },
  con: {
    title: 'Constituição',
    subtitle: 'Atributo físico',
    body: 'Define vigor, resistência a venenos, concentração sob pressão e pontos de vida máximos ao longo dos níveis.',
    tags: ['CON', 'PV', 'Resistência'],
  },
  int: {
    title: 'Inteligência',
    subtitle: 'Atributo mental',
    body: 'Cobre estudo, memória, lógica, investigação, arcanismo, história e a conjuração de classes como Mago.',
    tags: ['INT', 'Conhecimento', 'Mago'],
  },
  wis: {
    title: 'Sabedoria',
    subtitle: 'Atributo mental',
    body: 'Mede percepção, instinto, leitura de pessoas, sobrevivência, medicina e a conjuração de Clérigos, Druidas e Patrulheiros.',
    tags: ['SAB', 'Percepção', 'Instinto'],
  },
  cha: {
    title: 'Carisma',
    subtitle: 'Atributo social',
    body: 'Representa presença, força de personalidade, persuasão, intimidação, blefe e a conjuração de Bardos, Bruxos, Feiticeiros e Paladinos.',
    tags: ['CAR', 'Social', 'Conjuração'],
  },
};

/** O que cada perícia cobre, numa frase. */
export function skillDescription(key: SkillKey): string {
  return SKILL_LORE[key];
}

const SKILL_LORE: Record<SkillKey, string> = {
  acrobatics: 'Usada para equilíbrio, piruetas, escapar de quedas, atravessar superfícies estreitas e movimentos ágeis.',
  animalHandling: 'Ajuda a acalmar, conduzir, entender ou controlar animais e montarias em cenas tensas.',
  arcana: 'Conhecimento sobre magia, símbolos arcanos, planos, criaturas mágicas e fenômenos sobrenaturais.',
  athletics: 'Usada para correr, nadar, escalar, saltar, empurrar, puxar e resistir fisicamente.',
  deception: 'Serve para mentir, blefar, disfarçar intenções e sustentar uma história falsa.',
  history: 'Conhecimento sobre reinos, guerras, famílias nobres, ruínas, lendas e eventos antigos.',
  insight: 'Ajuda a perceber mentiras, intenções, medo, hesitação e emoções por trás das palavras.',
  intimidation: 'Usada para pressionar, ameaçar, impor presença e fazer alguém recuar pelo medo.',
  investigation: 'Serve para analisar pistas, deduzir padrões, encontrar detalhes escondidos e resolver enigmas.',
  medicine: 'Usada para estabilizar feridos, reconhecer doenças, entender sintomas e tratar emergências.',
  nature: 'Conhecimento sobre plantas, terreno, clima, criaturas naturais e ciclos do mundo selvagem.',
  perception: 'Serve para notar sons, movimentos, armadilhas, emboscadas e detalhes antes que seja tarde.',
  performance: 'Usada para música, dança, atuação, discursos dramáticos e chamar atenção de uma plateia.',
  persuasion: 'Serve para convencer, negociar, inspirar confiança e resolver conflitos pela palavra.',
  religion: 'Conhecimento sobre deuses, cultos, rituais, mortos-vivos, símbolos sagrados e dogmas.',
  sleightOfHand: 'Usada para truques manuais, esconder objetos, furtar bolsos e manipular algo sem ser visto.',
  stealth: 'Serve para se mover em silêncio, esconder-se, evitar patrulhas e preparar emboscadas.',
  survival: 'Usada para rastrear, caçar, orientar-se, prever clima e sobreviver longe da civilização.',
};

export function abilityLore(key: AbilityKey, total?: number, mod?: number): LoreInfo {
  const base = ABILITY_LORE[key];
  return {
    ...base,
    subtitle: typeof total === 'number' && typeof mod === 'number'
      ? `${base.subtitle} · valor ${total} · mod ${mod >= 0 ? '+' : ''}${mod}`
      : base.subtitle,
  };
}

export function savingThrowLore(key: AbilityKey, bonus: number, proficient: boolean): LoreInfo {
  return {
    title: `Resistência de ${ABILITY_LABELS[key]}`,
    subtitle: `${ABILITY_SHORT[key]} · ${bonus >= 0 ? '+' : ''}${bonus}`,
    body: 'Teste defensivo pedido pelo mestre quando seu personagem tenta resistir a magia, veneno, medo, impacto ou outro efeito perigoso.',
    tags: [proficient ? 'Proficiente' : 'Sem proficiência', 'Defesa'],
  };
}

export function skillLore(key: SkillKey, bonus: number, proficient: boolean, expertise = false): LoreInfo {
  const skill = SKILL_BY_KEY[key];
  return {
    title: skill.label,
    subtitle: `${ABILITY_SHORT[skill.ability]} · ${bonus >= 0 ? '+' : ''}${bonus}`,
    body: SKILL_LORE[key],
    tags: [expertise ? 'Expertise (proficiência ×2)' : proficient ? 'Proficiente' : 'Sem proficiência', ABILITY_LABELS[skill.ability]],
  };
}

export function passiveLore(label: string, value: string, body: string, tags: string[] = []): LoreInfo {
  return { title: label, subtitle: value, body, tags };
}

export function spellLore(spell: Spell): LoreInfo {
  const circle = spell.level === 0 ? 'Truque' : `${spell.level}º círculo`;
  const lines: string[] = [];
  if (spell.castingTime) lines.push(`⏱ Conjuração: ${spell.castingTime}`);
  if (spell.range) lines.push(`◎ Alcance: ${spell.range}`);
  if (spell.duration) lines.push(`⧗ Duração: ${spell.duration}${spell.concentration ? ' (concentração)' : ''}`);
  if (spell.components) lines.push(`✶ Componentes: ${spell.components}${spell.material ? ` (${spell.material})` : ''}`);
  if (spell.damage) lines.push(`⚔ Dano: ${spell.damage.dice} de ${spell.damage.type}`);
  if (spell.heal) lines.push(`✚ Cura: ${spell.heal}`);
  if (spell.attack) lines.push(`➶ Ataque de magia (${spell.attack === 'ranged' ? 'à distância' : 'corpo a corpo'})`);
  if (spell.save) lines.push(`🛡 Salvaguarda: ${ABILITY_SHORT[spell.save]}`);
  if (spell.area) lines.push(`◇ Área: ${spell.area}`);
  if (spell.conditions?.length) lines.push(`☠ Condições: ${spell.conditions.join(', ')}`);
  if (spell.ritual) lines.push('❖ Pode ser conjurada como ritual');
  const body = [spell.desc, lines.join('\n'), spell.higher ? `Em círculos superiores: ${spell.higher}` : '']
    .filter(Boolean)
    .join('\n\n');
  return {
    title: spell.name,
    subtitle: `${circle} · ${spell.school}`,
    body: body || 'Magia sem descrição.',
    tags: [circle, spell.school, ...(spell.tags ?? [])],
    automation: spellAutomation(spell),
  };
}

export const ITEM_CATEGORY_LABEL: Record<string, string> = {
  weapon: 'Arma', armor: 'Armadura', shield: 'Escudo', gear: 'Equipamento', tool: 'Ferramenta',
  consumable: 'Consumível', wondrous: 'Item maravilhoso', ring: 'Anel', treasure: 'Tesouro', other: 'Outro',
};
const RARITY_LORE: Record<string, { label: string; color: string }> = {
  comum: { label: 'Comum', color: '#C9D2DC' },
  incomum: { label: 'Incomum', color: '#3FC56B' },
  raro: { label: 'Raro', color: '#4D9BFF' },
  'muito-raro': { label: 'Muito raro', color: '#B061FF' },
  lendario: { label: 'Lendário', color: '#FFA033' },
};
const ATTUNE_WHO: Record<string, string> = {
  spellcaster: 'conjurador', bard: 'bardo', cleric: 'clérigo', druid: 'druida', paladin: 'paladino', sorcerer: 'feiticeiro', warlock: 'bruxo', wizard: 'mago',
};

/** Preço do livro em po/pp/pc ("15 po", "5 pp", "1 pc"). */
export function priceLabel(gp: number | undefined): string | null {
  if (!gp) return null;
  if (gp >= 1) return `${gp.toLocaleString('pt-BR')} po`;
  if (gp >= 0.1) return `${Math.round(gp * 10)} pp`;
  return `${Math.max(1, Math.round(gp * 100))} pc`;
}

/**
 * Dica de item no estilo BG3: nome na cor da raridade, tipo, o número que
 * importa (dano, CA, cura), propriedades, uma descrição curta e, no
 * rodapé, peso e preço.
 */
export function itemLore(item: {
  /** Id do catálogo (item do livro) ou `itemId` (instância na mochila): acha a descrição. */
  id?: string;
  itemId?: string;
  group?: string;
  name: string;
  category: string;
  rarity: Rarity | string;
  note: string;
  weight: number;
  value?: number;
  weapon?: WeaponData;
  armor?: ArmorData;
  acBonus?: number;
  attunement?: boolean;
  attuneBy?: string[];
  magic?: MagicEffects;
  heal?: string;
  charges?: { max: number };
}): LoreInfo {
  const rarity = RARITY_LORE[item.rarity] ?? RARITY_LORE.comum;
  const m = item.magic;
  const w = item.weapon;
  const a = item.armor;
  const auto = m
    ? [
        m.ac ? `+${m.ac} CA${m.unarmoredOnly ? ' (sem armadura e sem escudo)' : ''}` : '',
        m.saves ? `+${m.saves} em salvaguardas` : '',
        m.checks ? `+${m.checks} em testes de atributo` : '',
        m.hpPerLevel ? `+${m.hpPerLevel} PV por nível` : '',
        ...Object.entries(m.setAbility ?? {}).map(([k, v]) => `${k.toUpperCase()} vira ${v}`),
        ...Object.entries(m.addAbility ?? {}).map(([k, v]) => `+${v!.bonus} ${k.toUpperCase()} (máx. ${v!.max})`),
        m.unarmoredAC ? `CA ${m.unarmoredAC.base} + ${m.unarmoredAC.ability.toUpperCase()} sem armadura` : '',
        m.spellAttack ? `+${m.spellAttack} no ataque de magia` : '',
        m.spellDC ? `+${m.spellDC} na CD de magia` : '',
        m.speed ? `+${m.speed} m de deslocamento` : '',
        ...(m.resistances ?? []).map((r) => `Resistência a ${r}`),
      ].filter(Boolean)
    : [];

  // tipo, como no BG3: "Raro · Arma marcial corpo a corpo"
  const kind = w
    ? `Arma ${w.type === 'martial' ? 'marcial' : 'simples'} ${w.range === 'ranged' ? 'à distância' : 'corpo a corpo'}`
    : a
      ? `Armadura ${a.category}`
      : ITEM_CATEGORY_LABEL[item.category] ?? item.category;

  let headline: LoreInfo['headline'];
  const props: string[] = [];
  let body = item.note;
  if (w) {
    const plus = w.magicBonus ? ` +${w.magicBonus}` : '';
    const extra = w.bonusDamage ? ` + ${w.bonusDamage.dice}d${w.bonusDamage.die} ${w.bonusDamage.type}` : '';
    headline = { value: w.damageDie === 1 ? `${w.damageDice}${plus}` : `${w.damageDice}d${w.damageDie}${plus}`, label: `${w.damageType}${extra}` };
    props.push(...w.properties.map((p) => (p === 'Versátil' && w.versatileDie ? `Versátil (1d${w.versatileDie} com as duas mãos)` : p)));
    if (w.rangeLabel && !w.properties.some((p) => p.includes(w.rangeLabel!))) props.push(`Distância ${w.rangeLabel}`);
    if (w.magicBonus) props.push(`+${w.magicBonus} no ataque e no dano`);
    body = w.finesse
      ? 'Ataca com Força ou Destreza (a melhor).'
      : w.range === 'ranged'
        ? 'Ataca com Destreza.'
        : 'Ataca com Força.';
    // item mágico: a nota é o que ele faz de especial
    if (item.rarity !== 'comum' && item.note && !/^\d/.test(item.note)) body = item.note;
  } else if (a) {
    const ac = a.baseAC + (a.magicBonus ?? 0);
    headline = { value: `CA ${ac}`, label: a.addDex ? (a.maxDexBonus !== undefined ? `+ DES (máx. ${a.maxDexBonus})` : '+ DES') : 'sem DES' };
    if (a.strReq) props.push(`Exige FOR ${a.strReq} (senão −3 m de deslocamento)`);
    if (a.stealthDisadvantage) props.push('Desvantagem em Furtividade');
    if (a.magicBonus) props.push(`+${a.magicBonus} na CA`);
    body = item.rarity !== 'comum' && item.note && !/^CA /.test(item.note) ? item.note : 'Vestida, define a sua Classe de Armadura.';
  } else if (item.acBonus) {
    headline = { value: `+${item.acBonus} CA`, label: item.category === 'shield' ? 'escudo numa das mãos' : undefined };
  } else if (item.heal) {
    headline = { value: item.heal, label: 'PV de cura' };
    if (!body) body = 'Beba (ação) para recuperar pontos de vida.';
  }
  // texto do catálogo: descrição imersiva + para que serve na mesa
  const desc = itemDescription(item.itemId ?? item.id);
  if (desc) body = a || item.acBonus ? desc.use : [body, desc.use].filter(Boolean).join(' ');
  props.push(...auto);
  if (item.charges?.max) props.push(`${item.charges.max} cargas (recarregam ao amanhecer)`);
  if (item.attunement) {
    props.push(item.attuneBy?.length ? `Exige sintonia (${item.attuneBy.map((b) => ATTUNE_WHO[b] ?? b).join(', ')})` : 'Exige sintonia');
  }

  const footer = [item.weight ? `${item.weight.toLocaleString('pt-BR')} kg` : '', priceLabel(item.value) ?? ''].filter(Boolean);
  const tags = itemTags(item, desc?.tags);
  return {
    title: item.name,
    titleColor: rarity.color,
    subtitle: `${rarity.label} · ${kind}`,
    headline,
    props,
    body: body || (auto.length ? 'A ficha aplica os efeitos sozinha.' : ''),
    footer,
    ...(desc && { flavor: desc.desc }),
    ...(tags.length && { tags }),
  };
}

export function conditionLore(condition: string): LoreInfo {
  const def = getCondition(condition);
  return {
    title: def?.label ?? condition,
    subtitle: def ? `Condição · ${def.short}` : 'Condição',
    body: def?.desc ?? 'Condição ativa no personagem. Consulte o mestre para o efeito exato na cena.',
    tags: ['Estado', 'Descanso longo remove aqui'],
  };
}

/** Tooltip "ver cálculo": total + uma linha por origem do bônus. */
export function calcLore(title: string, bd: Breakdown, opts: { unit?: string; intro?: string; tags?: string[] } = {}): LoreInfo {
  const totalTxt = Number.isInteger(bd.total) ? String(bd.total) : bd.total.toFixed(1).replace('.', ',');
  return {
    title,
    subtitle: `Total: ${totalTxt}${opts.unit ? ` ${opts.unit}` : ''}`,
    body: `${opts.intro ? opts.intro + '\n\n' : ''}${breakdownBody(bd, opts.unit)}`,
    tags: opts.tags ?? ['Ver cálculo'],
  };
}
