import { SPELLS } from '@/data/spells';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { GEAR } from '@/data/gear';
import { MAGIC_ITEMS } from '@/data/magicItems';
import { MONSTERS } from '@/data/bestiary';
import { CLASSES } from '@/data/classes';
import { RARITY } from '@/data/themes';
import { bundledItemArt } from './itemArt';
import { bundledSpellArt } from './spellArt';
import { bundledMonsterArt, MONSTER_TYPES, monsterTypeKey } from './monsterArt';
import { heroArtKeys } from './summary';
import { voiceKeys } from './voices';

/**
 * Contador de artes (Configurações → Avançado): quantas imagens já existem
 * em cada pasta de src/assets e o que ainda falta. Conta sozinho a partir
 * dos arquivos que entram no build — soltou o arquivo, o número sobe.
 */
export interface ArtEntry {
  id: string;
  name: string;
}
export interface ArtGroup {
  label: string;
  have: number;
  total: number;
  missing: ArtEntry[];
}
export interface ArtCategory {
  key: string;
  label: string;
  /** Pasta onde as artes entram. */
  folder: string;
  /** Guia com o id e o prompt de cada uma. */
  guide: string;
  have: number;
  total: number;
  groups: ArtGroup[];
}

interface Thing extends ArtEntry {
  group: string;
}

function category(key: string, label: string, folder: string, guide: string, things: Thing[], has: (id: string) => boolean, order?: string[]): ArtCategory {
  const byGroup = new Map<string, ArtGroup>();
  for (const t of things) {
    const g = byGroup.get(t.group) ?? { label: t.group, have: 0, total: 0, missing: [] };
    g.total++;
    if (has(t.id)) g.have++;
    else g.missing.push({ id: t.id, name: t.name });
    byGroup.set(t.group, g);
  }
  const groups = [...byGroup.values()];
  if (order) groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  return { key, label, folder, guide, have: groups.reduce((n, g) => n + g.have, 0), total: things.length, groups };
}

/** Versões +1/+2/+3 usam a arte da arma/armadura base: não contam. */
const notEnchanted = (id: string) => !/-plus[123]$/.test(id);
const circle = (lv: number) => (lv === 0 ? 'Truques' : `${lv}º círculo`);
const CIRCLES = Array.from({ length: 10 }, (_, i) => circle(i));
const RARITY_ORDER = ['comum', 'incomum', 'raro', 'muito-raro', 'lendario'].map((r) => RARITY[r]?.label ?? r);

export function artInventory(): ArtCategory[] {
  const spellArt = bundledSpellArt();
  const itemArt = bundledItemArt();
  const monsterArt = bundledMonsterArt();
  const heroes = heroArtKeys();
  const voices = voiceKeys();
  const classPairs = CLASSES.flatMap((c) => (['masc', 'fem'] as const).map((g) => ({ id: `${c.id}-${g}`, name: `${c.label} ${g === 'fem' ? 'feminina' : 'masculino'}`, group: c.label })));

  return [
    category('magias', 'Magias', 'src/assets/magias', 'docs/ARTE-MAGIAS.md', SPELLS.map((s) => ({ id: s.id, name: s.name, group: circle(s.level) })), (id) => !!spellArt[id], CIRCLES),
    category(
      'armas',
      'Armas',
      'src/assets/itens',
      'docs/ARTE-ITENS.md',
      WEAPONS.filter((w) => notEnchanted(w.id)).map((w) => ({ id: w.id, name: w.name, group: w.weapon?.type === 'martial' ? 'Marciais' : 'Simples' })),
      (id) => !!itemArt[id],
      ['Simples', 'Marciais'],
    ),
    category(
      'armaduras',
      'Armaduras e escudos',
      'src/assets/itens',
      'docs/ARTE-ITENS.md',
      ARMORS.filter((a) => notEnchanted(a.id)).map((a) => ({ id: a.id, name: a.name, group: a.category === 'shield' ? 'Escudos' : 'Armaduras' })),
      (id) => !!itemArt[id],
      ['Armaduras', 'Escudos'],
    ),
    category('equipamento', 'Equipamento', 'src/assets/itens', 'docs/ARTE-ITENS.md', GEAR.map((g) => ({ id: g.id, name: g.name, group: g.group ?? 'Outros' })), (id) => !!itemArt[id]),
    category(
      'magicos',
      'Itens mágicos',
      'src/assets/itens',
      'docs/ARTE-ITENS.md',
      MAGIC_ITEMS.map((m) => ({ id: m.id, name: m.name, group: RARITY[m.rarity]?.label ?? m.rarity })),
      (id) => !!itemArt[id],
      RARITY_ORDER,
    ),
    category('criaturas', 'Criaturas', 'src/assets/bestiario', 'docs/ARTE-BESTIARIO.md', MONSTERS.map((m) => ({ id: m.id, name: m.name, group: MONSTER_TYPES[monsterTypeKey(m.type)].label })), (id) => !!monsterArt[id]),
    category('retratos', 'Retratos das classes', 'src/assets/herois', 'docs/ARTE-PERSONAGENS.md', classPairs, (id) => !!heroes[id]),
    category('vozes', 'Vozes das classes', 'src/assets/vozes', 'src/assets/vozes/LEIA-ME.md', classPairs, (id) => !!voices[id]),
  ];
}

/** Total geral (todas as categorias). */
export function artTotals(cats: ArtCategory[]): { have: number; total: number } {
  return cats.reduce((acc, c) => ({ have: acc.have + c.have, total: acc.total + c.total }), { have: 0, total: 0 });
}

export const pct = (have: number, total: number) => (total ? Math.round((have / total) * 100) : 0);
