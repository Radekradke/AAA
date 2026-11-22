import { useEffect } from 'react';
import { myActiveCombatant, myOnDeckCombatant, useSessionStore } from '@/store/sessionStore';

const TAG = /^(⚔ SEU TURNO|⏳ Você é o próximo) · /;
const base = () => document.title.replace(TAG, '');

/**
 * Aba em segundo plano (o jogador foi ver a ficha num app, ou outra aba no
 * computador): o título da aba avisa "SEU TURNO" / "Você é o próximo" até ele
 * voltar. Com a aba à vista, o título fica como estava (só o prefixo entra e sai,
 * então o título que cada tela define continua valendo).
 */
export function useTurnTitle(): void {
  const mine = useSessionStore((s) => !!myActiveCombatant(s));
  const onDeck = useSessionStore((s) => !!myOnDeckCombatant(s));
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const apply = () => {
      const tag = mine ? '⚔ SEU TURNO' : onDeck ? '⏳ Você é o próximo' : null;
      document.title = tag && document.visibilityState === 'hidden' ? `${tag} · ${base()}` : base();
    };
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      document.title = base();
    };
  }, [mine, onDeck]);
}
