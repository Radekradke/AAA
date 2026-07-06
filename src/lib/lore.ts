import type { AbilityKey, ArmorData, Rarity, SkillKey, Spell, WeaponData } from '@/types/dnd';
import type { Breakdown } from '@/engine/effects';
import { breakdownBody } from '@/engine/effects';
import { ABILITY_LABELS, ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { getCondition } from '@/data/conditions';

export interface LoreInfo {
  title: string;
  subtitle?: string;
  body: string;
  tags?: string[];
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
  };
}

export function itemLore(item: {
  name: string;
  category: string;
  rarity: Rarity | string;
  note: string;
  weight: number;
  weapon?: WeaponData;
  armor?: ArmorData;
  acBonus?: number;
  attunement?: boolean;
}): LoreInfo {
  const tags = [item.category, item.rarity];
  if (item.attunement) tags.push('Sintonia');
  if (item.weight) tags.push(`${item.weight} kg`);
  if (item.weapon) tags.push(`${item.weapon.damageDice}d${item.weapon.damageDie} ${item.weapon.damageType}`);
  if (item.armor) tags.push(`CA ${item.armor.baseAC}`);
  if (item.acBonus) tags.push(`+${item.acBonus} CA`);

  return {
    title: item.name,
    subtitle: item.note,
    body: item.weapon
      ? 'Arma equipada gera ataques automáticos na aba Combate. O bônus usa proficiência e o melhor atributo aplicável pelas propriedades da arma.'
      : item.armor
        ? 'Armadura equipada recalcula sua Classe de Armadura. Armaduras médias limitam Destreza e armaduras pesadas não somam Destreza.'
        : item.attunement
          ? 'Item mágico que exige sintonia. Um personagem só mantém até três itens sintonizados ao mesmo tempo.'
          : 'Item de inventário. Use a nota para entender o efeito rápido, peso e papel narrativo durante a aventura.',
    tags,
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
