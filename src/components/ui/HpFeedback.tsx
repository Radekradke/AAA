import { useEffect, useRef, useState } from 'react';

/**
 * Feedback de vida no estilo dos jogos ("juice"), leve e sem libs:
 * - rastro: ao levar dano, um pedaço claro da barra fica para trás e
 *   escorre logo depois — dá para VER quanto foi perdido;
 * - número flutuante: −5 / +3 sobe e some perto do PV;
 * - pulso: o número treme (dano) ou brilha (cura) uma vez.
 * Respeita "reduzir movimento" (o CSS desliga as animações).
 */

/**
 * Diferenças recentes de um valor (cada mudança vira um "pop" com id).
 * `scope` = de quem é o valor: trocar de alvo não conta como dano/cura.
 */
export function useValueDelta(value: number | null | undefined, scope?: string) {
  const prev = useRef(value);
  const prevScope = useRef(scope);
  const [pops, setPops] = useState<{ id: number; delta: number }[]>([]);
  const [pulse, setPulse] = useState<{ id: number; kind: 'dmg' | 'heal' } | null>(null);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const before = prev.current;
    const sameScope = prevScope.current === scope;
    prev.current = value;
    prevScope.current = scope;
    if (!sameScope) {
      setPops([]);
      setPulse(null);
      return;
    }
    if (before == null || value == null || before === value) return;
    const delta = value - before;
    const id = ++seq.current;
    setPops((p) => [...p.slice(-2), { id, delta }]);
    setPulse({ id, kind: delta < 0 ? 'dmg' : 'heal' });
    // cada número some sozinho, mesmo se outro chegar logo em seguida
    const h = setTimeout(() => {
      setPops((p) => p.filter((x) => x.id !== id));
      timers.current = timers.current.filter((x) => x !== h);
    }, 1100);
    timers.current.push(h);
  }, [value, scope]);

  return { pops, pulse };
}

/** Números que sobem do PV (posicione o pai como relative). */
export function HpPops({ pops, className = '' }: { pops: { id: number; delta: number }[]; className?: string }) {
  return (
    <span className={'fv-hp-pops ' + className} aria-hidden>
      {pops.map((p) => (
        <b key={p.id} className={p.delta < 0 ? 'is-dmg' : 'is-heal'}>
          {p.delta > 0 ? `+${p.delta}` : `−${-p.delta}`}
        </b>
      ))}
    </span>
  );
}

/**
 * Rastro do dano dentro da barra (o pai precisa de position: relative e
 * overflow: hidden). Fica no tamanho antigo e escorre até o novo.
 */
export function HpTrail({ pct }: { pct: number }) {
  const [trail, setTrail] = useState(pct);
  useEffect(() => {
    if (pct >= trail) {
      setTrail(pct); // cura: acompanha na hora
      return;
    }
    const t = setTimeout(() => setTrail(pct), 420);
    return () => clearTimeout(t);
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  return <i className="fv-hp-trail" style={{ width: `${Math.max(pct, trail)}%` }} aria-hidden />;
}
