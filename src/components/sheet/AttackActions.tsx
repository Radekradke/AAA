import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Character } from '@/types/character';
import type { DerivedAttack } from '@/engine/dndRules';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { damageExpr } from '@/engine/combat';
import { modStr } from '@/engine/dice';
import { hasMark, rollWeaponDamage, smiteDice, weaponExtras } from '@/engine/damageExtras';
import type { ExtrasChoice, MarkId } from '@/engine/damageExtras';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { calcLore } from '@/lib/lore';
import { attacksPerAction } from '@/engine/extraAttack';
import { ammoStatus } from '@/engine/ammo';
import type { AmmoKind } from '@/engine/ammo';
import { toast } from '@/store/feedbackStore';
import { deriveCharacter } from '@/engine/dndRules';
import { monkState } from '@/engine/monk';
import { battleMasterState } from '@/engine/fighter';
import { ABILITY_SHORT } from '@/data/skills';

interface Props {
  char: Character;
  atk: DerivedAttack;
  hitStyle: CSSProperties;
  dmgStyle: CSSProperties;
  subStyle: CSSProperties;
  dmgSub: ReactNode;
}

/** Disparo que gastou munição (o "acertou?" mostra e deixa desfazer). */
type Shot = { kind: AmmoKind; left: number };
type Stage = { kind: 'attack'; total: number; crit: boolean; fail: boolean; shot?: Shot; precise?: number } | { kind: 'damage' } | null;

/**
 * Botões ACERTO / DANO da arma. O ataque abre o "acertou?"; o dano junta
 * tudo que soma no acerto — crítico, versátil, Ataque Furtivo (1×/turno),
 * Destruição Divina (gasta espaço), Bruxaria, Marca do Caçador e Fúria.
 * Arco, besta, funda e zarabatana gastam 1 peça de munição por disparo.
 */
