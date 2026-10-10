import type { ChoiceOption, ChoiceSpec } from '@/data/classChoices';
import type { Fact } from '@/engine/creationSummary';
import type { Subclass } from '@/types/dnd';
import { GlyphIcon } from './RaceIcon';
import { SchoolIcon } from '@/components/ui/RuleIcon';
import { SpellThumb } from '@/components/spells/SpellThumb';
import { spellArt } from '@/lib/spellArt';
import { itemArt } from '@/lib/itemArt';
import { getSpell } from '@/data/spells';
import { FEATURE_INFO } from '@/data/featureInfo';
import { DOMAIN_SPELLS, PATRON_SPELLS } from '@/data/subclassSpells';
import { SKILL_BY_KEY, ABILITY_LABELS } from '@/data/skills';
import { TOOLS } from '@/data/tools';
import { TOOL_INFO } from '@/data/toolInfo';
import { getItem } from '@/data/items';
import { priceLabel, skillDescription } from '@/lib/lore';

/**
 * Como cada opção dos Dons aparece: ícone ou arte, cor, a linha curta do
 * cartão e o que ela coloca na ficha (painel de detalhe). Só apresentação —
 * as regras continuam no motor (classChoices / creationSummary).
 */
export interface GiftLook {
  icon: string;
  /** Arte do item (instrumentos e ferramentas). */
  art?: string;
  /** Escola de magia (truques). */
  school?: string;
  /** Magia: miniatura com arte (quando houver) e moldura do círculo. */
  spell?: { id: string; level: number; school: string };
  color?: string;
  /** Grupo para separar a lista em abas (ex.: ferramentas × instrumentos). */
  group?: string;
  line: string;
  desc: string;
  facts: Fact[];
}

const STYLE_ICON: Record<string, string> = {
  archery: 'class-ranger', defense: 'equipped', dueling: 'sword', gwf: 'class-barbarian', protection: 'crest', twf: 'swords',
};
const ENEMY_ICON: Record<string, string> = {
  aberrations: 'tentacle-strike', beasts: 'wolf-head', celestials: 'angel-wings', constructs: 'robot-golem', dragons: 'dragon-head',
  elementals: 'fire', fey: 'fairy', fiends: 'evil-wings', giants: 'giant', monstrosities: 'minotaur', oozes: 'water-drop',
  plants: 'tree-face', undead: 'ghost', humanoids: 'orc-head',
};
const SPEAKING = new Set(['aberrations', 'celestials', 'dragons', 'elementals', 'fey', 'fiends', 'giants', 'undead', 'humanoids']);
const TERRAIN_ICON: Record<string, string> = {
  arctic: 'crystal-growth', coast: 'water-drop', desert: 'gecko', forest: 'tree-face', grassland: 'rabbit', mountain: 'stone-pile',
  swamp: 'frog', underdark: 'spider-face',
};
const DRAGON_COLOR: Record<string, string> = {
  black: '#6d6a80', blue: '#3d82e0', brass: '#c9a24c', bronze: '#b97d3c', copper: '#cf6f41', gold: '#e6b740', green: '#3faa5d',
  red: '#d9493c', silver: '#b9c4d1', white: '#dbe9f5',
};
const SPEAKERS: Record<string, string> = {
  Anão: 'anões', Élfico: 'elfos e meio-elfos', Gigante: 'ogros e gigantes', Gnômico: 'gnomos', Goblin: 'goblins, hobgoblins e bugbears',
  Halfling: 'halflings', Orc: 'orcs e meio-orcs', Abissal: 'demônios', Celestial: 'celestiais', Dracônico: 'dragões e draconatos',
  'Dialeto Subterrâneo': 'aberrações (devoradores de mentes, observadores)', Infernal: 'diabos e tieflings', Primordial: 'elementais',
  Silvestre: 'criaturas feéricas', Subcomum: 'mercadores do Subterrâneo (drow, duergar)',
};

