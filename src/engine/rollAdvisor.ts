import type { AbilityKey, SkillKey } from '@/types/dnd';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from './dndRules';
import { ABILITY_LABELS, ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { calculateToolCheck } from './toolCheck';
import { modStr } from './dice';

/**
 * "O que eu rolo?" — o jogador descreve a intenção em português
 * ("quero escalar o muro", "ele está mentindo?") e a engine sugere o teste,
 * com o bônus calculado e a origem do número. Sem IA: um dicionário de
 * gatilhos por regra, pontuado pelo tamanho do trecho reconhecido (frases
 * específicas vencem palavras soltas).
 *
 * Gatilhos terminados em `*` casam como prefixo de palavra ("escal*" pega
 * escalar/escalo/escalada); os demais precisam casar a palavra inteira.
 */

export type RollTarget =
  | { kind: 'skill'; skill: SkillKey }
  | { kind: 'save'; ability: AbilityKey }
  | { kind: 'ability'; ability: AbilityKey }
  | { kind: 'initiative' }
  | { kind: 'tool'; toolId: string };

interface AdviceRule {
  target: RollTarget;
  triggers: string[];
  /** Por que esse teste — linguagem de mesa, curta. */
  why: string;
}

export interface RollSuggestion {
  id: string;
  target: RollTarget;
  label: string;
  bonus: number;
  /** Composição do bônus ("DES +3 · Proficiência +2"). */
  math: string;
  why: string;
  proficient: boolean;
  score: number;
}

const RULES: AdviceRule[] = [
  // ---------- Força ----------
  { target: { kind: 'skill', skill: 'athletics' }, why: 'Esforço físico: escalar, saltar, nadar, agarrar ou empurrar.', triggers: ['escal*', 'subir*', 'sobe', 'pular', 'pulo', 'salt*', 'nad*', 'empurr*', 'agarr*', 'derrub*', 'correnteza', 'trepar', 'corda', 'muro', 'penhasco', 'arrastar*', 'segurar na borda', 'escapar do agarrao', 'escapar de um agarrao'] },
  { target: { kind: 'ability', ability: 'str' }, why: 'Força bruta sem técnica: o mestre costuma pedir Força pura.', triggers: ['levantar*', 'erguer*', 'quebrar*', 'arrombar a porta', 'forcar a porta', 'forcar*', 'arrebentar*', 'dobrar as barras', 'carregar*', 'queda de braco'] },
  { target: { kind: 'save', ability: 'str' }, why: 'Resistir a ser empurrado, preso ou esmagado.', triggers: ['resistir ao empurrao', 'nao ser empurrado', 'nao ser derrubado', 'esmag*', 'teia', 'ventania'] },

  // ---------- Destreza ----------
  { target: { kind: 'skill', skill: 'acrobatics' }, why: 'Equilíbrio e agilidade: ficar de pé, rolar, fazer manobras.', triggers: ['equilibr*', 'acrobac*', 'cambalhot*', 'pirueta', 'rolar no chao', 'escorreg*', 'gelo', 'viga', 'corda bamba', 'aterriss*', 'cair de pe', 'se soltar', 'escapar das amarras'] },
  { target: { kind: 'skill', skill: 'sleightOfHand' }, why: 'Mãos rápidas: bater carteira, esconder ou plantar um objeto.', triggers: ['bater carteira', 'carteira', 'bolso', 'furtar*', 'roubar*', 'surrupiar', 'plantar*', 'truque de mao', 'prestidigit*', 'esconder o objeto', 'esconder a faca', 'passar sem ninguem ver'] },
  { target: { kind: 'skill', skill: 'stealth' }, why: 'Passar despercebido: esconder-se ou se mover em silêncio.', triggers: ['esconder*', 'escondo', 'furtiv*', 'sorrateir*', 'silencio*', 'em silencio', 'sem ser visto', 'sem ser notado', 'despercebid*', 'espreit*', 'emboscar', 'me esgueirar', 'esgueir*', 'sombras'] },
  { target: { kind: 'save', ability: 'dex' }, why: 'Reflexo para escapar de área: explosões, armadilhas, desabamentos.', triggers: ['bola de fogo', 'explos*', 'desviar*', 'esquivar*', 'armadilha disparou', 'desabamento', 'rajada', 'relampago', 'sopro do dragao', 'baforada'] },
  { target: { kind: 'initiative' }, why: 'O combate começou: iniciativa define a ordem dos turnos.', triggers: ['iniciativa', 'combate comec*', 'comeca o combate', 'rolar iniciativa', 'quem age primeiro'] },
  { target: { kind: 'tool', toolId: 'thieves-tools' }, why: 'Fechaduras e armadilhas mecânicas usam Ferramentas de Ladrão.', triggers: ['fechadura', 'destranc*', 'gazua', 'arrombar a fechadura', 'abrir a tranca', 'desarmar*', 'cadeado'] },

  // ---------- Constituição ----------
  { target: { kind: 'save', ability: 'con' }, why: 'Aguentar no corpo: veneno, doença, frio, cansaço ou manter Concentração.', triggers: ['veneno', 'envenen*', 'doenc*', 'concentra*', 'manter a magia', 'resistir ao frio', 'nausea', 'exaust*', 'aguentar*'] },
  { target: { kind: 'ability', ability: 'con' }, why: 'Fôlego e resistência prolongada: o mestre pede Constituição pura.', triggers: ['prender a respiracao', 'marcha forcada', 'bebida', 'beber', 'competicao de bebida', 'correr sem parar', 'sem dormir'] },

  // ---------- Inteligência ----------
  { target: { kind: 'skill', skill: 'arcana' }, why: 'Conhecimento arcano: magias, runas, itens mágicos e planos.', triggers: ['magia', 'magic*', 'arcan*', 'runa*', 'feitic*', 'ritual', 'portal', 'item magico', 'glifo', 'outro plano', 'plano astral', 'planos de existencia', 'encantament*', 'sigilo', 'pergaminho'] },
  { target: { kind: 'skill', skill: 'history' }, why: 'Lembrar do passado: reinos, guerras, lendas, brasões.', triggers: ['histori*', 'lenda*', 'brasao', 'nobre*', 'reino', 'guerra', 'antig*', 'ruina*', 'dinastia', 'lembrar*', 'lembro', 'ja ouvi falar', 'quem foi'] },
  { target: { kind: 'skill', skill: 'investigation' }, why: 'Deduzir a partir de pistas: examinar, procurar, analisar.', triggers: ['pista*', 'investig*', 'examin*', 'deduz*', 'deducao', 'procurar*', 'procuro', 'vasculh*', 'analis*', 'decifr*', 'mecanismo', 'compartimento secreto', 'passagem secreta', 'porta secreta', 'como funciona'] },
  { target: { kind: 'skill', skill: 'nature' }, why: 'Conhecimento do mundo natural: plantas, feras, clima e terreno.', triggers: ['natureza', 'planta*', 'erva*', 'cogumelo*', 'fera*', 'clima', 'terreno', 'floresta', 'identificar o animal', 'que animal', 'fungo*'] },
  { target: { kind: 'skill', skill: 'religion' }, why: 'Conhecimento religioso: deuses, cultos, ritos e mortos-vivos.', triggers: ['deus', 'deuses', 'deusa', 'divin*', 'templo', 'religi*', 'culto', 'sagrad*', 'profan*', 'morto vivo', 'mortos vivos', 'clero', 'simbolo sagrado', 'reliquia'] },
  { target: { kind: 'save', ability: 'int' }, why: 'Ver através de ilusões e resistir a ataques à mente racional.', triggers: ['ilusao', 'ilusoes', 'desacreditar', 'e real'] },

  // ---------- Sabedoria ----------
  { target: { kind: 'skill', skill: 'perception' }, why: 'Notar o que está ao redor: ver, ouvir, sentir cheiro.', triggers: ['ouvir', 'escut*', 'ver', 'vejo', 'perceb*', 'notar', 'reparar', 'avist*', 'vigia*', 'olhar em volta', 'olho em volta', 'emboscada', 'cheiro', 'barulho', 'prestar atencao', 'tem alguem'] },
  { target: { kind: 'skill', skill: 'insight' }, why: 'Ler a pessoa: intenções, sinceridade, o que ela esconde.', triggers: ['mentindo', 'mente pra mim', 'sincer*', 'intenc*', 'confiar', 'confiavel', 'desconfi*', 'intuic*', 'motivo', 'ler a pessoa', 'esta escondendo', 'o que ele quer', 'o que ela quer', 'blefando'] },
  { target: { kind: 'skill', skill: 'medicine' }, why: 'Cuidar de alguém: estabilizar, diagnosticar, tratar.', triggers: ['estabiliz*', 'ferid*', 'medic*', 'diagnost*', 'primeiros socorros', 'causa da morte', 'sangrando', 'curativo'] },
  { target: { kind: 'skill', skill: 'survival' }, why: 'Sobreviver fora da cidade: rastrear, caçar, se orientar.', triggers: ['rastr*', 'pegada*', 'trilha', 'cacar', 'caca', 'forrag*', 'acampar*', 'acampamento', 'orient*', 'perdido*', 'caminho de volta', 'prever o tempo', 'seguir o rastro'] },
  { target: { kind: 'skill', skill: 'animalHandling' }, why: 'Lidar com animais: acalmar, montar, conduzir.', triggers: ['acalmar o animal', 'acalmar o cavalo', 'cavalo', 'montaria', 'montar*', 'adestr*', 'domar', 'cachorro', 'lobo manso', 'animal'] },
  { target: { kind: 'save', ability: 'wis' }, why: 'Força de vontade: medo, enfeitiçamento e controle mental.', triggers: ['medo', 'amedront*', 'enfeiti*', 'charme', 'controle mental', 'dominar pessoa', 'resistir ao encanto', 'sussurr*'] },

  // ---------- Carisma ----------
  { target: { kind: 'skill', skill: 'persuasion' }, why: 'Convencer com honestidade e boa conversa.', triggers: ['convenc*', 'persuad*', 'persuas*', 'negoci*', 'pechinch*', 'barganh*', 'desconto', 'diplomac*', 'pedir*', 'implorar', 'baixar o preco', 'acordo', 'ajudar a gente'] },
  { target: { kind: 'skill', skill: 'deception' }, why: 'Fazer alguém acreditar no que não é verdade.', triggers: ['mentir', 'minto', 'mentira', 'engan*', 'blefar', 'blefe', 'disfarc*', 'fingir*', 'finjo', 'labia', 'enrolar', 'me passar por', 'se passar por'] },
  { target: { kind: 'skill', skill: 'intimidation' }, why: 'Pressionar com ameaça, presença ou violência implícita.', triggers: ['intimid*', 'ameac*', 'assust*', 'coagir', 'interrog*', 'encarar', 'botar medo'] },
  { target: { kind: 'skill', skill: 'performance' }, why: 'Entreter uma plateia: música, dança, atuação, discurso.', triggers: ['cantar', 'dancar', 'danca', 'tocar musica', 'tocar o alaude', 'tocar a flauta', 'tocar um instrumento', 'atuar', 'apresent*', 'plateia', 'show', 'entreter', 'distrair a multidao', 'musica'] },
  { target: { kind: 'save', ability: 'cha' }, why: 'Resistir a ser banido, possuído ou arrancado do plano.', triggers: ['banimento', 'banir', 'possess*', 'possuido', 'expulsar do plano'] },
];

/** minúsculas, sem acento, só letras/números/espaço. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Tamanho do gatilho casado no texto (0 = não casou). */
function matchTrigger(text: string, trigger: string): number {
  const prefix = trigger.endsWith('*');
  const t = prefix ? trigger.slice(0, -1) : trigger;
  const padded = ` ${text} `;
  if (prefix) return padded.includes(` ${t}`) ? t.length : 0;
  return padded.includes(` ${t} `) ? t.length : 0;
}

function targetId(t: RollTarget): string {
  switch (t.kind) {
    case 'skill': return `skill:${t.skill}`;
    case 'save': return `save:${t.ability}`;
    case 'ability': return `ability:${t.ability}`;
    case 'tool': return `tool:${t.toolId}`;
    default: return 'initiative';
  }
}

/** Resolve rótulo e bônus de um alvo no personagem; null se não aplicável (ex.: sem a ferramenta). */
function resolveTarget(t: RollTarget, char: Character, d: DerivedCharacter): Omit<RollSuggestion, 'id' | 'target' | 'why' | 'score'> | null {
  const prof = d.proficiency;
  switch (t.kind) {
    case 'skill': {
      const sk = d.skills.find((s) => s.key === t.skill);
      if (!sk) return null;
      const abMod = d.abilities[sk.ability].mod;
      const profPart = sk.expertise ? prof * 2 : sk.proficient ? prof : 0;
      const other = sk.bonus - abMod - profPart;
      const parts = [`${ABILITY_SHORT[sk.ability]} ${modStr(abMod)}`];
      if (profPart) parts.push(`${sk.expertise ? 'Expertise' : 'Proficiência'} ${modStr(profPart)}`);
      if (other) parts.push(`Outros ${modStr(other)}`);
      return { label: `${SKILL_BY_KEY[t.skill].label} (${ABILITY_SHORT[sk.ability]})`, bonus: sk.bonus, math: parts.join(' · '), proficient: sk.proficient };
    }
    case 'save': {
      const a = d.abilities[t.ability];
      const other = a.save - a.mod - (a.saveProf ? prof : 0);
      const parts = [`${ABILITY_SHORT[t.ability]} ${modStr(a.mod)}`];
      if (a.saveProf) parts.push(`Proficiência ${modStr(prof)}`);
      if (other) parts.push(`Outros ${modStr(other)}`);
      return { label: `Resist. de ${ABILITY_LABELS[t.ability]}`, bonus: a.save, math: parts.join(' · '), proficient: a.saveProf };
    }
    case 'ability': {
      const a = d.abilities[t.ability];
      return { label: `Teste de ${ABILITY_LABELS[t.ability]}`, bonus: a.mod, math: `${ABILITY_SHORT[t.ability]} ${modStr(a.mod)}`, proficient: false };
    }
    case 'initiative':
      return { label: 'Iniciativa', bonus: d.initiative, math: `DES ${modStr(d.abilities.dex.mod)}${d.initiative !== d.abilities.dex.mod ? ` · Outros ${modStr(d.initiative - d.abilities.dex.mod)}` : ''}`, proficient: false };
    case 'tool': {
      const tool = (char.toolProfs ?? []).find((x) => x.id === t.toolId);
      if (!tool) return null;
      const c = calculateToolCheck(char, tool);
      const parts = [`${ABILITY_SHORT[c.ability]} ${modStr(c.abilityMod)}`, `Proficiência ${modStr(c.proficiency)}`];
      if (c.expertiseBonus) parts.push(`Expertise ${modStr(c.expertiseBonus)}`);
      if (c.manualBonus) parts.push(`Outros ${modStr(c.manualBonus)}`);
      return { label: `${tool.label} (${ABILITY_SHORT[c.ability]})`, bonus: c.total, math: parts.join(' · '), proficient: true };
    }
  }
}

/**
 * Sugere até `limit` testes para a intenção descrita, do mais provável ao
 * menos. Empate: vence o maior bônus (o jogador quer saber o melhor que tem).
 */
export function adviseRoll(input: string, char: Character, derived: DerivedCharacter, limit = 3): RollSuggestion[] {
  const text = normalizeText(input);
  if (text.length < 2) return [];

  const best = new Map<string, RollSuggestion>();
  for (const rule of RULES) {
    let score = 0;
    for (const trig of rule.triggers) score += matchTrigger(text, normalizeText(trig) + (trig.endsWith('*') ? '*' : ''));
    if (!score) continue;
    const resolved = resolveTarget(rule.target, char, derived);
    if (!resolved) continue;
    const id = targetId(rule.target);
    const prev = best.get(id);
    if (!prev || prev.score < score) best.set(id, { id, target: rule.target, why: rule.why, score, ...resolved });
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || b.bonus - a.bonus)
    .slice(0, limit);
}

/** Exemplos exibidos quando o campo está vazio (ensinam o jeito de perguntar). */
export const ADVISOR_EXAMPLES = [
  'escalar o muro',
  'ele está mentindo?',
  'me esconder nas sombras',
  'abrir a fechadura',
  'lembrar desse brasão',
  'resistir ao veneno',
];
