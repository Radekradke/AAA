import type { ChoiceOption, ChoiceSpec } from '@/data/classChoices';
import type { Fact } from '@/engine/creationSummary';
import type { Subclass } from '@/types/dnd';
import { GlyphIcon } from './RaceIcon';
import { SchoolIcon } from '@/components/ui/RuleIcon';
import { itemArt } from '@/lib/itemArt';
import { getSpell } from '@/data/spells';
import { FEATURE_INFO } from '@/data/featureInfo';
import { DOMAIN_SPELLS, PATRON_SPELLS } from '@/data/subclassSpells';
import { SKILL_BY_KEY, ABILITY_LABELS } from '@/data/skills';
import { TOOLS } from '@/data/tools';

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
  color?: string;
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

/** Arte do catálogo para uma ferramenta/instrumento (ids de data/tools). */
function toolArt(id: string): string | undefined {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return undefined;
  const itemId = tool.group === 'instrumento' ? `g-inst-${id.replace('-', '')}` : `g-tool-${id.split('-')[0].replace(/s$/, '')}`;
  return itemArt({ itemId }) ?? undefined;
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
      return { ...base, icon: STYLE_ICON[o.id] ?? 'swords', line: o.tag ?? 'estilo de combate' };
    case 'favoredEnemy':
      return {
        ...base,
        icon: ENEMY_ICON[o.id] ?? 'crest',
        line: SPEAKING.has(o.id) ? 'rastreio · saber · idioma' : 'rastreio · saber',
        facts: [
          { label: 'Vantagem', value: 'Testes de Sobrevivência (SAB) para rastreá-los e de INT para lembrar informações sobre eles.' },
          { label: 'Idioma', value: SPEAKING.has(o.id) ? 'Aprende um idioma que eles falem (escolha logo a seguir).' : 'Não falam idiomas — nada a aprender.' },
        ],
      };
    case 'favoredTerrain':
      return { ...base, icon: TERRAIN_ICON[o.id] ?? 'tree-face', line: 'Explorador Nato', desc: spec.hint ?? o.desc };
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
      const kind = tool?.group === 'instrumento' ? 'instrumento' : 'ferramenta de artesão';
      return {
        ...base,
        icon: tool?.group === 'instrumento' ? 'volume' : 'anvil',
        art: toolArt(o.id),
        line: kind,
        desc: `Proficiência com ${o.label}.`,
        facts: [{ label: 'Na ficha', value: `Soma o bônus de proficiência nos testes com ${tool?.group === 'instrumento' ? 'o instrumento' : 'as ferramentas'}.` }],
      };
    }
    case 'language':
      return {
        ...base,
        icon: 'quill',
        line: o.tag ?? '',
        facts: SPEAKERS[o.id] ? [{ label: 'Falado por', value: SPEAKERS[o.id] }] : [],
      };
    case 'skill': {
      const sk = SKILL_BY_KEY[o.id as keyof typeof SKILL_BY_KEY];
      return {
        ...base,
        icon: 'inspiration',
        line: sk ? ABILITY_LABELS[sk.ability] : '',
        facts: sk ? [{ label: 'Atributo', value: ABILITY_LABELS[sk.ability] }] : [],
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
        line: sp.damage ? `${sp.damage.dice} ${sp.damage.type}` : sp.school.toLowerCase(),
        desc: sp.desc ?? o.desc,
        facts,
      };
    }
    default:
      return base;
  }
}

/** Ícone ou arte da opção (cartão ou painel). */
export function GiftVisual({ look, size }: { look: GiftLook; size: number }) {
  if (look.art) return <img src={look.art} alt="" className="fv-gift-art" style={{ width: size * 1.6, height: size * 1.6 }} />;
  if (look.school) return <SchoolIcon school={look.school} size={size} />;
  return <GlyphIcon name={look.icon} size={size} />;
}
