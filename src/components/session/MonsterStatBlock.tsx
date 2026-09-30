import { useState } from 'react';
import type { Monster, MonsterAction } from '@/data/bestiary';
import { abilityMod, damageDice } from '@/engine/monsters';
import { roll } from '@/engine/dice';
import { withExtraDice } from '@/engine/damageExtras';
import { useUiStore } from '@/store/uiStore';
import { ABILITY_SHORT } from '@/data/skills';
import type { AbilityKey } from '@/types/dnd';

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * Bloco de estatísticas do monstro (SRD 5.1) — para o mestre. Cada ataque
 * rola o d20 e o dano (com o tipo extra, ex.: +2d6 fogo); crítico dobra os dados.
 */
export function MonsterStatBlock({ m, who, compact }: { m: Monster; who?: string; compact?: boolean }) {
  const pushRoll = useUiStore((s) => s.pushRoll);
  const [crit, setCrit] = useState<Record<string, boolean>>({});
  const label = who ?? m.name;

  const attack = (a: MonsterAction) => {
    const r = roll(20, { modifier: a.toHit ?? 0, label: `${label} · ${a.name}` });
    pushRoll(r);
    setCrit((c) => ({ ...c, [a.name]: r.crit }));
  };
  const damage = (a: MonsterAction) => {
    const d = a.damage ? damageDice(a.damage) : null;
    if (!d) return;
    const isCrit = !!crit[a.name];
    const base = d.count
      ? roll(d.sides, { count: d.count * (isCrit ? 2 : 1), modifier: d.bonus, label: `${label} · ${a.name}${isCrit ? ' · crítico' : ''}`, damage: true })
      : { ...roll(1, { count: 1, modifier: d.bonus - 1, label: `${label} · ${a.name}`, damage: true }) };
    const x = a.extra ? damageDice(a.extra.damage) : null;
    pushRoll(x && x.count ? withExtraDice(base, [{ count: x.count, die: x.sides, type: a.extra!.type, source: a.name }], isCrit, x.bonus) : base);
    setCrit((c) => ({ ...c, [a.name]: false }));
  };

  return (
    <div className={'fv-mstat' + (compact ? ' is-compact' : '')}>
      <div className="fv-mstat-head">
        <b>{m.name}</b>
        <small>{m.size} · {m.type} · ND {m.cr} ({m.xp.toLocaleString('pt-BR')} XP)</small>
      </div>
      <div className="fv-mstat-core">
        <span><b>CA</b> {m.ac}{m.acNote ? ` (${m.acNote})` : ''}</span>
        <span><b>PV</b> {m.hp} ({m.hpDice})</span>
        <span><b>Desl.</b> {m.speed}</span>
      </div>
      <div className="fv-mstat-abil">
        {KEYS.map((k) => (
          <span key={k}><small>{ABILITY_SHORT[k]}</small><b>{m.abilities[k]}</b><i>{sign(abilityMod(m.abilities[k]))}</i></span>
        ))}
      </div>
      {!compact && (
        <div className="fv-mstat-lines">
          {m.saves && <p><b>Salvaguardas</b> {m.saves}</p>}
          {m.skills && <p><b>Perícias</b> {m.skills}</p>}
          {m.vuln && <p><b>Vulnerável</b> {m.vuln}</p>}
          {m.resist && <p><b>Resistência</b> {m.resist}</p>}
          {m.immune && <p><b>Imunidade</b> {m.immune}</p>}
          {m.senses && <p><b>Sentidos</b> {m.senses}</p>}
          {m.languages && <p><b>Idiomas</b> {m.languages}</p>}
        </div>
      )}
      {!!m.traits?.length && (
        <div className="fv-mstat-traits">
          {m.traits.map((t) => <p key={t.name}><b>{t.name}.</b> {t.desc}</p>)}
        </div>
      )}
      <div className="fv-mstat-actions">
        <div className="fv-label">Ações</div>
        {m.multiattack && <p className="fv-mstat-multi"><b>Multiataque.</b> {m.multiattack}</p>}
        {m.actions.map((a) => (
          <div key={a.name} className="fv-mstat-action">
            <div className="fv-mstat-action-text">
              <b>{a.name}</b>
              {a.recharge && <small> (recarga {a.recharge})</small>}
              <span>
                {a.toHit !== undefined && `${sign(a.toHit)} para acertar · `}
                {a.reach && `${a.reach} · `}
                {a.damage && `${a.damage} ${a.type ?? ''}`}
                {a.extra && ` + ${a.extra.damage} ${a.extra.type}`}
                {a.save && ` · ${ABILITY_SHORT[a.save.ability]} CD ${a.save.dc}${a.save.half ? ' (metade)' : ''}`}
              </span>
              {a.note && <em>{a.note}</em>}
            </div>
            <span className="fv-mstat-btns">
              {a.toHit !== undefined && (
                <button type="button" onClick={() => attack(a)} title="Rolar ataque">{sign(a.toHit)}</button>
              )}
              {a.damage && (
                <button type="button" className={'is-dmg' + (crit[a.name] ? ' is-crit' : '')} onClick={() => damage(a)} title={crit[a.name] ? 'Crítico: dados dobrados' : 'Rolar dano'}>
                  {crit[a.name] ? 'Dano ×2' : 'Dano'}
                </button>
              )}
            </span>
          </div>
        ))}
        {m.reactions?.map((r) => <p key={r.name} className="fv-mstat-multi"><b>{r.name}.</b> {r.desc}</p>)}
      </div>
    </div>
  );
}
