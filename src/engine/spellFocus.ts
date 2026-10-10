import type { Character, InventoryItem } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { getItem } from '@/data/items';
import { containerOf } from './inventory';

/**
 * Componentes materiais (PHB 2014, cap. 10): uma bolsa de componentes ou o
 * foco de conjuração da classe substitui os materiais SEM custo. Material
 * com preço (diamante de 300 po…) precisa existir de verdade — e some se a
 * magia diz que consome.
 */

const ARCANE = new Set(['sorcerer', 'warlock', 'wizard']);
const HOLY = new Set(['cleric', 'paladin']);

/** Foco que cada classe pode usar. */
function focusKind(classId: string): 'arcane' | 'druidic' | 'holy' | 'instrument' | null {
  if (ARCANE.has(classId)) return 'arcane';
  if (classId === 'druid') return 'druidic';
  if (HOLY.has(classId)) return 'holy';
  if (classId === 'bard') return 'instrument';
  return null;
}

function isFocus(it: InventoryItem, kind: NonNullable<ReturnType<typeof focusKind>>): boolean {
  const id = it.itemId ?? '';
  const group = getItem(id)?.group ?? '';
  if (kind === 'arcane') return id.startsWith('g-focus-') || group === 'Varinhas, cajados e bastões';
  if (kind === 'druidic') return id.startsWith('g-druidic-');
  if (kind === 'holy') return id.startsWith('g-holy-');
  return id.startsWith('g-inst-');
}

/** Como o herói cobre os materiais sem custo: o nome do foco/bolsa, ou null se não tem. */
export function materialCover(char: Character): string | null {
  const classes = (char.classLevels ?? []).filter((c) => c.level > 0).map((c) => c.classId);
  const kinds = (classes.length ? classes : [char.classId]).map(focusKind).filter((k): k is NonNullable<typeof k> => !!k);
  // bolsa ou foco precisam estar com o herói (no Baú não contam)
  const carried = char.inventory.filter((i) => containerOf(char, i) !== 'bau');
  const pouch = carried.find((i) => i.itemId === 'g-componentpouch');
  if (pouch) return pouch.name;
  for (const k of kinds) {
    const f = carried.find((i) => isFocus(i, k));
    if (f) return f.name;
  }
  return null;
}

/** Material com preço (precisa existir de verdade). */
export function costlyMaterial(spell: Spell): string | null {
  return spell.material && /\d[\d.]*\s*po\b/.test(spell.material) ? spell.material : null;
}

/**
 * Aviso de componentes ao conjurar: material com custo sempre lembra; sem
 * custo, só avisa quando não há foco nem bolsa.
 */
export function materialWarning(char: Character, spell: Spell): { line?: string; warn?: string } {
  if (!/\bM\b/.test(spell.components ?? '')) return {};
  const costly = costlyMaterial(spell);
  if (costly) return { line: `Material: ${costly}${/consumid/.test(costly) ? '' : ' (não é consumido)'}` };
  if (materialCover(char)) return {};
  return { warn: 'Sem foco de conjuração nem bolsa de componentes: você precisa ter os materiais desta magia à mão.' };
}
