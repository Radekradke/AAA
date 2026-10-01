import { useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { EncounterDifficulty, XpAward, heroCombatant } from '@/components/session/MasterDeck';
import { useMasterStore } from '../masterStore';
import { useMaster, heroName } from '../context';

/**
 * ENCONTRO: os dois caminhos valem igual — preparar com nome e heróis, ou
 * simplesmente sair pondo criaturas (o encontro abre sozinho). Aqui ficam os
 * heróis, a dificuldade, o XP e quem está na luta (toque abre o inspetor).
 */
export function EncounterPanel() {
  const s = useSessionStore();
  const { heroes } = useMaster();
  const select = useMasterStore((m) => m.select);
  const [name, setName] = useState('');
  const enc = s.encounter;

  if (!s.session) return <p className="fv-bs-hint">O combate vive dentro da sessão: abra a sessão em Sessão.</p>;

  if (!enc) {
    return (
      <div className="fv-bs-stack">
        <section className="fv-bs-card">
          <div className="fv-bs-card-head">
            <b>Novo encontro</b>
          </div>
          <p className="fv-bs-hint">Prepare com nome e heróis — ou só ponha criaturas pelo bestiário ou pela barra de improviso: o encontro abre sozinho.</p>
          <input className="fv-input" placeholder="Emboscada na estrada (opcional)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="fv-bs-row">
            <button type="button" className="fv-btn-gold fv-bs-btn" disabled={s.busy} onClick={() => void s.createEncounter(name || undefined).then(() => setName(''))}>
              Preparar encontro
            </button>
            {heroes.length > 0 && (
              <button
                type="button"
                className="fv-btn-ghost fv-bs-btn"
                disabled={s.busy}
                onClick={async () => {
                  await s.createEncounter(name || undefined);
                  if (useSessionStore.getState().encounter) await s.addCombatants(heroes.map(heroCombatant));
                  setName('');
                }}
              >
                + com todos os heróis
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  const inFight = new Set(s.combatants.map((c) => c.sheetId).filter(Boolean));
  const missing = heroes.filter((h) => !inFight.has(h.share.sheetId));
  const order = [...s.combatants].sort((a, b) => a.turnOrder - b.turnOrder);
  return (
    <div className="fv-bs-stack">
      <section className="fv-bs-card">
        <div className="fv-bs-card-head">
          <b>Heróis da mesa</b>
          {missing.length > 1 && (
            <button type="button" className="fv-live-link" disabled={s.busy} onClick={() => void s.addCombatants(missing.map(heroCombatant))}>
              Todos
            </button>
          )}
        </div>
        {heroes.length === 0 && <p className="fv-bs-hint">Nenhuma ficha vinculada. Os jogadores vinculam na sala da mesa.</p>}
        <div className="fv-live-chips">
          {heroes.map((h) => {
            const added = inFight.has(h.share.sheetId);
            return (
              <button key={h.share.id} type="button" className={'fv-live-chip' + (added ? ' is-on' : '')} disabled={added || s.busy} onClick={() => void s.addCombatant(heroCombatant(h))}>
                {added ? '✓ ' : '+ '}
                {heroName(h)}
              </button>
            );
          })}
        </div>
      </section>
      <section className="fv-bs-card">
        <div className="fv-bs-card-head">
          <b>Na luta</b>
          <small>{order.length}</small>
        </div>
        <ul className="fv-bs-list">
          {order.map((c) => (
            <li key={c.id}>
              <button type="button" className="fv-bs-item" onClick={() => select({ kind: 'combatant', id: c.id })}>
                <b>
                  {c.name}
                  {c.hidden && <em className="fv-bs-tag is-muted">oculto</em>}
                </b>
                <small>
                  Inic. {c.initiative ?? '—'}
                  {c.hpMax !== null && ` · ${c.hpCurrent ?? '?'}/${c.hpMax} PV`}
                  {c.armorClass !== null && ` · CA ${c.armorClass}`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <EncounterDifficulty heroes={heroes} />
      <XpAward />
    </div>
  );
}
