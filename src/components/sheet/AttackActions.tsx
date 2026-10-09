import { useState } from 'react';
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

interface Props {
  char: Character;
  atk: DerivedAttack;
  hitStyle: CSSProperties;
  dmgStyle: CSSProperties;
  subStyle: CSSProperties;
  dmgSub: ReactNode;
}

type Stage = { kind: 'attack'; total: number; crit: boolean; fail: boolean } | { kind: 'damage' } | null;

/**
 * Botões ACERTO / DANO da arma. O ataque abre o "acertou?"; o dano junta
 * tudo que soma no acerto — crítico, versátil, Ataque Furtivo (1×/turno),
 * Destruição Divina (gasta espaço), Bruxaria, Marca do Caçador e Fúria.
 */
export function AttackActions({ char, atk, hitStyle, dmgStyle, subStyle, dmgSub }: Props) {
  const { attack } = useDiceRoller();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const store = useCharacterStore();
  const [stage, setStage] = useState<Stage>(null);
  const [choice, setChoice] = useState<ExtrasChoice>({});
  const avail = weaponExtras(char, atk);
  const hasOptions =
    !!atk.versatileDie || !!avail.sneak || !!avail.smite || avail.improvedSmite || avail.hex || avail.huntersMark || !!avail.rage;

  const openDamage = (crit: boolean) => {
    // Furtivo já ligado por padrão quando ainda não foi usado neste turno
    setChoice({ crit, sneak: !!avail.sneak && !avail.sneak.used });
    setStage({ kind: 'damage' });
  };

  const onAttack = () => {
    const r = attack(atk);
    setStage({ kind: 'attack', total: r.total, crit: r.crit, fail: r.fail });
  };

  const rollIt = (c: ExtrasChoice) => {
    const r = rollWeaponDamage(char, atk, avail, c);
    pushRoll(r);
    if (avail.sneak && c.sneak && !avail.sneak.used) store.useSneakAttack(char.id);
    if (avail.smite && c.smiteLevel) store.castWithSlot(char.id, c.smiteLevel);
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
            {chip(!!choice.crit, 'Crítico (dobra os dados)', () => setChoice((c) => ({ ...c, crit: !c.crit })))}
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

          {(avail.hex || avail.huntersMark || avail.rage || avail.improvedSmite) && (
            <span className="fv-atk-group">
              <small>Ligados (valem em todo acerto)</small>
              <span className="fv-atk-chips">
                {avail.rage && chip(hasMark(char, 'rage'), `Em Fúria +${avail.rage.bonus}`, () => mark('rage'))}
                {avail.hex && chip(hasMark(char, 'hex'), 'Bruxaria +1d6 necrótico', () => mark('hex'))}
                {avail.huntersMark && chip(hasMark(char, 'huntersMark'), 'Marca do Caçador +1d6', () => mark('huntersMark'))}
                {avail.improvedSmite && <span className="fv-atk-fixed">Destruição Aprimorada +1d8 radiante</span>}
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

/** Crítico ampliado (Campeão: 19–20; Crítico Superior: 18–20). */
export function CritBadge({ atk }: { atk: DerivedAttack }) {
  if (atk.critMin >= 20) return null;
  return <span className="fv-crit-badge" title="Acerto crítico com este resultado ou mais no d20">crítico {atk.critMin}–20</span>;
}
