import type { BodySlot } from './bodySlots';

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

/** Fallback puro para definir o catálogo sem importar o próprio catálogo. */
export function bodySlotFromName(it: { name: string; category: string; wear?: string }): BodySlot | null {
  if (it.wear === 'body') return null;
  if (it.category === 'ring') return 'anel';
  if (it.category !== 'wondrous' && it.wear !== 'worn') return null;
  for (const [re, slot] of BY_NAME) if (re.test(it.name.trim())) return slot;
  return null;
}
