import { useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { CONDITIONS } from '@/data/conditions';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';
import { npcService } from '@/services/npcService';
import { toast } from '@/store/feedbackStore';
import type { Combatant } from '@/types/session';
import { hpWithUndo, removeWithUndo, toggleHiddenWithUndo } from '../actions';
import { useMaster } from '../context';
import { useMasterStore } from '../masterStore';
import { HeroSummary } from './HeroInspector';

const QUICK = [-10, -5, -1, 1, 5, 10];

/** Barra de PV + botões rápidos + campo "-7 / +5" (Enter aplica). Desfazer no aviso. */
export function HpControl({ c }: { c: Combatant }) {
  const [v, setV] = useState('');
  const apply = () => {
    const t = v.trim();
    if (!t) return;
    const n = Number(t);
    if (!Number.isFinite(n) || !n) return;
    // "-7"/"+5" é variação; número puro é o novo PV
    const base = c.hpCurrent ?? c.hpMax ?? 0;
    void hpWithUndo(c, /^[+-]/.test(t) ? n : n - base);
    setV('');
  };
  const pct = c.hpMax ? Math.max(0, Math.min(100, ((c.hpCurrent ?? 0) / c.hpMax) * 100)) : 0;
  return (
    <div className="fv-ins-hp">
      <div className="fv-ins-hp-top">
        <b>{c.hpCurrent ?? '?'}</b>
        <span>/ {c.hpMax ?? '?'} PV</span>
        {c.type === 'player' && <small>vai para a ficha</small>}
      </div>
      {c.hpMax !== null && (
        <div className="fv-ins-hp-bar" aria-hidden>
          <i style={{ width: `${pct}%` }} className={pct <= 25 ? 'is-low' : pct <= 50 ? 'is-mid' : ''} />
        </div>
      )}
      <div className="fv-ins-hp-btns">
        {QUICK.map((d) => (
          <button key={d} type="button" className={d < 0 ? 'is-dmg' : 'is-heal'} onClick={() => void hpWithUndo(c, d)} aria-label={d < 0 ? `${-d} de dano` : `${d} de cura`}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
        <input
          className="fv-input"
          inputMode="numeric"
          placeholder="-7 / +5"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          aria-label="Dano ou cura"
        />
      </div>
    </div>
  );
}

/** Combatente do encontro: PV, CA, iniciativa, condições, ocultar, remover, ficha do bestiário. */
export function CombatantInspector({ c }: { c: Combatant }) {
  const s = useSessionStore();
  const { npcs, reloadNpcs } = useMaster();
  const select = useMasterStore((m) => m.select);
  const [init, setInit] = useState(c.initiative?.toString() ?? '');
  const monster = c.monsterRef ? MONSTER_BY_ID[c.monsterRef] : undefined;
  const isTarget = s.targetId === c.id;
  const kept = npcs.some((n) => n.name === c.name);

  const toggleCond = (cond: string) => {
    const on = !c.conditions.includes(cond);
    if (c.type === 'player') void s.sendHeroCondition(c, cond, on);
    else void s.updateCombatant(c.id, { conditions: on ? [...c.conditions, cond] : c.conditions.filter((x) => x !== cond) });
  };

  // criatura inventada que os jogadores adoraram vira NPC da campanha (com os números no segredo)
  const keepAsNpc = async () => {
    try {
      const n = await npcService.save(
        s.campaignId!,
        { name: c.name.replace(/ #\d+$/, ''), revealed: !c.hidden, improvisedIn: null },
        { notes: '', stats: { ac: c.armorClass ?? undefined, hp: c.hpMax ?? undefined, initiativeBonus: c.initiativeBonus, monsterRef: c.monsterRef ?? undefined } },
      );
      reloadNpcs();
      toast(`${n.name} agora é NPC da campanha.`, { action: { label: 'Abrir', run: () => select({ kind: 'npc', id: n.id }) } });
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    }
  };

  return (
    <div className="fv-ins">
      <header className="fv-ins-head">
        <small>{c.type === 'player' ? 'Herói' : c.type === 'npc' ? 'NPC' : 'Criatura'}{c.hidden ? ' · oculto' : ''}</small>
        <h3>{c.name}</h3>
      </header>
      <HpControl c={c} />
      <div className="fv-ins-stats">
        <span>
          <small>CA</small>
          <b>{c.armorClass ?? '—'}</b>
        </span>
        <label>
          <small>Inic.</small>
          <input
            className="fv-input"
            inputMode="numeric"
            value={init}
            onChange={(e) => setInit(e.target.value)}
            onBlur={() => init.trim() !== '' && Number(init) !== c.initiative && void s.setInitiative(c.id, Number(init))}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            aria-label="Iniciativa"
          />
        </label>
        <span>
          <small>Bônus</small>
          <b>{c.initiativeBonus >= 0 ? `+${c.initiativeBonus}` : c.initiativeBonus}</b>
        </span>
      </div>
      <div className="fv-ins-acts">
        {c.type !== 'player' && (
          <button type="button" className={'fv-btn-ghost fv-bs-mini' + (isTarget ? ' is-on' : '')} onClick={() => s.setTarget(isTarget ? null : c.id)}>
            {isTarget ? '◎ Alvo' : 'Marcar alvo'}
          </button>
        )}
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void toggleHiddenWithUndo(c)}>
          {c.hidden ? 'Revelar' : 'Ocultar'}
        </button>
        {c.type !== 'player' && !kept && (
          <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void keepAsNpc()} title="Vira um NPC permanente, com estes números no segredo">
            Guardar como NPC
          </button>
        )}
        <button type="button" className="fv-btn-ghost fv-bs-mini is-danger" onClick={() => void removeWithUndo(c).then(() => select(null))}>
          Remover
        </button>
      </div>
      <div className="fv-ins-conds" aria-label="Condições">
        {CONDITIONS.filter((x) => x.id !== 'Exausto').map((x) => (
          <button key={x.id} type="button" className={c.conditions.includes(x.id) ? 'is-on' : ''} onClick={() => toggleCond(x.id)} title={x.short}>
            {x.label}
          </button>
        ))}
      </div>
      {c.type === 'player' && c.sheetId && <HeroSummary sheetId={c.sheetId} />}
      {monster && <MonsterStatBlock m={monster} who={c.name} attacker={c} targets={s.combatants} />}
    </div>
  );
}
