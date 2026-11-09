import type { Character } from '@/types/character';
import type { CasterClass, Feat, Spell } from '@/types/dnd';
import { getSpell, registerSpell } from '@/data/spells';
import { getFeat, registerFeat } from '@/data/feats';
import { homebrewId } from './homebrew';
import { parseDiceGroups } from './spellCast';

/**
 * Magias e talentos homebrew: o jogador cria, a ficha usa como se fossem do
 * livro (listas, conjuração, efeitos) e o app compara com o padrão do Guia do
 * Mestre 2014 para avisar quando algo parece forte demais — sem proibir.
 */

/** Aviso do editor: `error` impede salvar; `warn`/`info` só avisam. */
export interface ContentWarning {
  level: 'error' | 'warn' | 'info';
  text: string;
}

export const CASTER_CLASSES: CasterClass[] = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];

export function blankSpell(author?: string): Spell {
  return {
    id: '',
    name: '',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '18 m',
    components: 'V, S',
    duration: 'Instantânea',
    classes: [],
    desc: '',
    homebrew: true,
    source: 'Homebrew',
    author,
  };
}

/** Texto de "círculos superiores" que o motor de conjuração entende (+XdY por círculo). */
export function upcastText(level: number, dice: string): string {
  return `+${dice.trim()} de dano por círculo acima do ${level}º.`;
}

/** Normaliza antes de salvar: id, selo homebrew, campos vazios fora. */
export function finalizeSpell(sp: Spell, author?: string): Spell {
  const name = sp.name.trim();
  const out: Spell = {
    ...sp,
    id: sp.id || homebrewId(name || 'magia'),
    name,
    level: Math.max(0, Math.min(9, Math.round(sp.level))),
    desc: sp.desc?.trim() || undefined,
    higher: sp.higher?.trim() || undefined,
    material: sp.material?.trim() || undefined,
    area: sp.area?.trim() || undefined,
    heal: sp.heal?.trim() || undefined,
    damage: sp.damage?.dice.trim() ? { dice: sp.damage.dice.trim(), type: sp.damage.type } : undefined,
    concentration: sp.concentration || undefined,
    ritual: sp.ritual || undefined,
    homebrew: true,
    source: 'Homebrew',
    author: sp.author ?? author,
    updatedAt: Date.now(),
  };
  if (!out.save) delete out.save;
  if (!out.attack) delete out.attack;
  return out;
}

/** Dano médio de referência do Guia do Mestre 2014 (alvo único / área) por círculo. */
const DMG_SINGLE = [5.5, 11, 16.5, 27.5, 33, 44, 55, 60.5, 66, 82.5];
const DMG_AREA = [3.5, 7, 14, 21, 24.5, 28, 38.5, 42, 45.5, 49];

const average = (expr: string): number | null => {
  const d = parseDiceGroups(expr);
  return d && d.groups.length ? d.groups.reduce((n, g) => n + (g.n * (g.d + 1)) / 2, 0) + d.flat : null;
};

export function validateSpell(sp: Spell): ContentWarning[] {
  const out: ContentWarning[] = [];
  if (!sp.name.trim()) out.push({ level: 'error', text: 'Dê um nome à magia.' });
  if (!(sp.classes ?? []).length) out.push({ level: 'error', text: 'Escolha ao menos uma classe que tenha a magia na lista.' });
  if (sp.damage?.dice.trim()) {
    const avg = average(sp.damage.dice);
    if (avg === null) out.push({ level: 'error', text: `Não entendi o dano “${sp.damage.dice}”. Use algo como 3d8 ou 2d6+2.` });
    else {
      const ref = (sp.area ? DMG_AREA : DMG_SINGLE)[sp.level];
      if (avg > ref * 1.25) out.push({ level: 'warn', text: `Dano médio ${avg} acima do padrão para ${sp.level ? `${sp.level}º círculo` : 'truque'} ${sp.area ? 'em área' : 'em um alvo'} (≈${ref}).` });
    }
  }
  if (sp.heal?.trim() && !/^\s*\d+d\d+/.test(sp.heal)) out.push({ level: 'error', text: 'A cura precisa começar com dados (ex.: 2d8 + mod.).' });
  if (sp.damage?.dice.trim() && sp.save && sp.attack) out.push({ level: 'info', text: 'Ataque e salvaguarda ao mesmo tempo: a ficha rola o ataque; a salvaguarda fica como lembrete.' });
  if (sp.concentration && /instant/i.test(sp.duration ?? '')) out.push({ level: 'warn', text: 'Concentração com duração instantânea não combina.' });
  if (sp.level === 0 && sp.concentration) out.push({ level: 'info', text: 'Poucos truques pedem concentração: confira com o mestre.' });
  if (!sp.desc?.trim()) out.push({ level: 'info', text: 'Sem descrição: escreva o que a magia faz para a mesa entender.' });
  return out;
}