export function AttackActions({ char, atk, hitStyle, dmgStyle, subStyle, dmgSub }: Props) {
  const { attack, rollDice } = useDiceRoller();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const store = useCharacterStore();
  const [stage, setStage] = useState<Stage>(null);
  const [choice, setChoice] = useState<ExtrasChoice>({});
  const avail = weaponExtras(char, atk);
  // Mestre de Batalha: manobras que somam o dado de superioridade (só com arma)
  const bm = useMemo(() => {
    if (!atk.weapon) return null;
    const d = deriveCharacter(char);
    return battleMasterState(char, d.proficiency, d.abilities.str.mod, d.abilities.dex.mod);
  }, [char, atk.weapon]);
  const maneuvers = bm && bm.left > 0 ? bm.damage : [];
  // Monge 5º: Golpe Atordoante (1 ki num acerto corpo a corpo)
  const monk = useMemo(() => {
    const d = deriveCharacter(char);
    return monkState(char, d.proficiency, d.abilities.wis.mod, d.abilities.dex.mod);
  }, [char]);
  const stunOk = !!monk?.stunning && (atk.range ?? 'melee') === 'melee' && monk.kiLeft > 0;
  const [stun, setStun] = useState(false);
  const hasOptions =
    !!atk.versatileDie || !!avail.sneak || !!avail.smite || avail.improvedSmite || avail.hex || avail.huntersMark || !!avail.rage || !!avail.lifedrinker || maneuvers.length > 0 || stunOk;

  const openDamage = (crit: boolean) => {
    // Furtivo já ligado por padrão quando ainda não foi usado neste turno
    setChoice({ crit, sneak: !!avail.sneak && !avail.sneak.used, lifedrinker: !!avail.lifedrinker });
    setStun(false);
    setStage({ kind: 'damage' });
  };

  const roll = (shot?: Shot) => {
    // Ataque Imprudente (Bárbaro 2º): vantagem nos ataques corpo a corpo com FOR neste turno
    const reckless = hasMark(char, 'reckless') && (atk.range ?? 'melee') === 'melee' && atk.ability === 'str';
    // Assassinar (Assassino 3º) e Voto de Inimizade (Vingança 3º): vantagem no ataque
    const assassin = hasMark(char, 'assassinate') || hasMark(char, 'vow');
    const dis = useUiStore.getState().rollMode === 'disadvantage';
    const r = attack(atk, reckless || assassin ? { advantage: !dis, disadvantage: false } : {});
    setStage({ kind: 'attack', total: r.total, crit: r.crit, fail: r.fail, shot });
  };

  const onAttack = () => {
    const res = store.fireAmmo(char.id, atk.uid);
    if (!res) return roll();
    if (res.ok) return roll({ kind: res.kind, left: res.left });
    // sem munição à mão: avisa, e o jogador decide (o mestre pode ter dado flechas fora da ficha)
    toast(`Sem ${res.kind.many} ${res.reason === 'stored' ? 'à mão — estão no Baú' : 'na Mochila'}.`, {
      tone: 'danger',
      action: { label: 'Atirar assim', run: () => roll() },
    });
  };

  const undoShot = (shot: Shot) => {
    store.refundAmmo(char.id, shot.kind);
    setStage((st) => (st?.kind === 'attack' ? { ...st, shot: undefined } : st));
  };

  const rollIt = (c: ExtrasChoice) => {
    const r = rollWeaponDamage(char, atk, avail, c);
    pushRoll(r);
    if (avail.sneak && c.sneak && !avail.sneak.used) store.useSneakAttack(char.id);
    if (avail.smite && c.smiteLevel) store.castWithSlot(char.id, c.smiteLevel);
    if (c.maneuver && bm) {
      store.setResource(char.id, 'superiority', bm.left - 1);
      const m = bm.damage.find((x) => x.id === c.maneuver!.id);
      if (m) toast(`${m.label}: ${m.save ? `salvaguarda de ${ABILITY_SHORT[m.save]} CD ${bm.dc} ou ` : ''}${m.effect}.`, { tone: 'info' });
    }
    if (stun && stunOk && monk) {
      store.setResource(char.id, 'ki', monk.kiLeft - 1);
      toast(`Golpe Atordoante: salvaguarda de CON CD ${monk.dc} ou o alvo fica Atordoado até o fim do seu próximo turno.`, { tone: 'info' });
    }
    setStage(null);
  };

  const onDamage = () => {
    if (stage) return setStage(null);
    if (!hasOptions) return rollIt({});
    openDamage(false);
  };

  const mark = (m: MarkId) => store.setMark(char.id, m, !hasMark(char, m));
  const chip = (on: boolean, label: ReactNode, onClick: () => void, opts: { disabled?: boolean; title?: string } = {}) => (
    <button type="button" className={'fv-atk-chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={onClick} disabled={opts.disabled} title={opts.title}>
      {label}
    </button>
  );

  return (
    <span className="fv-cast fv-atk">
      <LoreTooltip info={calcLore(`Ataque · ${atk.name}`, atk.hitBreakdown, { intro: '1d20 + os bônus abaixo. Compare com a CA do alvo.' })}>
        <button type="button" onClick={onAttack} style={hitStyle}>
          {modStr(atk.attackBonus)}
          <div style={subStyle}>ACERTO</div>
        </button>
      </LoreTooltip>
      <LoreTooltip info={calcLore(`Dano · ${atk.name}`, atk.damageBreakdown, { intro: `${atk.damageDice}d${atk.damageDie} ${atk.damageType} + os bônus abaixo (crítico: dobre os dados).` })}>
        <button type="button" onClick={onDamage} style={dmgStyle} aria-expanded={!!stage}>
          {damageExpr(atk)}
          <div style={subStyle}>{dmgSub}</div>
        </button>
      </LoreTooltip>

      {stage?.kind === 'attack' && (
        <span className="fv-cast-pop fv-panel fv-cast-hit" role="dialog" aria-label={`${atk.name}: acertou?`}>
          <span className="fv-cast-hit-head">
            <span className="fv-cast-pop-title">Acertou o alvo?</span>
            <button type="button" className="fv-cast-hit-close" onClick={() => setStage(null)} aria-label="Fechar">×</button>
          </span>
          <span className={'fv-cast-hit-row' + (stage.crit ? ' is-crit' : stage.fail ? ' is-miss' : '')}>
            <span className="fv-cast-hit-total">
              <b>{stage.total}</b>
              {stage.crit && <em>crítico!</em>}
              {stage.fail && <em>1 natural · erra</em>}
            </span>
          </span>
          {stage.shot && (
            <span className="fv-ammo-shot">
              <span>
                −1 {stage.shot.kind.one} · {stage.shot.left === 0 ? <b>era a última!</b> : `sobram ${stage.shot.left}`}
              </span>
              <button type="button" onClick={() => undoShot(stage.shot!)}>Desfazer</button>
            </span>
          )}
          {bm?.precision && bm.left > 0 && !stage.crit && !stage.fail && !stage.precise && (
            <button
              type="button"
              className="fv-atk-chip"
              title="Ataque Preciso: gasta 1 dado de superioridade e soma ao ataque (antes de saber se acertou)"
              onClick={() => {
                const r = rollDice(bm.die, { label: 'Ataque Preciso' });
                store.setResource(char.id, 'superiority', bm.left - 1);
                setStage((st) => (st?.kind === 'attack' ? { ...st, total: st.total + r.total, precise: r.total } : st));
              }}
            >
              Ataque Preciso +1d{bm.die} <small>({bm.left} dados)</small>
            </button>
          )}
          {stage.precise && <small className="fv-atk-precise">Ataque Preciso: +{stage.precise} no ataque</small>}
          {stage.fail ? (
            <button type="button" className="fv-cast-hit-go" onClick={() => setStage(null)}>Errou — fechar</button>
          ) : (
            <span className="fv-atk-row">
              <button type="button" className="fv-cast-hit-go" onClick={() => (hasOptions || stage.crit ? openDamage(stage.crit) : rollIt({}))}>
                {stage.crit ? 'Crítico — dano' : 'Acertou — dano'}
              </button>
              <button type="button" className="fv-atk-miss" onClick={() => setStage(null)}>Errou</button>
            </span>
          )}
        </span>
      )}

      {stage?.kind === 'damage' && (
        <span className="fv-cast-pop fv-panel fv-cast-hit fv-atk-pop" role="dialog" aria-label={`Dano de ${atk.name}`}>
          <span className="fv-cast-hit-head">
            <span className="fv-cast-pop-title">Dano · {atk.name}</span>
            <button type="button" className="fv-cast-hit-close" onClick={() => setStage(null)} aria-label="Fechar">×</button>
          </span>
          <span className="fv-atk-chips">
            {chip(!!choice.crit, hasMark(char, 'assassinate') ? 'Crítico (alvo surpreso: Assassinar)' : 'Crítico (dobra os dados)', () => setChoice((c) => ({ ...c, crit: !c.crit })), {
              title: hasMark(char, 'assassinate') ? 'Acertar uma criatura surpresa é crítico automático (Assassinar).' : undefined,
            })}
            {atk.versatileDie && chip(!!choice.versatile, `Duas mãos (1d${atk.versatileDie})`, () => setChoice((c) => ({ ...c, versatile: !c.versatile })))}
          </span>

          {avail.sneak && (
            <span className="fv-atk-group">
              {chip(!!choice.sneak && !avail.sneak.used, `Ataque Furtivo +${avail.sneak.dice}d6`, () => setChoice((c) => ({ ...c, sneak: !c.sneak })), {
                disabled: avail.sneak.used,
                title: 'Com vantagem, ou com um aliado a 1,5 m do alvo (e sem desvantagem). Uma vez por turno.',
              })}
              <small>{avail.sneak.used ? 'já usado neste turno' : '1× por turno'}</small>
            </span>
          )}

          {avail.smite && (
            <span className="fv-atk-group">
              <small>Destruição Divina (gasta espaço)</small>
              <span className="fv-atk-chips">
                {chip(!choice.smiteLevel, 'Não', () => setChoice((c) => ({ ...c, smiteLevel: 0 })))}
                {avail.smite.slots.map((s) =>
                  chip(choice.smiteLevel === s.lv, `${s.lv}º · ${smiteDice(s.lv, choice.smiteUndead)}d8`, () => setChoice((c) => ({ ...c, smiteLevel: s.lv })), {
                    title: `${s.left} espaço${s.left > 1 ? 's' : ''} de ${s.lv}º círculo`,
                  }),
                )}
                {avail.smite.slots.length === 0 && <small>sem espaços livres</small>}
              </span>
              {!!choice.smiteLevel && chip(!!choice.smiteUndead, 'Alvo morto-vivo ou corruptor (+1d8)', () => setChoice((c) => ({ ...c, smiteUndead: !c.smiteUndead })))}
            </span>
          )}

          {maneuvers.length > 0 && bm && (
            <span className="fv-atk-group">
              <small>Manobra · gasta 1 dado de superioridade (+1d{bm.die}) · CD {bm.dc} · {bm.left}/{bm.max} dados</small>
              <span className="fv-atk-chips">
                {chip(!choice.maneuver, 'Nenhuma', () => setChoice((c) => ({ ...c, maneuver: undefined })))}
                {maneuvers.map((m) =>
                  chip(choice.maneuver?.id === m.id, `${m.label} +1d${bm.die}`, () => setChoice((c) => ({ ...c, maneuver: c.maneuver?.id === m.id ? undefined : { id: m.id, label: m.label, die: bm.die } })), {
                    title: `${m.save ? `Salvaguarda de ${ABILITY_SHORT[m.save]} CD ${bm.dc}: ` : ''}${m.effect}`,
                  }),
                )}
              </span>
            </span>
          )}

          {stunOk && monk && (
            <span className="fv-atk-group">
              <small>Monge · {monk.kiLeft}/{monk.kiMax} ki</small>
              <span className="fv-atk-chips">
                {chip(stun, `Golpe Atordoante (1 ki · CON CD ${monk.dc})`, () => setStun((v) => !v), {
                  title: 'Ao acertar corpo a corpo: gaste 1 ki; o alvo faz salvaguarda de CON ou fica Atordoado até o fim do seu próximo turno.',
                })}
              </span>
            </span>
          )}

          {(avail.hex || avail.huntersMark || avail.rage || avail.improvedSmite || avail.lifedrinker) && (
            <span className="fv-atk-group">
              <small>Ligados (valem em todo acerto)</small>
              <span className="fv-atk-chips">
                {avail.rage && chip(hasMark(char, 'rage'), `Em Fúria +${avail.rage.bonus}`, () => (hasMark(char, 'rage') ? store.endRage(char.id) : store.startRage(char.id)), { title: 'Entrar em Fúria gasta 1 uso e a ação bônus (o painel de Fúria fica na aba Combate)' })}
                {avail.hex && chip(hasMark(char, 'hex'), 'Bruxaria +1d6 necrótico', () => mark('hex'))}
                {avail.huntersMark && chip(hasMark(char, 'huntersMark'), 'Marca do Caçador +1d6', () => mark('huntersMark'))}
                {avail.improvedSmite && <span className="fv-atk-fixed">Destruição Aprimorada +1d8 radiante</span>}
                {avail.lifedrinker &&
                  chip(!!choice.lifedrinker, `Bebedor de Vida +${avail.lifedrinker.bonus} necrótico`, () => setChoice((c) => ({ ...c, lifedrinker: !c.lifedrinker })), {
                    title: 'Invocação: soma CAR de dano necrótico quando acerta com a arma de pacto. Desligue se este ataque não é com ela.',
                  })}
              </span>
            </span>
          )}

          <button type="button" className="fv-cast-hit-go" onClick={() => rollIt(choice)}>
            Rolar dano{choice.crit ? ' crítico' : ''}
          </button>
        </span>
      )}
    </span>
  );
}

/** "Ação Atacar: 2 ataques" (Ataque Extra) — sem isso o jogador ataca uma vez só. */
export function ExtraAttackNote({ char }: { char: Character }) {
  const { count, source } = attacksPerAction(char);
  if (count < 2) return null;
  return (
    <p className="fv-extra-attack">
      <b>Ação Atacar: {count} ataques</b> · {source}
    </p>
  );
}

/**
 * Munição da arma de disparo ao lado do nome: quantas peças sobram e, depois
 * da luta, "Recolher" devolve metade do que foi disparado (PHB 2014).
 */
export function AmmoBadge({ char, atk }: { char: Character; atk: DerivedAttack }) {
  const recover = useCharacterStore((s) => s.recoverAmmo);
  const st = ammoStatus(char, atk.uid);
  if (!st) return null;
  const back = Math.floor(st.spent / 2);
  const label = st.count === 1 ? `1 ${st.kind.one}` : `${st.count} ${st.kind.many}`;
  const onRecover = () => {
    const n = recover(char.id, atk.uid);
    if (n) toast(`${n} ${n === 1 ? st.kind.one : st.kind.many} recolhida${n === 1 ? '' : 's'} depois da luta.`, { tone: 'ok' });
  };
  return (
    <>
      <span
        className={'fv-ammo-badge' + (st.count === 0 ? ' is-empty' : st.count <= 5 ? ' is-low' : '')}
        title={st.stored ? `Mais ${st.stored} no Baú (passe para a Mochila para usar)` : 'Cada disparo gasta uma'}
      >
        {st.count === 0 ? `sem ${st.kind.many}` : label}
      </span>
      {back > 0 && (
        <button
          type="button"
          className="fv-ammo-recover"
          onClick={onRecover}
          title={`Depois da luta, um minuto de busca recupera metade do que foi disparado (${st.spent})`}
        >
          Recolher +{back}
        </button>
      )}
    </>
  );
}

/** Crítico ampliado (Campeão: 19–20; Crítico Superior: 18–20). */
export function CritBadge({ atk }: { atk: DerivedAttack }) {
  if (atk.critMin >= 20) return null;
  return <span className="fv-crit-badge" title="Acerto crítico com este resultado ou mais no d20">crítico {atk.critMin}–20</span>;
}
