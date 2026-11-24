import { WhoAmI } from '@/components/diary/WhoAmI';
import { useSpendHitDie } from './useSpendHitDie';
import { HpPops, HpTrail, useValueDelta } from '@/components/ui/HpFeedback';
import { useState } from 'react';
import { CompanionPanel } from './CompanionPanel';
import { InitiativeButton } from './InitiativeButton';
import { AmmoBadge, AttackActions, CritBadge, ExtraAttackNote } from './AttackActions';
import { ActiveEffects } from './ActiveEffects';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { modStr } from '@/engine/dice';
import { characterResources } from '@/engine/classResources';
import { barbarianState } from '@/engine/barbarian';
import { RagePanel } from './RagePanel';
import { FighterPanel } from './FighterPanel';
import { RoguePanel } from './RoguePanel';
import { MonkPanel } from './MonkPanel';
import { monkState } from '@/engine/monk';
import { PaladinPanel } from './PaladinPanel';
import { WarlockPanel } from './WarlockPanel';
import { ClericPanel } from './ClericPanel';
import { BardPanel } from './BardPanel';
import { RangerPanel } from './RangerPanel';
import { SorcererPanel } from './SorcererPanel';
import { WizardPanel } from './WizardPanel';
import { DruidPanel } from './DruidPanel';
import { paladinState } from '@/engine/paladin';
import { hasEvasion, hasUncannyDodge, reduceDamage } from '@/engine/rogue';
import { toast } from '@/store/feedbackStore';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { calcLore, passiveLore } from '@/lib/lore';
import { useInk } from '@/lib/contrast';
import { pressable } from '@/lib/pressable';
import '@/styles/combat.css';

/** Efeito acumulado de cada nível de exaustão (PHB 2014). */
const EXHAUSTION_EFFECT: Record<number, string> = {
  0: 'Sem exaustão',
  1: 'Desvantagem em testes de atributo',
  2: 'Deslocamento pela metade',
  3: 'Desvantagem em ataques e salvaguardas',
  4: 'PV máximo pela metade',
  5: 'Deslocamento reduzido a 0',
  6: 'Morte',
};

