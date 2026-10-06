import { useState } from 'react';
import { healthState, initiativeRows } from '@/engine/encounter';
import type { InitiativeRow } from '@/engine/encounter';
import type { Combatant, Encounter } from '@/types/session';
import { useSessionStore } from '@/store/sessionStore';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { useMonsterLook } from '@/services/bestiaryService';
import { MonsterPortrait } from '@/components/bestiary/MonsterPortrait';
import { CONDITIONS } from '@/data/conditions';
import { MonsterStatBlock } from './MonsterStatBlock';
import { heroTitle } from '@/engine/titles';
import { tableHero } from '@/lib/tableHeroes';

const HEALTH_LABEL: Record<ReturnType<typeof healthState>, string> = {
  ileso: 'Ileso',
  ferido: 'Ferido',
  sangrando: 'Sangrando',
  caído: 'Caído',
  desconhecido: '',
};

/**
 * Trilha de iniciativa compartilhada: todos veem a MESMA ordem e o mesmo
 * turno (vêm do banco). O mestre ganha os controles de cada linha; o
 * jogador vê a própria linha em destaque e a vida dos inimigos só como
 * "ferido/sangrando" (sem números).
 */
export function InitiativeTrack({ encounter, combatants, isMaster, userId }: { encounter: Encounter; combatants: Combatant[]; isMaster: boolean; userId: string }) {
  const rows = initiativeRows(combatants, encounter.activeCombatantId);
  if (!rows.length) {
    return (
      <div className="fv-live-empty">
        {isMaster ? 'Adicione heróis e criaturas ao encontro.' : 'O mestre está preparando o encontro…'}
      </div>
    );
  }
  return (
    <ol className="fv-live-track" aria-label="Ordem de iniciativa">
      {rows.map((row) => (
        <TrackRow key={row.key} row={row} isMaster={isMaster} mine={row.members.some((m) => m.ownerId === userId)} />
      ))}
    </ol>
  );
}

function TrackRow({ row, isMaster, mine }: { row: InitiativeRow; isMaster: boolean; mine: boolean }) {
  const [open, setOpen] = useState(false);
  const lead = row.lead;
  const kind = lead.type === 'player' ? 'hero' : lead.type === 'npc' ? 'npc' : 'foe';
  const cls = ['fv-live-row', `is-${kind}`, row.active && 'is-active', row.defeated && 'is-down', mine && 'is-mine', lead.hidden && 'is-hidden'].filter(Boolean).join(' ');
  return (
    <li className={cls} aria-current={row.active ? 'step' : undefined}>
      <div className="fv-live-row-main">
        <span className="fv-live-init" title="Iniciativa">{row.initiative ?? '—'}</span>
        {lead.monsterRef && <TrackFace monsterRef={lead.monsterRef} />}
        <div className="fv-live-name">
          <b>{row.label}</b>
          <small>
            {row.active && <em className="fv-live-now">{mine ? 'SEU TURNO' : 'agindo'}</em>}
            {lead.type === 'player' ? 'Herói' : lead.type === 'npc' ? 'NPC' : 'Criatura'}
            {lead.hidden && ' · oculto'}
            {!isMaster && lead.type !== 'player' && HEALTH_LABEL[healthState(lead.hpCurrent, lead.hpMax)] && ` · ${HEALTH_LABEL[healthState(lead.hpCurrent, lead.hpMax)]}`}
            {lead.initiative === null && ' · aguardando iniciativa'}
          </small>
          {lead.conditions.length > 0 && (
            <span className="fv-live-conds">{lead.conditions.map((c) => <i key={c}>{c}</i>)}</span>
          )}
        </div>
        {isMaster && (
          <div className="fv-live-row-stats">
            {lead.armorClass !== null && <span title="Classe de Armadura">CA {lead.armorClass}</span>}
            {row.members.length === 1 && lead.hpMax !== null && <span title="Pontos de vida">{lead.hpCurrent ?? '?'}/{lead.hpMax}</span>}
          </div>
        )}
        {isMaster && (
          <button type="button" className="fv-live-row-more" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="Editar">
            {open ? '×' : '⋯'}
          </button>
        )}
      </div>
      {isMaster && open && (
        <div className="fv-live-row-edit">
          {row.members.map((m) => <MemberEditor key={m.id} c={m} />)}
          {lead.monsterRef && MONSTER_BY_ID[lead.monsterRef] && <MonsterStatBlock m={MONSTER_BY_ID[lead.monsterRef]} who={lead.name} compact />}
        </div>
      )}
    </li>
  );
}

