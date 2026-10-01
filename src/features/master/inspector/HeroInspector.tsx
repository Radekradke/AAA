import { useMemo } from 'react';
import { deriveCharacter } from '@/engine/dndRules';
import { characterResources } from '@/engine/classResources';
import { heroSubtitle } from '@/lib/summary';
import { modStr } from '@/engine/dice';
import { useSessionStore } from '@/store/sessionStore';
import { useMaster } from '../context';
import { useMasterStore } from '../masterStore';
import { HpControl } from './CombatantInspector';

/** Resumo da ficha vinculada (snapshot que o jogador sincronizou). */
export function HeroSummary({ sheetId }: { sheetId: string }) {
  const { heroes } = useMaster();
  const hero = heroes.find((h) => h.share.sheetId === sheetId);
  const snap = hero?.snapshot ?? null;
  const d = useMemo(() => (snap ? deriveCharacter(snap) : null), [snap]);
  if (!snap || !d) return <p className="fv-bs-hint">A ficha deste herói ainda não está visível (o jogador precisa sincronizar).</p>;
  const skills = d.skills.filter((sk) => sk.proficient).sort((a, b) => b.bonus - a.bonus).slice(0, 6);
  const res = characterResources(snap).filter((r) => !r.unlimited && r.max > 0);
  return (
    <div className="fv-ins-hero">
      <div className="fv-ins-stats">
        <span>
          <small>CA</small>
          <b>{d.ac}</b>
        </span>
        <span>
          <small>Perc. pass.</small>
          <b>{d.passivePerception}</b>
        </span>
        <span>
          <small>Iniciativa</small>
          <b>{modStr(d.initiative)}</b>
        </span>
        <span>
          <small>Desloc.</small>
          <b>{String(d.speed).replace('.', ',')}m</b>
        </span>
      </div>
      {skills.length > 0 && (
        <div className="fv-ins-tags">
          {skills.map((sk) => (
            <span key={sk.key}>
              {sk.label} <b>{modStr(sk.bonus)}</b>
            </span>
          ))}
        </div>
      )}
      {snap.combat.conditions.length > 0 && <p className="fv-ins-line">Condições: {snap.combat.conditions.join(', ')}</p>}
      {res.length > 0 && (
        <ul className="fv-ins-res">
          {res.map((r) => (
            <li key={r.id}>
              {r.label}
              <b>
                {Math.min(r.max, snap.combat.resources[r.id] ?? r.max)}/{r.max}
              </b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Herói da mesa: ficha resumida, PV (se estiver no encontro) e dar item. */
export function HeroInspector({ sheetId }: { sheetId: string }) {
  const { heroes } = useMaster();
  const openQuick = useMasterStore((m) => m.openQuick);
  const inFight = useSessionStore((s) => s.combatants.find((c) => c.sheetId === sheetId) ?? null);
  const hero = heroes.find((h) => h.share.sheetId === sheetId);
  const snap = hero?.snapshot ?? null;
  return (
    <div className="fv-ins">
      <header className="fv-ins-head">
        <small>Herói{snap ? ` · nível ${snap.level}` : ''}</small>
        <h3>{snap?.name ?? 'Herói'}</h3>
        {snap && <p className="fv-ins-line">{heroSubtitle(snap)}</p>}
      </header>
      {inFight ? (
        <HpControl c={inFight} />
      ) : (
        snap && (
          <p className="fv-ins-line">
            PV {snap.hpCurrent} (fora do encontro — dano e cura passam pelo encontro)
          </p>
        )
      )}
      <HeroSummary sheetId={sheetId} />
      <div className="fv-ins-acts">
        <button type="button" className="fv-btn-gold fv-bs-mini" onClick={() => openQuick('item', { sheetId })}>
          Dar item
        </button>
      </div>
    </div>
  );
}