export function TabCombate({ char, derived }: TabProps) {
  const t = useTheme();
  const ink = useInk();
  const { check, rollDice } = useDiceRoller();
  const store = useCharacterStore();
  const spendHitDie = useSpendHitDie(char, derived);
  const [amt, setAmt] = useState('');
  // CD da salvaguarda de Concentração após sofrer dano (10 ou metade do dano)
  const [concDC, setConcDC] = useState<number | null>(null);
  // Bárbaro: resistência da Fúria no dano recebido e Fúria Implacável ao cair a 0
  const barb = barbarianState(char);
  const [rageHalf, setRageHalf] = useState(true);
  const halving = !!barb?.raging && rageHalf;
  const [relentlessDC, setRelentlessDC] = useState<number | null>(null);
  // Esquiva Sobrenatural (reação, metade de um ataque) e Evasão (salvaguarda de DES): valem para o próximo dano
  const uncannyOk = hasUncannyDodge(char);
  const evasionOk = hasEvasion(char);
  const [uncanny, setUncanny] = useState(false);
  const [evasion, setEvasion] = useState<'pass' | 'fail' | null>(null);
  // Monge: Defletir Projéteis (reduz 1d10 + DES + nível) e Queda Lenta (reduz 5 × nível), ambos reação
  const monk = monkState(char, derived.proficiency, derived.abilities.wis.mod, derived.abilities.dex.mod);
  const [monkReduce, setMonkReduce] = useState<'deflect' | 'fall' | null>(null);
  const pal = paladinState(char, derived.proficiency, derived.abilities.cha.mod);

  const hpMax = derived.maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((char.hpCurrent / Math.max(1, hpMax)) * 100)));
  const hpFx = useValueDelta(char.hpCurrent, char.id);
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';

  const turnDefs = [
    { k: 'action' as const, label: 'Ação' },
    { k: 'bonus' as const, label: 'Ação Bônus' },
    { k: 'reaction' as const, label: 'Reação' },
  ];
  const moveMax = derived.speed * (char.combat.turn.dash ? 2 : 1);
  const moveLeft = (moveMax - char.combat.moveUsed).toFixed(1).replace('.', ',');
  const concentrating = !!char.combat.concentration;
  const exhaustion = char.combat.exhaustion ?? 0;

  // aplica dano e, se concentrando, calcula a CD da salvaguarda de CON (10 ou metade)
  const dealDamage = (raw: number) => {
    if (raw <= 0) return;
    // reações do Monge tiram um valor fixo antes de tudo
    let base = raw;
    if (monkReduce && monk && !char.combat.turn.reaction) {
      const cut = monkReduce === 'deflect' ? rollDice(10, { modifier: monk.deflectBonus ?? 0, label: 'Defletir Projéteis' }).total : monk.slowFall ?? 0;
      base = Math.max(0, raw - cut);
      store.useTurn(char.id, 'reaction');
      toast(`${monkReduce === 'deflect' ? 'Defletir Projéteis' : 'Queda Lenta'}: −${cut} (${raw} → ${base}).${monkReduce === 'deflect' && base === 0 ? ' Dano zerado: dá para arremessar o projétil de volta (1 ki).' : ''}`, { tone: 'ok' });
      setMonkReduce(null);
    }
    // Evasão / Esquiva Sobrenatural; depois a resistência da Fúria (metade, para baixo)
    const useUncanny = uncanny && !char.combat.turn.reaction;
    const reduced = reduceDamage(base, { evasion, uncanny: useUncanny });
    if (useUncanny) store.useTurn(char.id, 'reaction');
    if (evasion || useUncanny) {
      toast(`${[evasion ? `Evasão (${evasion === 'pass' ? 'passou: nenhum dano' : 'falhou: metade'})` : '', useUncanny ? 'Esquiva Sobrenatural (metade, reação)' : ''].filter(Boolean).join(' + ')}: ${base} → ${reduced}.`, { tone: 'ok' });
      setUncanny(false);
      setEvasion(null);
    }
    const n = halving ? Math.floor(reduced / 2) : reduced;
    if (n <= 0) return;
    store.applyDamage(char.id, n);
    if (concentrating) setConcDC(Math.max(10, Math.floor(n / 2)));
    const after = useCharacterStore.getState().characters.find((c) => c.id === char.id);
    if (barb?.raging && barb.relentlessDC !== null && after && after.hpCurrent === 0 && (after.combat.deathSaves?.fail ?? 0) < 3) setRelentlessDC(barb.relentlessDC);
    // Sentinela Imortal (Anciões 15º): caiu a 0 PV sem morrer → fica com 1 PV, 1× por descanso longo
    else if (pal && pal.undyingLeft > 0 && after && after.hpCurrent === 0 && (after.combat.deathSaves?.fail ?? 0) < 3) {
      store.setResource(char.id, 'undyingSentinel', pal.undyingLeft - 1);
      store.heal(char.id, 1);
      toast('Sentinela Imortal: você cai a 0 PV, mas fica de pé com 1 PV.', { tone: 'ok' });
    }
  };
  const rollRelentless = () => {
    if (relentlessDC === null) return;
    const r = check(`Fúria Implacável · CON (CD ${relentlessDC})`, derived.abilities.con.save);
    store.setResource(char.id, 'relentless', (char.combat.resources.relentless ?? 0) + 1);
    if (r.total >= relentlessDC) {
      store.heal(char.id, 1);
      toast(`Fúria Implacável: ${r.total} contra CD ${relentlessDC} — você fica de pé com 1 PV.`, { tone: 'ok' });
    } else {
      store.endRage(char.id);
      toast(`Fúria Implacável: ${r.total} contra CD ${relentlessDC} — você cai e a Fúria acaba.`, { tone: 'danger' });
    }
    setRelentlessDC(null);
  };
  const applyAmount = (heal: boolean) => {
    const n = Math.max(0, Math.floor(Number(amt) || 0));
    if (!n) return;
    if (heal) store.heal(char.id, n);
    else dealDamage(n);
    setAmt('');
  };

  return (
    <div className="animate-riseIn fv-combat">
      <WhoAmI char={char} />
      {/* Vitalidade */}
      <Panel full>
        <div className="fv-combat-hp-head">
          <LoreTooltip info={calcLore('PV máximo', derived.breakdowns.maxHp, { intro: 'Como o PV máximo foi construído, nível a nível.' })}>
            <h2 className="fv-label fv-combat-help">Pontos de Vida</h2>
          </LoreTooltip>
          <p className="fv-sr-only" aria-live="polite">
            Pontos de vida: {char.hpCurrent} de {hpMax}
            {char.combat.hpTemp > 0 ? `, mais ${char.combat.hpTemp} temporários` : ''}
          </p>
          <div aria-hidden key={hpFx.pulse?.id} className={'fv-hp-num fv-combat-hp-num' + (hpFx.pulse ? ` is-${hpFx.pulse.kind}` : '')} style={{ color: ink(hpColor, 3.2) }}>
            <HpPops pops={hpFx.pops} />
            {char.hpCurrent}
            <span className="fv-combat-hp-max"> / {hpMax}</span>
          </div>
        </div>
        <div className="fv-hp-bar fv-combat-hpbar">
          <HpTrail key={char.id} pct={pct} />
          <div
            className="fv-combat-hpfill"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hexA(hpColor, 0.6)}, ${hpColor})`, boxShadow: `0 0 18px ${hexA(hpColor, 0.7)}` }}
          />
          {/* entalhes de HUD a cada 10% */}
          <div aria-hidden className="fv-hp-notches" />
          <div className="fv-combat-hpbar-over" aria-hidden>
            <span className="fv-hp-bar-label">{pct}%</span>
          </div>
        </div>
        <div className="fv-combat-hp-actions">
          <HpBtn label="−5 Dano" name="Sofrer 5 de dano" color="var(--danger)" strong onClick={() => dealDamage(5)} />
          <HpBtn label="−1" name="Sofrer 1 de dano" color="var(--danger)" onClick={() => dealDamage(1)} />
          <HpBtn label="+1" name="Curar 1 PV" color="#3FC56B" onClick={() => store.heal(char.id, 1)} />
          <HpBtn label="+5 Cura" name="Curar 5 PV" color="#3FC56B" strong onClick={() => store.heal(char.id, 5)} />
          <div className="fv-combat-temp">
            PV Temp.
            <button
              onClick={() => store.setTempHp(char.id, char.combat.hpTemp + 5)}
              onContextMenu={(e) => { e.preventDefault(); store.setTempHp(char.id, 0); }}
              title="Clique: +5 · clique direito: zerar"
              aria-label={`PV temporários: ${char.combat.hpTemp}. Ganhar mais 5`}
              className="fv-combat-temp-btn"
            >
              {char.combat.hpTemp}
            </button>
          </div>
        </div>

        {/* dano/cura por valor exato */}
        <div className="fv-combat-amt">
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') applyAmount(false); }}
            inputMode="numeric"
            placeholder="Qtd."
            aria-label="Valor de dano ou cura"
            className="fv-input fv-amt-input fv-combat-amt-input"
          />
          <button onClick={() => applyAmount(false)} disabled={!amt} style={amtBtn('var(--danger)', !!amt)}>Aplicar dano</button>
          <button onClick={() => applyAmount(true)} disabled={!amt} style={amtBtn('#3FC56B', !!amt, ink('#3FC56B'))}>Curar</button>
        </div>

        {/* Fúria: o dano físico (ou todo, com o Urso) cai pela metade */}
        {barb?.raging && (
          <div className="fv-combat-mt8">
            <button type="button" className={'fv-resist-chip' + (rageHalf ? ' is-on' : '')} aria-pressed={rageHalf} onClick={() => setRageHalf((v) => !v)} title="Desligue se o dano não for coberto pela resistência da Fúria">
              {rageHalf ? '✓ ' : ''}Resistência da Fúria: metade do dano ({barb.resistance})
            </button>
          </div>
        )}

        {/* Ladino/Monge/Caçador: defesas que cortam o próximo dano */}
        {(uncannyOk || evasionOk || monk?.deflectBonus != null) && (
          <div className="fv-defense-chips fv-combat-chips">
            {monk?.deflectBonus != null && (
              <button type="button" className={'fv-resist-chip' + (monkReduce === 'deflect' ? ' is-on' : '')} aria-pressed={monkReduce === 'deflect'} disabled={char.combat.turn.reaction} onClick={() => setMonkReduce((v) => (v === 'deflect' ? null : 'deflect'))} title="Reação: um ataque à distância com arma o acertou — reduz o dano em 1d10 + DES + nível de monge.">
                {monkReduce === 'deflect' ? '✓ ' : ''}Defletir Projéteis: −1d10+{monk.deflectBonus}
              </button>
            )}
            {monk?.slowFall != null && (
              <button type="button" className={'fv-resist-chip' + (monkReduce === 'fall' ? ' is-on' : '')} aria-pressed={monkReduce === 'fall'} disabled={char.combat.turn.reaction} onClick={() => setMonkReduce((v) => (v === 'fall' ? null : 'fall'))} title="Reação ao cair: reduz o dano da queda em 5 × nível de monge.">
                {monkReduce === 'fall' ? '✓ ' : ''}Queda Lenta: −{monk.slowFall}
              </button>
            )}
            {uncannyOk && (
              <button type="button" className={'fv-resist-chip' + (uncanny ? ' is-on' : '')} aria-pressed={uncanny} disabled={char.combat.turn.reaction} onClick={() => setUncanny((v) => !v)} title="Reação: um atacante que você vê o acertou — o dano cai pela metade. Gasta a reação.">
                {uncanny ? '✓ ' : ''}Esquiva Sobrenatural: metade{char.combat.turn.reaction ? ' (reação já usada)' : ' (reação)'}
              </button>
            )}
            {evasionOk && (
              <>
                <button type="button" className={'fv-resist-chip' + (evasion === 'pass' ? ' is-on' : '')} aria-pressed={evasion === 'pass'} onClick={() => setEvasion((v) => (v === 'pass' ? null : 'pass'))} title="Evasão: efeito com salvaguarda de DES para meio dano e você passou — nenhum dano.">
                  {evasion === 'pass' ? '✓ ' : ''}Evasão: passei na DES (0)
                </button>
                <button type="button" className={'fv-resist-chip' + (evasion === 'fail' ? ' is-on' : '')} aria-pressed={evasion === 'fail'} onClick={() => setEvasion((v) => (v === 'fail' ? null : 'fail'))} title="Evasão: efeito com salvaguarda de DES para meio dano e você falhou — só metade.">
                  {evasion === 'fail' ? '✓ ' : ''}Evasão: falhei na DES (½)
                </button>
              </>
            )}
          </div>
        )}

        {/* Fúria Implacável (Bárbaro 11º): caiu a 0 PV em Fúria */}
        {relentlessDC !== null && (
          <div role="alert" className="fv-combat-callout is-rage">
            <span className="fv-combat-callout-text">
              Fúria Implacável: salvaguarda de <b>Constituição</b> CD <b className="fv-num">{relentlessDC}</b> para ficar com 1 PV
            </span>
            <button type="button" onClick={rollRelentless} className="fv-rage-end">Rolar {modStr(derived.abilities.con.save)}</button>
            <button onClick={() => setRelentlessDC(null)} aria-label="Dispensar" className="fv-combat-dismiss">✕</button>
          </div>
        )}

        {/* lembrete: salvaguarda de Concentração após sofrer dano */}
        {concentrating && concDC !== null && (
          <div className="fv-combat-callout is-conc">
            <span className="fv-combat-callout-text">
              Concentração: salvaguarda de <b>Constituição</b> CD <b className="fv-num fv-combat-acc">{concDC}</b>
            </span>
            <button
              onClick={() => { check(`Concentração · CON (CD ${concDC})`, derived.abilities.con.save); setConcDC(null); }}
              className="fv-combat-conc-roll"
            >
              Rolar {modStr(derived.abilities.con.save)}
            </button>
            <button onClick={() => setConcDC(null)} aria-label="Dispensar" className="fv-combat-dismiss">✕</button>
          </div>
        )}

        {/* magias e efeitos ligados (Armadura Arcana, Escudo, Auxílio, Bruxaria…) */}
        <div className="fv-combat-mt12"><ActiveEffects char={char} /></div>
        <RagePanel char={char} />
        <FighterPanel char={char} />
        <RoguePanel char={char} derived={derived} />
        <MonkPanel char={char} derived={derived} />
        <PaladinPanel char={char} derived={derived} />
        <WarlockPanel char={char} derived={derived} />
        <ClericPanel char={char} derived={derived} />
        <BardPanel char={char} derived={derived} />
        <RangerPanel char={char} derived={derived} />
        <SorcererPanel char={char} derived={derived} />
        <WizardPanel char={char} derived={derived} />
        <DruidPanel char={char} derived={derived} />

        {/* Concentração — lembrete para o conjurador (salvaguarda de CON ao sofrer dano) */}
        <LoreTooltip info={passiveLore('Concentração', concentrating ? 'Ativa' : 'Inativa', 'Muitas magias exigem concentração. Ao sofrer dano, faça uma salvaguarda de Constituição (CD 10 ou metade do dano, o que for maior) ou a magia termina. Só é possível concentrar em uma magia por vez. Cair a 0 PV rompe a concentração.', ['Conjuração'])} anchorStyle={{ display: 'block' }}>
          <button
            onClick={() => store.toggleConcentration(char.id)}
            className={'fv-combat-conc' + (concentrating ? ' is-on animate-glowPulse' : '')}
          >
            <span className="fv-combat-conc-label">
              <span className="fv-combat-conc-dot" />
              {concentrating ? 'Concentrando numa magia' : 'Concentração'}
            </span>
            <span className="fv-combat-conc-state">{concentrating ? 'romper' : 'inativa'}</span>
          </button>
        </LoreTooltip>
      </Panel>

      {/* Ataques */}
      <Panel>
        <h2 className="fv-label fv-combat-mb6">Ataques</h2>
        <ExtraAttackNote char={char} />
        {derived.attacks.length === 0 && (
          <EmptyState
            icon="sword"
            title="Nenhuma arma equipada"
            hint="Vá ao Inventário e toque em Equipar numa arma — o ataque e o dano aparecem aqui prontos para rolar."
          />
        )}
        {derived.attacks.map((atk) => (
          <div key={atk.uid} className="fv-combat-atk">
            <div className="fv-combat-grow">
              <div className="fv-combat-atk-name">{atk.name} <CritBadge atk={atk} /> <AmmoBadge char={char} atk={atk} /></div>
              <div className="fv-combat-atk-note">{atk.note}</div>
            </div>
            <AttackActions
              char={char}
              atk={atk}
              hitStyle={{ cursor: 'pointer', fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 15, color: 'var(--gold)', padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--sunk)', lineHeight: 1.05 }}
              dmgStyle={{ cursor: 'pointer', fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13, color: 'var(--danger)', padding: '7px 13px', borderRadius: 10, border: '1px solid rgba(255,80,40,.35)', background: 'transparent', lineHeight: 1.05 }}
              subStyle={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}
              dmgSub={atk.damageType.toUpperCase()}
            />
          </div>
        ))}
      </Panel>

      <CompanionPanel char={char} />

      {/* Economia de Turno */}
      <Panel>
        <InitiativeButton char={char} derived={derived} />
        <div className="fv-combat-turn-head">
          <h2 className="fv-label">Economia de Turno</h2>
          <button onClick={() => store.resetTurn(char.id)} className="fv-combat-link">
            <span aria-hidden>↺ </span>Novo turno
          </button>
        </div>
        <div className="fv-combat-stack">
          {turnDefs.map((d) => {
            const used = char.combat.turn[d.k];
            return (
              <LoreTooltip key={d.k} info={passiveLore(d.label, used ? 'Usada' : 'Disponível', 'Marque para controlar o que seu personagem já gastou no turno atual. Use “Novo turno” para limpar ação, bônus, reação e movimento.', ['Economia de turno'])} anchorStyle={{ display: 'block' }}>
                <button
                  className={'fv-turn-btn' + (used ? ' is-used' : '')}
                  aria-pressed={used}
                  onClick={() => store.toggleTurn(char.id, d.k)}
                >
                  <span className="fv-turn-label">{used && <i className="fv-tick" aria-hidden>✓ </i>}{d.label}</span>
                  <span className="fv-turn-state">{used ? 'Usada' : 'Disponível'}</span>
                </button>
              </LoreTooltip>
            );
          })}
        </div>
        <div className="fv-combat-move">
          <div>
            <h3 className="fv-combat-title">Movimento</h3>
            <div className="fv-combat-sub">
              {moveLeft} m de {moveMax.toString().replace('.', ',')} m{char.combat.turn.dash ? ' (Disparada)' : ''}
            </div>
          </div>
          <div className="fv-combat-row6">
            <button type="button" onClick={() => store.adjustMove(char.id, -1.5)} className="fv-combat-move-btn" aria-label="Devolver 1,5 m de movimento">−1,5</button>
            <button type="button" onClick={() => store.adjustMove(char.id, 1.5)} className="fv-combat-move-btn is-acc" aria-label="Andar 1,5 m">+1,5</button>
          </div>
        </div>
      </Panel>

      {/* Recursos */}
      <Panel>
        <h2 className="fv-label fv-combat-mb13">Recursos de Combate</h2>

        {characterResources(char).map((res) => {
          const left = Math.min(res.max, char.combat.resources[res.id] ?? res.max);
          return (
            <div key={res.id} className="fv-combat-res">
              <div className="fv-combat-min0">
                <div className="fv-combat-title">
                  {res.label}
                  {res.die && <span className="fv-combat-res-die">{res.die}</span>}
                </div>
                <div className="fv-combat-sub">{res.desc} · recarga {res.recharge === 'short' ? 'curta' : 'longa'}</div>
              </div>
              <LoreTooltip info={passiveLore(res.label, res.unlimited ? 'ilimitado' : `${left}/${res.max}`, `${res.desc}. Recarrega em descanso ${res.recharge === 'short' ? 'curto' : 'longo'}.`, ['Recurso de classe'])}>
                <button
                  disabled={res.unlimited}
                  onClick={() => store.setResource(char.id, res.id, left > 0 ? left - 1 : res.max)}
                  aria-label={res.unlimited ? `${res.label}: ilimitado` : `${res.label}: ${left} de ${res.max}. ${left > 0 ? 'Usar um' : 'Recarregar'}`}
                  className={'fv-combat-res-btn' + (res.unlimited || left > 0 ? ' is-on' : '') + (res.unlimited ? ' is-unlimited' : '')}
                >
                  {res.unlimited ? '∞' : `${left} / ${res.max}`}
                </button>
              </LoreTooltip>
            </div>
          );
        })}

        {/* Dados de Vida */}
        <div className="fv-combat-res">
          <div>
            <h3 className="fv-combat-title">Dados de Vida</h3>
            <div className="fv-combat-sub">{derived.hitDiceMax}d{derived.hitDie} · gaste no descanso</div>
          </div>
          <div className="fv-combat-row6">
            <LoreTooltip info={passiveLore('Dado de Vida', `${derived.hitDiceMax}d${derived.hitDie}`, 'Durante um descanso curto, gaste um dado de vida para rolar cura e somar Constituição. Descanso longo recupera parte deles.', ['Descanso', 'Cura'])}>
              <button
                onClick={() => spendHitDie?.()}
                disabled={!spendHitDie}
                className="fv-combat-hd-btn"
              >
                Gastar
              </button>
            </LoreTooltip>
            <div className="fv-combat-hd-count">
              {char.combat.hitDiceRemaining} / {derived.hitDiceMax}
            </div>
          </div>
        </div>

        {/* Resgate da Morte */}
        <div className="fv-combat-block">
          <h3 className="fv-combat-title fv-combat-mb9">Resgate da Morte</h3>
          <div className="fv-combat-death">
            <DeathRow label="Sucesso" color="#3FC56B" value={char.combat.deathSaves.success} onClick={(n) => store.setDeathSave(char.id, 'success', n)} />
            <DeathRow label="Falha" color={t.danger} value={char.combat.deathSaves.fail} onClick={(n) => store.setDeathSave(char.id, 'fail', n)} />
          </div>
        </div>

        {/* Exaustão (0–6, PHB 2014) */}
        <div className="fv-combat-block is-sep">
          <div className="fv-combat-exh-head">
            <h3 className="fv-combat-title">Exaustão</h3>
            <span className={'fv-combat-exh-effect' + (exhaustion >= 4 ? ' is-danger' : '')}>{EXHAUSTION_EFFECT[exhaustion]}</span>
          </div>
          <div className="fv-combat-exh">
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const on = exhaustion >= n;
              const col = n >= 5 ? t.danger : n >= 3 ? '#E0A93E' : t.acc;
              return (
                <LoreTooltip key={n} info={passiveLore(`Exaustão · nível ${n}`, EXHAUSTION_EFFECT[n], 'A exaustão acumula em níveis (1–6). Cada nível soma-se aos anteriores. Um descanso longo remove 1 nível. Clique num nível para defini-lo; clique nele de novo para recuar.', ['Condição'])}>
                  <span
                    {...pressable(() => store.setExhaustion(char.id, n), `Exaustão nível ${n}`)}
                    className="fv-combat-exh-pip"
                    style={on ? { border: '1px solid ' + col, background: hexA(col, 0.16), color: col, boxShadow: `0 0 9px ${hexA(col, 0.5)}` } : undefined}
                  >
                    {n}
                  </span>
                </LoreTooltip>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** `name`: o que o leitor de tela diz ("Sofrer 1 de dano"), quando o texto curto ("−1") não basta. */
function HpBtn({ label, name, color, strong, onClick }: { label: string; name?: string; color: string; strong?: boolean; onClick: () => void }) {
  const ink = useInk();
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      className={'fv-combat-hp-btn' + (strong ? ' is-strong' : '')}
      style={{ color: ink(color), border: '1px solid ' + (strong ? color : hexA(color, 0.4)), background: strong ? hexA(color, 0.1) : 'transparent' }}
    >
      {label}
    </button>
  );
}

/** `text`: a mesma cor já ajustada para leitura (useInk) — borda/fundo usam a original. */
function amtBtn(color: string, enabled: boolean, text: string = color): React.CSSProperties {
  return {
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: 12.5,
    color: text,
    minHeight: 40,
    padding: '9px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid ' + hexA(color, enabled ? 0.6 : 0.25),
    background: enabled ? hexA(color, 0.1) : 'transparent',
    opacity: enabled ? 1 : 0.5,
    transition: '.2s',
  };
}

function DeathRow({ label, color, value, onClick }: { label: string; color: string; value: number; onClick: (n: number) => void }) {
  const ink = useInk();
  return (
    <div className="fv-combat-death-row">
      <span className="fv-combat-death-label" style={{ color: ink(color) }}>{label}</span>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          {...pressable(() => onClick(n), `${label}: ${n}`)}
          className="fv-combat-death-pip"
          style={value >= n ? { border: '1px solid ' + color, background: color, boxShadow: `0 0 9px ${hexA(color, 0.6)}` } : undefined}
        />
      ))}
    </div>
  );
}
