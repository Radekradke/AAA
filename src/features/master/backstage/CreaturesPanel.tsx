import { stageDragProps } from '@/lib/stageDrop';
import { useMemo, useState } from 'react';
import { MONSTERS } from '@/data/bestiary';
import { monsterCombatants } from '@/components/session/BestiaryPicker';
import { useSessionStore } from '@/store/sessionStore';
import { useMasterStore } from '../masterStore';
import { addToEncounter } from '../actions';
import { TrayStar } from './SessionPanel';
import { monsterLook } from '@/lib/monsterArt';
import { useBestiaryStore } from '@/services/bestiaryService';
import { MonsterPortrait } from '@/components/bestiary/MonsterPortrait';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * CRIATURAS: bestiário com busca (pt/en, tipo, ND), um toque põe no encontro
 * (o encontro abre sozinho se não houver), ☆ separa na bandeja e o toque no
 * nome abre a ficha no inspetor. Criatura inventada fica na barra de improviso.
 */
export function CreaturesPanel() {
  const select = useMasterStore((m) => m.select);
  const openQuick = useMasterStore((m) => m.openQuick);
  const s = useSessionStore();
  const customs = useBestiaryStore((b) => b.customs);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState(1);
  const list = useMemo(() => {
    const t = norm(q.trim());
    const f = t ? MONSTERS.filter((m) => norm(`${m.name} ${customs[m.id]?.name ?? ''} ${m.en} ${m.type} nd ${m.cr}`).includes(t)) : MONSTERS;
    return f.slice(0, 60);
  }, [q, customs]);
  const enc = s.encounter;
  const pending = s.combatants.filter((c) => c.type !== 'player' && c.initiative === null).length;
  const foes = s.combatants.filter((c) => c.type !== 'player').length;

  return (
    <div className="fv-bs-stack">
      <div className="fv-bs-tools">
        <input className="fv-input" type="search" placeholder="Goblin, dragão, ND 2…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar no bestiário" />
        <label className="fv-bs-qty" title="Quantas por toque">
          ×
          <input className="fv-input" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label="Quantidade" />
        </label>
      </div>
      <button type="button" className="fv-btn-ghost fv-bs-btn" onClick={() => openQuick('criatura')}>
        + Criatura inventada (nome, CA, PV)
      </button>
      {enc && foes > 0 && (
        <div className="fv-bs-row">
          <button type="button" className="fv-btn-gold fv-bs-btn" disabled={s.busy || pending === 0} onClick={() => void s.rollEnemies(false)}>
            Rolar iniciativa{pending ? ` (${pending})` : ''}
          </button>
          <button type="button" className="fv-btn-ghost fv-bs-btn" disabled={s.busy} onClick={() => void s.rollEnemies(true)}>
            Rolar todos de novo
          </button>
        </div>
      )}
      <ul className="fv-bs-list">
        {list.map((m) => {
          const look = monsterLook(m, customs[m.id]);
          return (
          <li key={m.id}>
            <button type="button" className="fv-bs-item fv-bs-item-face" onClick={() => select({ kind: 'monster', ref: m.id })} {...stageDragProps({ kind: 'monster', ref: m.id, qty }, qty > 1 ? `${qty}× ${look.name}` : look.name)}>
              <MonsterPortrait look={look} size={34} round />
              <span className="fv-bs-item-text">
              <b>{look.name}</b>
              <small>
                ND {m.cr} · CA {m.ac} · {m.hp} PV · {m.type}
              </small>
              </span>
            </button>
            <div className="fv-bs-item-acts">
              <TrayStar kind="monsters" id={m.id} label={m.name} />
              <button
                type="button"
                className="fv-bs-mini fv-btn-gold"
                disabled={s.busy}
                title={`Pôr ${qty} no encontro`}
                onClick={() => void addToEncounter(monsterCombatants(m, qty, { hpMode: 'average', hidden: false, together: true }))}
              >
                +{qty}
              </button>
            </div>
          </li>
          );
        })}
      </ul>
      {list.length === 60 && <p className="fv-bs-hint">Mostrando 60 — refine a busca.</p>}
    </div>
  );
}