/** Alfabeto de cada idioma (PHB 2014). */
const SCRIPT: Record<string, string> = {
  Anão: 'anão (rúnico)', Élfico: 'élfico', Gigante: 'anão', Gnômico: 'anão', Goblin: 'anão', Halfling: 'comum', Orc: 'anão',
  Abissal: 'infernal', Celestial: 'celestial', Dracônico: 'dracônico', 'Dialeto Subterrâneo': '—', Infernal: 'infernal',
  Primordial: 'anão', Silvestre: 'élfico', Subcomum: 'élfico',
};
const STYLE_FOR: Record<string, string> = {
  archery: 'Arqueiros: arco longo, arco curto, besta.',
  defense: 'Qualquer um que lute de armadura — o mais seguro.',
  dueling: 'Uma arma numa mão e escudo (ou mão livre).',
  gwf: 'Armas pesadas de duas mãos: espada grande, machado grande, malho.',
  protection: 'Quem usa escudo e quer proteger os aliados ao lado.',
  twf: 'Duas armas leves: espadas curtas, adagas, machadinhas.',
};
const ENEMY_EXAMPLES: Record<string, string> = {
  aberrations: 'devoradores de mente, observadores, aboletes', beasts: 'lobos, ursos, aranhas e feras gigantes',
  celestials: 'anjos, pégasos, unicórnios', constructs: 'golens, armaduras animadas, homúnculos',
  dragons: 'dragões, dracos, serpes', elementals: 'elementais, gênios, mefites', fey: 'dríades, sátiros, bruxas',
  fiends: 'demônios, diabos, cães infernais', giants: 'ogros, trolls, gigantes', monstrosities: 'mantícoras, quimeras, ankhegs',
  oozes: 'cubos gelatinosos, pudins negros', plants: 'arbustos despertos, mantos de musgo', undead: 'zumbis, esqueletos, vampiros, fantasmas',
  humanoids: 'duas raças à escolha (orcs, gnolls, kobolds, humanos…)',
};
const ENEMY_LANGUAGE: Record<string, string> = {
  aberrations: 'Dialeto Subterrâneo', celestials: 'Celestial', dragons: 'Dracônico', elementals: 'Primordial', fey: 'Silvestre',
  fiends: 'Abissal ou Infernal', giants: 'Gigante', undead: 'o idioma que falavam em vida', humanoids: 'o idioma de uma das raças',
};
const TERRAIN_PLACES: Record<string, string> = {
  arctic: 'tundras, geleiras e montanhas nevadas', coast: 'praias, falésias e ilhas', desert: 'dunas, ermos e oásis',
  forest: 'matas, bosques e selvas', grassland: 'campos, savanas e planícies', mountain: 'picos, desfiladeiros e cavernas altas',
  swamp: 'pântanos, mangues e brejos', underdark: 'cavernas e túneis do Subterrâneo',
};
const TERRAIN_FACTS: Fact[] = [
  { label: 'Viagem', value: 'Terreno difícil não atrasa o grupo, e você nunca se perde (exceto por magia).' },
  { label: 'Atenção', value: 'Continua alerta ao perigo mesmo navegando, forrageando ou rastreando.' },
  { label: 'Sozinho', value: 'Viaja furtivo mesmo em ritmo normal.' },
  { label: 'Forragear', value: 'Encontra o dobro de comida.' },
  { label: 'Rastrear', value: 'Descobre quantas criaturas passaram, o tamanho delas e há quanto tempo.' },
  { label: 'Testes', value: 'Proficiência dobrada em testes de INT e SAB ligados a esse terreno.' },
];

/** Arte do catálogo para uma ferramenta/instrumento (ids de data/tools). */
function toolItemId(id: string): string | undefined {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return undefined;
  return tool.group === 'instrumento' ? `g-inst-${id.replace('-', '')}` : `g-tool-${id.split('-')[0].replace(/s$/, '')}`;
}

