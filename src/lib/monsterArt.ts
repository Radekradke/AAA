import type { Monster } from '@/data/bestiary';

/**
 * A "cara" de cada criatura, nesta ordem:
 *  1) foto personalizada pelo mestre para a mesa (bestiário da mesa);
 *  2) arte oficial: basta soltar `src/assets/bestiario/<id>.webp` (ex.:
 *     `goblin.webp`, `young-red-dragon.webp`) — o app pega sozinho.
 *     Veja docs/ARTE-BESTIARIO.md (um prompt por criatura);
 *  3) emblema do tipo (crânio para morto-vivo, presa para fera…), com a
 *     cor do tipo — nada fica vazio.
 */
const ART: Record<string, string> = {};
for (const [path, url] of Object.entries(
  import.meta.glob('../assets/bestiario/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)) {
  const id = path.split('/').pop()!.replace(/\.[a-z]+$/i, '').toLowerCase();
  ART[id] = url;
}

/** Ids que já têm arte oficial (para o guia e os testes). */
export function bundledMonsterArt(): Record<string, string> {
  return ART;
}

export type MonsterTypeKey = 'beast' | 'humanoid' | 'undead' | 'monstrosity' | 'construct' | 'giant' | 'elemental' | 'fiend' | 'dragon';

export const MONSTER_TYPES: Record<MonsterTypeKey, { label: string; color: string }> = {
  beast: { label: 'Fera', color: '#6FA35A' },
  humanoid: { label: 'Humanoide', color: '#C2955A' },
  undead: { label: 'Morto-vivo', color: '#8E9FBF' },
  monstrosity: { label: 'Monstruosidade', color: '#B8613F' },
  construct: { label: 'Constructo', color: '#8A8F98' },
  giant: { label: 'Gigante', color: '#A07A4E' },
  elemental: { label: 'Elemental', color: '#4F9FC4' },
  fiend: { label: 'Corruptor', color: '#C2412F' },
  dragon: { label: 'Dragão', color: '#D19A1E' },
};

/** "Morto-vivo (metamorfo)" → undead. Tipo desconhecido vira monstruosidade. */
export function monsterTypeKey(type: string): MonsterTypeKey {
  const t = type.toLowerCase();
  if (t.startsWith('fera')) return 'beast';
  if (t.startsWith('humanoide')) return 'humanoid';
  if (t.startsWith('morto')) return 'undead';
  if (t.startsWith('constructo')) return 'construct';
  if (t.startsWith('gigante')) return 'giant';
  if (t.startsWith('elemental')) return 'elemental';
  if (t.startsWith('corruptor') || t.startsWith('ínfero') || t.startsWith('infero')) return 'fiend';
  if (t.startsWith('dragão') || t.startsWith('dragao')) return 'dragon';
  return 'monstrosity';
}

/** Personalização da mesa (foto e nome que o mestre escolheu). */
export interface MonsterCustom {
  name?: string | null;
  portrait?: string | null;
}

export interface MonsterLook {
  name: string;
  /** Imagem (foto da mesa ou arte oficial); null = usar o emblema. */
  art: string | null;
  artSource: 'custom' | 'official' | null;
  /** Tipo (dá o emblema e a cor). */
  type: MonsterTypeKey;
  color: string;
}

export function monsterLook(m: Pick<Monster, 'id' | 'name' | 'type'>, custom?: MonsterCustom | null): MonsterLook {
  const type = monsterTypeKey(m.type);
  const t = MONSTER_TYPES[type];
  const official = ART[m.id] ?? null;
  const art = custom?.portrait || official;
  return {
    name: custom?.name?.trim() || m.name,
    art,
    artSource: custom?.portrait ? 'custom' : official ? 'official' : null,
    type,
    color: t.color,
  };
}
