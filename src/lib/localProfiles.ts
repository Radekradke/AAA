import type { Character } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';
import { GUEST_ID, isCloudUserId } from './identity';

/**
 * Perfis deste aparelho. A lista de heróis mostra só os do perfil atual, então
 * um herói criado como convidado ficava invisível depois de entrar numa conta
 * local — continuava salvo, mas ninguém o via. Aqui ficam o resgate
 * automático (convidado → conta que entrou) e a lista do resgate manual.
 */

/** Heróis do convidado passam para a conta local que acabou de entrar ou ser criada. */
export function adoptGuestHeroes(ownerId: string): void {
  if (!ownerId || ownerId === GUEST_ID) return;
  const run = () => {
    const store = useCharacterStore.getState();
    const ids = store.characters.filter((c) => c.ownerId === GUEST_ID).map((c) => c.id);
    if (ids.length) store.adoptCharacters(ids, ownerId);
  };
  // antes da hidratação a lista está vazia: adotar ali não acharia ninguém
  if (useCharacterStore.persist.hasHydrated()) run();
  else {
    const unsub = useCharacterStore.persist.onFinishHydration(() => {
      unsub();
      run();
    });
  }
}

/**
 * Heróis de OUTROS perfis locais deste aparelho (convidado ou outra conta
 * local) — os que a pessoa logada não vê na lista. Fichas de outra conta da
 * nuvem ficam de fora: pertencem àquela conta.
 */
export function otherLocalHeroes(characters: Character[], userId: string): Character[] {
  return characters
    .filter((c) => !c.draft && c.ownerId !== userId && !isCloudUserId(c.ownerId))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export interface HeroRescue {
  /** Sem dono ativo (convidado ou perfil que não existe mais): pode trazer. */
  claimable: Character[];
  /** De outra conta local que existe: só avisa onde estão (aparelho dividido). */
  elsewhere: { ownerId: string; name: string; count: number }[];
}

/**
 * O que o aviso de resgate mostra. Heróis do convidado ou de um perfil apagado
 * podem vir para quem está aqui; os de outra conta local continuam dela — num
 * aparelho da família, um irmão não "pega" o herói do outro sem querer.
 */
export function heroRescue(
  characters: Character[],
  userId: string,
  accounts: readonly { id: string; name: string }[],
): HeroRescue {
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const claimable: Character[] = [];
  const counts = new Map<string, number>();
  for (const c of otherLocalHeroes(characters, userId)) {
    const owner = names.get(c.ownerId);
    if (owner === undefined || c.ownerId === GUEST_ID) claimable.push(c);
    else counts.set(c.ownerId, (counts.get(c.ownerId) ?? 0) + 1);
  }
  const elsewhere = [...counts].map(([ownerId, count]) => ({ ownerId, name: names.get(ownerId) ?? '', count }));
  return { claimable, elsewhere };
}