export function subclassLook(sub: Subclass): GiftLook {
  const lv1 = sub.features[1] ?? [];
  const facts: Fact[] = [];
  const domain = DOMAIN_SPELLS[sub.id]?.[1];
  const patron = PATRON_SPELLS[sub.id]?.[1];
  for (const f of lv1) {
    if (/^Magias de Domínio/.test(f)) continue;
    const info = FEATURE_INFO[f] ?? FEATURE_INFO[f.replace(/ \(.*\)$/, '')];
    facts.push({ label: f, value: info ?? 'Característica do 1º nível.' });
  }
  if (domain) facts.push({ label: 'Magias de domínio', value: `${domain.map((id) => getSpell(id)?.name ?? id).join(', ')} — sempre preparadas, fora do limite.` });
  if (patron) facts.push({ label: 'Lista do patrono', value: `${patron.map((id) => getSpell(id)?.name ?? id).join(', ')} entram nas magias que você pode aprender.` });
  if (sub.bonuses?.proficiencies?.length) facts.push({ label: 'Proficiências', value: sub.bonuses.proficiencies.join(', ') });
  const later = Object.entries(sub.features)
    .map(([lv, names]) => [Number(lv), names] as const)
    .filter(([lv, names]) => lv > 1 && !names.every((n) => /^Magias de Domínio/.test(n)))
    .sort((a, b) => a[0] - b[0])
    .slice(0, 4)
    .map(([lv, names]) => `${lv}º ${names.filter((n) => !/^Magias de Domínio/.test(n)).join(', ')}`);
  if (later.length) facts.push({ label: 'Depois', value: later.join(' · ') });
  return { icon: `class-${sub.classId}`, line: sub.desc, desc: sub.desc, facts };
}

