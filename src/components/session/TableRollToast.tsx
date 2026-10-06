import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { diceTrophy } from '@/data/diceTrophies';
import { DieChip } from '@/components/dice/DieChip';

/** Rolagem de outra pessoa da mesa: aparece por alguns segundos em qualquer tela. */
export function TableRollToast() {
  const e = useSessionStore((s) => s.lastTableRoll);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!e) return;
    setShown(e.id);
    const t = setTimeout(() => setShown(null), 5000);
    return () => clearTimeout(t);
  }, [e]);
  if (!e || shown !== e.id) return null;
  const p = e.payload as { who?: string; label?: string; total?: number; expr?: string; crit?: boolean; fail?: boolean; damage?: boolean; dice?: string };
  const trophy = diceTrophy(p.dice);
  return (
    <div className={'fv-tableroll' + (p.crit ? ' is-crit' : p.fail ? ' is-fail' : '') + (p.damage ? ' is-dmg' : '')} role="status" aria-live="polite" onClick={() => setShown(null)}>
      {trophy && (
        <span className="fv-tableroll-die" title={`Dado conquistado: ${trophy.skin.label}`}>
          <DieChip skin={trophy.skin} size={30} face={p.total ?? 20} />
        </span>
      )}
      <span className="fv-tableroll-who">{p.who}{e.visibility === 'master' ? ' · só pra você' : ''}</span>
      <span className="fv-tableroll-label">{String(p.label ?? '').replace(/^Rolagem /, '')}</span>
      <b>{p.total}</b>
      <small>{p.expr}{p.crit ? ' · crítico!' : p.fail ? ' · falha' : ''}</small>
    </div>
  );
}