/** Mestre: iniciativa, PV (aceita "-7"/"+5"), visibilidade e remover. */
function MemberEditor({ c }: { c: Combatant }) {
  const s = useSessionStore();
  const [init, setInit] = useState(c.initiative?.toString() ?? '');
  const [hp, setHp] = useState('');
  const applyHp = () => {
    const v = hp.trim();
    if (!v) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    const base = c.hpCurrent ?? c.hpMax ?? 0;
    const next = /^[+-]/.test(v) ? base + n : n;
    // herói: vira ordem para a ficha do jogador (que aplica sozinha) — "-7" dano, "+5" cura
    if (c.type === 'player') {
      const delta = /^[+-]/.test(v) ? n : n - base;
      if (delta) void s.sendHeroHp(c, delta);
      setHp('');
      return;
    }
    const clamped = Math.max(0, c.hpMax !== null ? Math.min(c.hpMax, next) : next);
    void s.updateCombatant(c.id, { hp_current: clamped });
    setHp('');
  };
  const toggleCond = (cond: string) => {
    const on = !c.conditions.includes(cond);
    if (c.type === 'player') void s.sendHeroCondition(c, cond, on);
    else void s.updateCombatant(c.id, { conditions: on ? [...c.conditions, cond] : c.conditions.filter((x) => x !== cond) });
  };
  return (
    <div className="fv-live-member">
      <span className="fv-live-member-name">
        {c.name}
        {c.type === 'player' && heroTitle(tableHero(c.sheetId)) && <small className="fv-hero-title-inline">{heroTitle(tableHero(c.sheetId))}</small>}
      </span>
      <label>
        Inic.
        <input
          className="fv-input"
          inputMode="numeric"
          value={init}
          onChange={(e) => setInit(e.target.value)}
          onBlur={() => init.trim() !== '' && Number(init) !== c.initiative && void s.setInitiative(c.id, Number(init))}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        />
      </label>
      {(
        <label title={c.type === 'player' ? 'Dano/cura vai direto para a ficha do jogador' : undefined}>
          PV {c.hpCurrent ?? '?'}{c.hpMax !== null ? `/${c.hpMax}` : ''}{c.type === 'player' ? ' → ficha' : ''}
          <input
            className="fv-input"
            placeholder="-7 / +5"
            inputMode="numeric"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyHp()}
            onBlur={applyHp}
          />
        </label>
      )}
      <button type="button" className="fv-btn-ghost" onClick={() => void s.updateCombatant(c.id, { hidden: !c.hidden })}>
        {c.hidden ? 'Revelar' : 'Ocultar'}
      </button>
      <button type="button" className="fv-btn-ghost is-danger" onClick={() => void s.removeCombatant(c.id)}>
        Remover
      </button>
      <span className="fv-live-conds-edit" aria-label="Condições">
        {CONDITIONS.filter((x) => x.id !== 'Exausto').map((x) => (
          <button key={x.id} type="button" className={c.conditions.includes(x.id) ? 'is-on' : ''} onClick={() => toggleCond(x.id)} title={x.short}>
            {x.label}
          </button>
        ))}
      </span>
    </div>
  );
}

/** Rosto da criatura na faixa de iniciativa (foto da mesa, arte oficial ou emblema). */
function TrackFace({ monsterRef }: { monsterRef: string }) {
  const look = useMonsterLook(monsterRef);
  return look ? <MonsterPortrait look={look} size={30} round className="fv-live-face" /> : null;
}
