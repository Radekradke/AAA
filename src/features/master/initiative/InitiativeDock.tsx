import { stageDragProps } from '@/lib/stageDrop';
import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { confirmAction } from '@/store/feedbackStore';
import { healthState } from '@/engine/encounter';
import { useMasterStore } from '../masterStore';
import { startCombatSmart } from '../actions';
import { heroTitle } from '@/engine/titles';
import { tableHero } from '@/lib/tableHeroes';
import type { Combatant } from '@/types/session';
import { useShallow } from 'zustand/react/shallow';
import { InlineIcon } from '@/components/ui/Icon';

/** Título do herói (ficha compartilhada da mesa). */
const titleOf = (c: Combatant) => (c.type === 'player' ? heroTitle(tableHero(c.sheetId)) : null);

/**
 * INICIATIVA sempre à vista durante o encontro: a ordem numa faixa (o da vez
 * aceso, quem não rolou marcado) e os controles de turno. Tocar num nome
 * abre o inspetor. A ordem e o turno continuam sendo decididos no banco
 * (start_combat / advance_turn com revisão) — aqui só chama.
 */
export function InitiativeDock() {
  const s = useSessionStore(useShallow((st) => ({ encounter: st.encounter, combatants: st.combatants, busy: st.busy, startCombat: st.startCombat, nextTurn: st.nextTurn, prevTurn: st.prevTurn, setEncounterStatus: st.setEncounterStatus })));
  const select = useMasterStore((m) => m.select);
  const selection = useMasterStore((m) => m.selection);
  const enc = s.encounter;
  const rowRef = useRef<HTMLOListElement | null>(null);
  const order = [...s.combatants].sort((a, b) => a.turnOrder - b.turnOrder);

  // atalhos do mestre no computador: Alt+. próximo turno, Alt+, turno anterior
  // (Alt+seta é voltar/avançar página no navegador); nunca enquanto digita
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || (e.code !== 'Period' && e.code !== 'Comma')) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const st = useSessionStore.getState();
      if (st.encounter?.status !== 'active' || st.busy) return;
      e.preventDefault();
      void (e.code === 'Period' ? st.nextTurn() : st.prevTurn());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // o da vez fica sempre visível na faixa
  useEffect(() => {
    rowRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [enc?.activeCombatantId]);

  if (!enc) return null;
  const noInit = s.combatants.filter((c) => c.initiative === null).length;

  return (
    <div className="fv-initdock" role="region" aria-label="Iniciativa">
      <div className="fv-initdock-round" aria-label={`Rodada ${enc.round}`}>
        <small>{enc.status === 'preparing' ? 'Preparando' : 'Rodada'}</small>
        {/* nova rodada: o número vira com um estalo */}
        <b key={enc.round}>{enc.status === 'preparing' ? '—' : enc.round}</b>
      </div>
      <ol className="fv-initdock-order" ref={rowRef}>
        {order.length === 0 && <li className="fv-initdock-empty">Ponha heróis e criaturas no encontro.</li>}
        {order.map((c) => {
          const active = c.id === enc.activeCombatantId;
          const hs = c.type !== 'player' ? healthState(c.hpCurrent, c.hpMax) : null;
          const sel = selection?.kind === 'combatant' && selection.id === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={['fv-initdock-chip', `is-${c.type}`, active && 'is-active', sel && 'is-sel', c.hidden && 'is-hidden', hs === 'caído' && 'is-down', c.initiative === null && 'is-pending']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => select({ kind: 'combatant', id: c.id })}
                aria-current={active ? 'step' : undefined}
                {...stageDragProps({ kind: 'combatant', id: c.id }, c.name)}
                title={`${c.name}${titleOf(c) ? `, ${titleOf(c)}` : ''}${c.hidden ? ' (oculto)' : ''} — arraste para o mapa`}
              >
                <span className="fv-initdock-init">{c.initiative ?? '?'}</span>
                <span className="fv-initdock-name">
                  {c.name}
                  {titleOf(c) && <small className="fv-hero-title-inline">{titleOf(c)}</small>}
                </span>
                {c.hpMax !== null && c.type !== 'player' && (
                  <span className="fv-initdock-hp" aria-label={`${c.hpCurrent ?? '?'} de ${c.hpMax} PV`}>
                    <i style={{ width: `${Math.max(0, Math.min(100, ((c.hpCurrent ?? 0) / c.hpMax) * 100))}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="fv-initdock-ctl">
        {enc.status === 'preparing' && (
          <>
            {noInit > 0 && <small className="fv-initdock-note">{noInit} sem iniciativa</small>}
            <button type="button" className="fv-btn-gold fv-initdock-main" disabled={s.busy || s.combatants.length === 0} onClick={() => void startCombatSmart()}>
              Iniciar combate
            </button>
          </>
        )}
        {enc.status === 'active' && (
          <>
            <button type="button" className="fv-btn-ghost fv-initdock-btn" disabled={s.busy} onClick={() => void s.prevTurn()} aria-label="Turno anterior" title="Turno anterior (Alt+,)" aria-keyshortcuts="Alt+Comma">
              <InlineIcon name="prev" />
            </button>
            <button type="button" className="fv-btn-gold fv-initdock-main" disabled={s.busy} onClick={() => void s.nextTurn()} title="Próximo turno (Alt+.)" aria-keyshortcuts="Alt+Period">
              Próximo <InlineIcon name="play" size={11} />
            </button>
            <button type="button" className="fv-btn-ghost fv-initdock-btn" disabled={s.busy} onClick={() => void s.setEncounterStatus('paused')} aria-label="Pausar combate" title="Pausar">
              <InlineIcon name="pause" />
            </button>
          </>
        )}
        {enc.status === 'paused' && (
          <button type="button" className="fv-btn-gold fv-initdock-main" disabled={s.busy} onClick={() => void s.setEncounterStatus('active')}>
            Retomar
          </button>
        )}
        <button
          type="button"
          className="fv-btn-ghost fv-initdock-btn is-danger"
          disabled={s.busy}
          aria-label="Encerrar encontro"
          title="Encerrar encontro"
          onClick={async () => (await confirmAction({ title: 'Encerrar este encontro?', message: 'A sessão continua aberta.', confirmLabel: 'Encerrar', danger: true })) && void s.setEncounterStatus('finished')}
        >
          <InlineIcon name="close" />
        </button>
      </div>
    </div>
  );
}