export function optionLook(spec: ChoiceSpec, o: ChoiceOption): GiftLook {
  const base: GiftLook = { icon: 'spark', line: o.tag ?? '', desc: o.desc, facts: [] };
  switch (spec.catalog) {
    case 'fightingStyle':
      return {
        ...base,
        icon: STYLE_ICON[o.id] ?? 'swords',
        line: o.tag ?? 'estilo de combate',
        facts: [
          { label: 'Efeito', value: o.desc },
          ...(STYLE_FOR[o.id] ? [{ label: 'Bom para', value: STYLE_FOR[o.id] }] : []),
        ],
        desc: 'Uma especialidade de combate que vale o tempo todo.',
      };
    case 'favoredEnemy':
      return {
        ...base,
        icon: ENEMY_ICON[o.id] ?? 'crest',
        line: SPEAKING.has(o.id) ? 'rastreio · saber · idioma' : 'rastreio · saber',
        desc: ENEMY_EXAMPLES[o.id] ? `Exemplos: ${ENEMY_EXAMPLES[o.id]}.` : o.desc,
        facts: [
          { label: 'Rastrear', value: 'Vantagem em Sobrevivência (SAB) para seguir o rastro deles.' },
          { label: 'Saber', value: 'Vantagem em testes de INT para lembrar fraquezas, hábitos e covis.' },
          { label: 'Idioma', value: SPEAKING.has(o.id) ? `Aprende ${ENEMY_LANGUAGE[o.id] ?? 'um idioma deles'} (escolha logo a seguir).` : 'Não falam idiomas — nada a aprender.' },
        ],
      };
    case 'favoredTerrain':
      return {
        ...base,
        icon: TERRAIN_ICON[o.id] ?? 'tree-face',
        line: TERRAIN_PLACES[o.id] ?? 'Explorador Nato',
        desc: `Em ${TERRAIN_PLACES[o.id] ?? o.label.toLowerCase()}, você é guia e batedor do grupo.`,
        facts: TERRAIN_FACTS,
      };
    case 'dragonAncestor':
      return {
        ...base,
        icon: 'dragon-head',
        color: DRAGON_COLOR[o.id],
        line: `dano de ${o.tag}`,
        facts: [
          { label: 'Tipo de dano', value: `${o.tag} — usado pela Afinidade Elemental (6º nível).` },
          { label: 'Também', value: 'Fala Dracônico e dobra a proficiência em testes de Carisma com dragões.' },
        ],
      };
    case 'instrument':
    case 'monkTool':
    case 'artisanTool': {
      const tool = TOOLS.find((t) => t.id === o.id);
      const info = TOOL_INFO[o.id];
      const instrument = tool?.group === 'instrumento';
      const itemId = toolItemId(o.id);
      const item = itemId ? getItem(itemId) : undefined;
      const facts: Fact[] = [];
      if (info) {
        facts.push({ label: 'Na ficha', value: 'Proficiência: soma o seu bônus de proficiência nos testes com ela.' });
        facts.push({ label: 'Atributo', value: info.ability });
        facts.push({ label: instrument ? 'Jeito' : 'Exemplos', value: info.examples.join(' · ') });
      }
      if (instrument) facts.push({ label: 'Bardo', value: 'Serve de foco de conjuração para magias de bardo.' });
      const pack = [item?.weight ? `${item.weight.toLocaleString('pt-BR')} kg` : '', priceLabel(item?.value) ?? ''].filter(Boolean).join(' · ');
      if (pack) facts.push({ label: 'Peso · preço', value: pack });
      return {
        ...base,
        icon: instrument ? 'class-bard' : 'anvil',
        art: itemId ? itemArt({ itemId }) ?? undefined : undefined,
        group: instrument ? 'Instrumentos musicais' : 'Ferramentas de artesão',
        line: info?.short ?? (instrument ? 'instrumento' : 'ferramenta de artesão'),
        desc: info?.uses ?? `Proficiência com ${o.label}.`,
        facts,
      };
    }
    case 'language':
      return {
        ...base,
        icon: 'quill',
        group: o.tag === 'exótico' ? 'Idiomas exóticos' : 'Idiomas padrão',
        line: SPEAKERS[o.id] ?? o.tag ?? '',
        desc: `Você fala, lê e escreve ${o.label}.`,
        facts: [
          ...(SPEAKERS[o.id] ? [{ label: 'Falado por', value: SPEAKERS[o.id] }] : []),
          ...(SCRIPT[o.id] ? [{ label: 'Escrita', value: SCRIPT[o.id] === '—' ? 'não tem escrita própria' : `alfabeto ${SCRIPT[o.id]}` }] : []),
          { label: 'Tipo', value: o.tag === 'exótico' ? 'exótico — raro fora dos planos e lugares de origem' : 'padrão — comum entre os povos do mundo' },
        ],
      };
    case 'skill': {
      const sk = SKILL_BY_KEY[o.id as keyof typeof SKILL_BY_KEY];
      return {
        ...base,
        icon: 'inspiration',
        line: sk ? ABILITY_LABELS[sk.ability] : '',
        desc: sk ? skillDescription(sk.key) : o.desc,
        facts: sk
          ? [
              { label: 'Atributo', value: ABILITY_LABELS[sk.ability] },
              { label: 'Na ficha', value: spec.key === 'knowledgeSkills' ? 'Proficiência com o bônus DOBRADO (Bênçãos do Conhecimento).' : 'Proficiência: soma o seu bônus de proficiência.' },
            ]
          : [],
      };
    }
    case 'spell': {
      const sp = getSpell(o.id);
      if (!sp) return base;
      const facts: Fact[] = [];
      if (sp.castingTime) facts.push({ label: 'Tempo', value: sp.castingTime });
      if (sp.range) facts.push({ label: 'Alcance', value: sp.range });
      if (sp.duration) facts.push({ label: 'Duração', value: sp.duration });
      if (sp.damage) facts.push({ label: 'Dano', value: `${sp.damage.dice} ${sp.damage.type}` });
      if (sp.heal) facts.push({ label: 'Cura', value: sp.heal });
      return {
        ...base,
        icon: 'spark',
        school: sp.school,
        spell: { id: sp.id, level: sp.level, school: sp.school },
        line: sp.damage ? `${sp.damage.dice} ${sp.damage.type}` : sp.school.toLowerCase(),
        desc: sp.desc ?? o.desc,
        facts,
      };
    }
    default:
      return base;
  }
}

/** Ícone da opção (glifo; a arte do item só aparece grande no painel). */
export function GiftVisual({ look, size }: { look: GiftLook; size: number }) {
  if (look.spell && spellArt(look.spell.id)) return <SpellThumb spell={look.spell} size={Math.round(size * 1.6)} />;
  if (look.school) return <SchoolIcon school={look.school} size={size} />;
  return <GlyphIcon name={look.icon} size={size} />;
}
