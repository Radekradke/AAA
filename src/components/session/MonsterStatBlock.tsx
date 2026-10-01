import { useState } from 'react';
import type { Monster, MonsterAction } from '@/data/bestiary';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { useSessionStore } from '@/store/sessionStore';
import { DEFENSE_LABEL, applyDefense, attackHits, defenseFor } from '@/engine/strike';
import type { DefenseMode } from '@/engine/strike';
import type { Combatant } from '@/types/session';
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
interface Strike {
  action: string;
  target: Combatant;
  /** null = ataque de salvaguarda (sem rolagem de acerto). */
  total: number | null;
  hit: boolean;
  crit: boolean;
  raw: number;
  applied: number;
  defense: DefenseMode;
  type?: string;
  /** Salvaguarda: dano rolado esperando o mestre dizer se passou ou falhou. */
  pendingSave?: { dc: number; ability: string; half: boolean };
}

/**
 * Bloco de estatísticas do monstro (SRD 5.1) — para o mestre. Fora da mesa,
 * cada ataque rola o d20 e o dano. Na mesa (com `targets`), o mestre escolhe
 * o ALVO e "Atacar" resolve tudo: d20 contra a CA, dano (crítico dobra os
 * dados), resistências do alvo — e o PV já cai, com desfazer.
 */
