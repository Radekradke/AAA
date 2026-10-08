import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { lastHeroOf } from '@/lib/lastHero';

/**
 * Atalho do app instalado ("Continuar"): abre direto a ficha aberta por
 * último. Sem herói ainda, cai na lista de heróis.
 */
export function Continue() {
  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const currentId = useCharacterStore((s) => s.currentId);
  const hydrated = useCharactersHydrated();
  if (!hydrated) return null;
  const hero = user ? lastHeroOf(characters, user.id, currentId) : null;
  return <Navigate to={hero ? `/ficha/${hero.id}` : '/personagens'} replace />;
}
