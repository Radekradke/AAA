import { useEffect, useRef, useState } from 'react';
import { myActiveCombatant, useSessionStore } from '@/store/sessionStore';

/**
 * "SEU TURNO": faixa que atravessa a tela quando começa o turno do meu
 * personagem (vale em qualquer tela do app enquanto estou na mesa).
 */
export function TurnBanner() {
  const key = useSessionStore((s) => s.myTurnKey);
  const mine = useSessionStore((s) => myActiveCombatant(s));
  const round = useSessionStore((s) => s.encounter?.round ?? 0);
  const [shown, setShown] = useState<string | null>(null);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!key || key === last.current || !mine) return;
    last.current = key;
    setShown(key);
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      /* sem vibração */
    }
  }, [key, mine]);

  // some sozinho: o timer depende só do aviso aberto (a mesa atualiza o
  // combatente toda hora, e isso não pode reiniciar/cancelar a saída)
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 3400);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown || !mine) return null;
  return (
    <div className="fv-turn-banner" role="alert" onClick={() => setShown(null)}>
      <div className="fv-turn-banner-band">
        <small>Rodada {round}</small>
        <b>SEU TURNO</b>
        <span>{mine.name} · ação, bônus, reação e movimento renovados</span>
      </div>
    </div>
  );
}
