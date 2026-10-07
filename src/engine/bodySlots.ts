import type { InventoryItem } from '@/types/character';

/**
 * Onde um item mágico se veste (D&D 5e 2014, Guia do Mestre, "Vestindo e
 * empunhando itens"): até 2 anéis; um par de botas, de luvas/manoplas e de
 * braçadeiras, uma peça de cabeça e uma capa por vez. Cinto e veste também
 * ficam em 1 (bom senso de mesa). Pescoço, olhos e pedras Ioun não têm limite
 * na regra — o mestre decide.
 */
export type BodySlot = 'anel' | 'manto' | 'veste' | 'pes' | 'maos' | 'bracos' | 'cabeca' | 'olhos' | 'pescoco' | 'cintura' | 'orbita';

export interface BodySlotDef {
  label: string;
  /** Quantos ao mesmo tempo (null = sem limite na regra). */
  max: number | null;
  /** Como falar do tipo numa frase ("2 anéis", "um par de botas"). */
  what: string;
}

export const BODY_SLOTS: Record<BodySlot, BodySlotDef> = {
  anel: { label: 'Anel', max: 2, what: 'anéis' },
  manto: { label: 'Capa', max: 1, what: 'uma capa' },
  veste: { label: 'Veste', max: 1, what: 'uma veste' },
  pes: { label: 'Pés', max: 1, what: 'um par de botas' },
  maos: { label: 'Mãos', max: 1, what: 'um par de luvas ou manoplas' },
  bracos: { label: 'Braços', max: 1, what: 'um par de braçadeiras' },
  cabeca: { label: 'Cabeça', max: 1, what: 'uma peça de cabeça' },
  cintura: { label: 'Cintura', max: 1, what: 'um cinto' },
  olhos: { label: 'Olhos', max: null, what: 'lentes' },
  pescoco: { label: 'Pescoço', max: null, what: 'amuletos' },
  orbita: { label: 'Órbita', max: null, what: 'pedras Ioun' },
};

/** Pelo nome (vale para o catálogo, para itens editados e para homebrew com nome claro). */
const BY_NAME: [RegExp, BodySlot][] = [
  [/^anel\b/i, 'anel'],
  [/^(manto do arquimago|robe|t[úu]nica|veste)\b/i, 'veste'],
  [/^(manto|capa)\b/i, 'manto'],
  [/^(botas|sand[áa]lias|chinelos|sapatos)\b/i, 'pes'],
  [/^(luvas|manoplas)\b/i, 'maos'],
  [/^bra[çc]adeiras\b/i, 'bracos'],
  [/^(tiara|chap[ée]u|elmo|coroa|capacete|diadema|capuz)\b/i, 'cabeca'],
  [/^(óculos|oculos|olhos|lentes)\b/i, 'olhos'],
  [/^(amuleto|periapto|colar|medalh[ãa]o|pingente|talism[ãa])\b/i, 'pescoco'],
  [/^cinto\b/i, 'cintura'],
  [/^pedra ioun\b/i, 'orbita'],
];

/** Em que parte do corpo o item se veste (null = não é vestível: arma, poção, varinha…). */
export function bodySlotOf(it: Pick<InventoryItem, 'name' | 'category' | 'wear'>): BodySlot | null {
  if (it.wear === 'body') return null;
  if (it.category === 'ring') return 'anel';
  if (it.category !== 'wondrous' && it.wear !== 'worn') return null;
  const name = it.name.trim();
  for (const [re, slot] of BY_NAME) if (re.test(name)) return slot;
  return null;
}