export function blankFeat(author?: string): Feat {
  return { id: '', label: '', desc: '', source: 'Homebrew', homebrew: true, author };
}

export function finalizeFeat(f: Feat, author?: string): Feat {
  const label = f.label.trim();
  const num = (n: number | undefined) => (n ? n : undefined);
  const out: Feat = {
    ...f,
    id: f.id || homebrewId(label || 'talento'),
    label,
    desc: f.desc.trim(),
    prereq: f.prereq?.trim() || undefined,
    notes: f.notes?.trim() || undefined,
    abilityChoice: f.abilityChoice?.length ? f.abilityChoice : undefined,
    hpPerLevel: num(f.hpPerLevel),
    speedBonus: num(f.speedBonus),
    initiativeBonus: num(f.initiativeBonus),
    passivePerceptionBonus: num(f.passivePerceptionBonus),
    resistances: f.resistances?.length ? f.resistances : undefined,
    source: 'Homebrew',
    homebrew: true,
    author: f.author ?? author,
    updatedAt: Date.now(),
  };
  if (out.uses && !out.uses.label.trim()) delete out.uses;
  else if (out.uses) out.uses = { ...out.uses, id: out.uses.id || `${out.id}-uso`, label: out.uses.label.trim(), desc: out.uses.desc.trim() || out.desc };
  return out;
}

export function validateFeat(f: Feat): ContentWarning[] {
  const out: ContentWarning[] = [];
  if (!f.label.trim()) out.push({ level: 'error', text: 'Dê um nome ao talento.' });
  if (!f.desc.trim()) out.push({ level: 'error', text: 'Descreva o que o talento faz.' });
  // pontos de "poder" aproximados: um talento do livro troca um aumento de +2 em atributos
  const weight =
    (f.abilityChoice?.length ? 1 : 0) +
    (f.hpPerLevel ?? 0) +
    (f.speedBonus ?? 0) / 3 +
    (f.initiativeBonus ?? 0) / 5 +
    (f.passivePerceptionBonus ?? 0) / 5 +
    (f.resistances?.length ?? 0) +
    (f.uses ? 1 : 0);
  if (weight > 3) out.push({ level: 'warn', text: 'Muitos bônus juntos: o talento parece mais forte que os do livro. Confira com o mestre.' });
  if ((f.hpPerLevel ?? 0) > 2) out.push({ level: 'warn', text: `+${f.hpPerLevel} PV por nível: Durão, o mais forte do livro, dá +2.` });
  if ((f.initiativeBonus ?? 0) > 5) out.push({ level: 'warn', text: `+${f.initiativeBonus} de iniciativa: Alerta dá +5.` });
  return out;
}

/** Todos os ids de magia que a ficha usa (conhecidas, preparadas, grimório, por classe, de talento). */
export function spellIdsOf(char: Character): string[] {
  const ids = new Set<string>([...(char.knownSpells ?? []), ...(char.preparedSpells ?? []), ...(char.spellbookCopied ?? [])]);
  for (const sel of Object.values(char.classSpells ?? {})) {
    for (const id of [...(sel.knownSpells ?? []), ...(sel.preparedSpells ?? []), ...(sel.spellbookCopied ?? [])]) ids.add(id);
  }
  for (const fid of char.feats ?? []) for (const g of getFeat(fid)?.grantsSpells ?? []) ids.add(g.spellId);
  return [...ids];
}

/** Cópias embutidas que a ficha deve carregar: as homebrew que ela usa, na versão da biblioteca. */
export function homebrewEmbeds(char: Character): { customSpells: Spell[]; customFeats: Feat[] } {
  const customFeats = (char.feats ?? []).map((id) => getFeat(id)).filter((f): f is Feat => !!f?.homebrew);
  const customSpells = spellIdsOf(char).map((id) => getSpell(id)).filter((s): s is Spell => !!s?.homebrew);
  return { customSpells, customFeats };
}

const sig = (list: { id: string; updatedAt?: number }[] | undefined) =>
  (list ?? []).map((x) => `${x.id}@${x.updatedAt ?? 0}`).sort().join('|');

/** As cópias embutidas estão em dia? (evita regravar a ficha à toa) */
export function embedsInSync(char: Character, next: { customSpells: Spell[]; customFeats: Feat[] }): boolean {
  return sig(char.customSpells) === sig(next.customSpells) && sig(char.customFeats) === sig(next.customFeats);
}

/** Ficha de outra pessoa (link compartilhado, mesa): acha as magias e talentos dela sem entrar na minha biblioteca. */
export function registerCharacterHomebrew(char: { customSpells?: Spell[]; customFeats?: Feat[] } | null | undefined): void {
  char?.customSpells?.forEach(registerSpell);
  char?.customFeats?.forEach(registerFeat);
}