export function MonsterStatBlock({ m, who, compact, attacker, targets }: { m: Monster; who?: string; compact?: boolean; attacker?: Combatant | null; targets?: Combatant[] }) {
  const pushRoll = useUiStore((s) => s.pushRoll);
  const session = useSessionStore();
  const [crit, setCrit] = useState<Record<string, boolean>>({});
  const [last, setLast] = useState<Strike | null>(null);
  const label = who ?? m.name;
  const inTable = !!targets;
  const options = (targets ?? []).filter((c) => c.id !== attacker?.id);
  const target = options.find((c) => c.id === session.targetId) ?? null;

  /** Rola o dano de uma ação separando base e extra (cada um com seu tipo). */
  const rollDamageParts = (a: MonsterAction, isCrit: boolean): { base: number; extra: number } => {
    const d = a.damage ? damageDice(a.damage) : null;
    const x = a.extra ? damageDice(a.extra.damage) : null;
    let base = 0, extra = 0;
    if (d) {
      const r = d.count ? roll(d.sides, { count: d.count * (isCrit ? 2 : 1), modifier: d.bonus, label: `${label} · ${a.name}${isCrit ? ' · crítico' : ''}`, damage: true }) : null;
      base = r ? r.total : d.bonus;
      if (r) pushRoll(r);
    }
    if (x && x.count) {
      const r = roll(x.sides, { count: x.count * (isCrit ? 2 : 1), modifier: x.bonus, label: `${label} · ${a.name} · ${a.extra!.type}`, damage: true });
      pushRoll(r);
      extra = r.total;
    }
    return { base: Math.max(0, base), extra: Math.max(0, extra) };
  };

  const defs = (c: Combatant) => {
    const mm = c.monsterRef ? MONSTER_BY_ID[c.monsterRef] : null;
    return mm ? { vuln: mm.vuln, resist: mm.resist, immune: mm.immune } : {};
  };

  const strike = async (a: MonsterAction) => {
    if (!target) return;
    const natural = a.toHit !== undefined ? roll(20, { modifier: a.toHit, label: `${label} → ${target.name} · ${a.name}` }) : null;
    if (natural) pushRoll(natural);
    const res = natural ? attackHits(natural.total, natural.rolls[0], target.armorClass) : { hit: true, crit: false };
    if (!res.hit) {
      setLast({ action: a.name, target, total: natural?.total ?? null, hit: false, crit: false, raw: 0, applied: 0, defense: 'normal', type: a.type });
      void session.logStrike({ by: label, target: target.name, hit: false, crit: false, damage: 0, type: a.type }, !!attacker?.hidden);
      return;
    }
    const { base, extra } = rollDamageParts(a, res.crit);
    const dBase = defenseFor(a.type, defs(target));
    const dExtra = a.extra ? defenseFor(a.extra.type, defs(target)) : 'normal';
    const raw = base + extra;
    const applied = applyDefense(base, dBase) + applyDefense(extra, dExtra);
    const defense: DefenseMode = dBase !== 'normal' ? dBase : dExtra;
    if (a.save) {
      // salvaguarda: espera o mestre dizer se o alvo passou
      setLast({ action: a.name, target, total: null, hit: true, crit: false, raw, applied, defense, type: a.type, pendingSave: { dc: a.save.dc, ability: ABILITY_SHORT[a.save.ability], half: !!a.save.half } });
      return;
    }
    await session.changeHp(target, -applied, { crit: res.crit });
    setLast({ action: a.name, target, total: natural?.total ?? null, hit: true, crit: res.crit, raw, applied, defense, type: a.type });
    void session.logStrike({ by: label, target: target.name, hit: true, crit: res.crit, damage: applied, type: a.type, note: DEFENSE_LABEL[defense] || undefined }, !!attacker?.hidden);
  };

  const resolveSave = async (passed: boolean) => {
    if (!last?.pendingSave) return;
    const amount = passed ? (last.pendingSave.half ? Math.floor(last.applied / 2) : 0) : last.applied;
    await session.changeHp(last.target, -amount);
    void session.logStrike({ by: label, target: last.target.name, hit: !passed, crit: false, damage: amount, type: last.type, note: passed ? 'passou na salvaguarda' : 'falhou na salvaguarda' }, !!attacker?.hidden);
    setLast({ ...last, applied: amount, pendingSave: undefined, hit: amount > 0 });
  };

  /** Ajuste depois de aplicado (o mestre sabe de algo que o app não sabe). */
  const adjust = async (next: number) => {
    if (!last || last.pendingSave) return;
    const fresh = useSessionStore.getState().combatants.find((c) => c.id === last.target.id) ?? last.target;
    await session.changeHp(fresh, last.applied - next);
    setLast({ ...last, applied: next });
  };

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
        {inTable && (
          <div className="fv-strike-targets" role="group" aria-label="Alvo">
            <span>Alvo</span>
            {options.length === 0 && <em>ninguém no encontro</em>}
            {options.map((c) => (
              <button
                key={c.id}
                type="button"
                className={'fv-strike-chip' + (c.id === session.targetId ? ' is-on' : '') + (c.type === 'player' ? ' is-hero' : '') + ((c.hpCurrent ?? 1) <= 0 ? ' is-down' : '')}
                aria-pressed={c.id === session.targetId}
                onClick={() => session.setTarget(c.id === session.targetId ? null : c.id)}
              >
                {c.name}
                <small>CA {c.armorClass ?? '?'} · {c.hpCurrent ?? '?'}{c.hpMax ? `/${c.hpMax}` : ''}</small>
              </button>
            ))}
          </div>
        )}
        {inTable && last && (
          <div className={'fv-strike-result' + (last.hit ? ' is-hit' : ' is-miss') + (last.crit ? ' is-crit' : '')} role="status">
            {last.pendingSave ? (
              <>
                <b>{last.action} em {last.target.name}</b>
                <span>{last.raw} de dano rolado · salvaguarda de {last.pendingSave.ability} CD {last.pendingSave.dc}</span>
                <span className="fv-strike-actions">
                  <button type="button" onClick={() => void resolveSave(false)}>Falhou ({last.applied})</button>
                  <button type="button" onClick={() => void resolveSave(true)}>Passou ({last.pendingSave.half ? Math.floor(last.applied / 2) : 0})</button>
                </span>
              </>
            ) : last.hit ? (
              <>
                <b>{last.crit ? 'CRÍTICO! ' : 'Acertou '}{last.target.name}{last.total !== null ? ` (${last.total} vs CA ${last.target.armorClass ?? '?'})` : ''}</b>
                <span>
                  −{last.applied} PV{last.type ? ` ${last.type}` : ''}
                  {last.applied !== last.raw && ` (rolou ${last.raw}${last.defense !== 'normal' ? ` · ${DEFENSE_LABEL[last.defense]}` : ''})`}
                </span>
                <span className="fv-strike-actions">
                  <button type="button" onClick={() => void adjust(Math.floor(last.raw / 2))} title="Resistência: metade">½</button>
                  <button type="button" onClick={() => void adjust(last.raw * 2)} title="Vulnerável: dobro">×2</button>
                  <button type="button" onClick={() => void adjust(0)}>Desfazer</button>
                </span>
              </>
            ) : (
              <>
                <b>Errou {last.target.name}</b>
                <span>{last.total !== null ? `${last.total} vs CA ${last.target.armorClass ?? '?'}` : ''}</span>
              </>
            )}
          </div>
        )}
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
              {inTable && (a.toHit !== undefined || a.save) && a.damage && (
                <button type="button" className="is-strike" disabled={!target} onClick={() => void strike(a)} title={target ? `Atacar ${target.name}` : 'Escolha um alvo acima'}>
                  {a.save ? 'Em alvo' : 'Atacar'}
                </button>
              )}
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
