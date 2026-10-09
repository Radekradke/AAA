import { useSpendHitDie } from './useSpendHitDie';
import { HpPops, HpTrail, useValueDelta } from '@/components/ui/HpFeedback';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { TabProps } from './tabProps';
import { AttackActions, CritBadge, ExtraAttackNote } from './AttackActions';
import { ActiveEffects } from './ActiveEffects';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { characterResources } from '@/engine/classResources';
import { casterOf, grantedSpells, syncSpellSlots } from '@/engine/spellcasting';
import { EmptyState } from '@/components/ui/EmptyState';
import { calcLore, abilityLore, conditionLore, passiveLore, spellLore } from '@/lib/lore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { SPELL_BY_ID } from '@/data/spells';
import { ABILITY_LABELS, ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { CONDITIONS, getCondition } from '@/data/conditions';
import { modStr } from '@/engine/dice';
import { calculateToolCheck } from '@/engine/toolCheck';
import { SkillsModal } from './SkillsModal';
import { InspirationControl } from './InspirationControl';
import { InitiativeButton } from './InitiativeButton';
import { SpellCastButton } from '@/components/spells/SpellCastButton';
import { CompanionPanel } from './CompanionPanel';
import { inspirationCount, inspirationMax } from '@/engine/inspiration';
import { useUiStore } from '@/store/uiStore';
import { RollTimeline } from '@/components/dice/RollTimeline';
import { RollAdvisor } from '@/components/dice/RollAdvisor';
import { useInk } from '@/lib/contrast';
import { deathSaveOutcome } from '@/engine/deathSave';
import { ConditionIcon } from '@/components/ui/RuleIcon';

/**
 * Aba Mesa — HUD de sessão real: tudo que o jogador precisa bater o olho,
 * com ações de um toque (dano, cura, recursos, descansos, rolagens e
 * testes contra a morte). Mobile-first, cards grandes e escaneáveis.
 */
export function TabMesa({ char, derived, goTab }: TabProps) {
  const t = useTheme();
  const ink = useInk();
  const store = useCharacterStore();
  const spendHitDie = useSpendHitDie(char, derived);
  const bump = useUiStore((s) => s.bump);
  const { rollDice, check } = useDiceRoller();
  const resources = characterResources(char);
  const bd = derived.breakdowns;
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [condPick, setCondPick] = useState('');

  const hpMax = derived.maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((char.hpCurrent / Math.max(1, hpMax)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';
  const dying = char.hpCurrent <= 0;
  const hpFx = useValueDelta(char.hpCurrent, char.id);

  const proficientSkills = derived.skills.filter((s) => s.proficient);
  const castModMesa = derived.abilities[casterOf(char)?.ability ?? 'int'].mod;
  const prepared = [...new Set([...char.preparedSpells, ...grantedSpells(char).map((g) => g.id)])]
    .map((id) => SPELL_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => a.level - b.level);
  const slotView = syncSpellSlots(char);
  const slotLevels = Object.keys(slotView).map(Number).sort((a, b) => a - b);

  // teste contra a morte: rola e registra automaticamente (PHB 2014)
  const rollDeathSave = () => {
    const r = rollDice(20, { label: 'Teste contra a Morte', deathSave: true });
    const nat = r.rolls[0];
    const res = deathSaveOutcome(char.combat.deathSaves, nat, r.total);
    if (res.outcome === 'revive') store.heal(char.id, 1);
    else if (res.outcome === 'success' || res.outcome === 'stable') store.setDeathSave(char.id, 'success', res.success);
    else store.setDeathSave(char.id, 'fail', res.fail);
    // o momento em tela cheia (na mesa ao vivo, a mesa toda vê — sessionStore)
    useUiStore.getState().showCinematic({ kind: 'death', sheetId: char.id, label: r.label, death: { nat, ...res } });
  };

  return (
    <div className="animate-riseIn fv-mesa">
      {/* ===== VITAIS ===== */}
      <Panel style={{ padding: 'clamp(14px,1.8vw,20px)' }}>
        {/* grade: PC = título | inspiração / PV | barra; celular = PV + inspiração lado a lado, barra embaixo */}
        <div className="fv-hp" data-tour="hp">
          {/* identidade já está no cabeçalho: aqui só o que importa no turno */}
          <div className="fv-label fv-hp-label">Pontos de Vida{derived.subclassLabel ? <span className="fv-mesa-sub"> · {derived.subclassLabel}</span> : null}</div>
          {/* Inspiração: pontos que o mestre dá e você gasta durante a sessão */}
          <div className="fv-hp-insp">
            <InspirationControl charId={char.id} points={inspirationCount(char)} max={inspirationMax(char)} onGain={() => bump(1.6)} />
          </div>

          <LoreTooltip info={calcLore('PV máximo', bd.maxHp, { intro: 'Construção do PV máximo, nível a nível.' })} anchorStyle={{ gridArea: 'num', alignSelf: 'center' }}>
            <div key={hpFx.pulse?.id} className={'fv-hp-num fv-mesa-hpnum' + (hpFx.pulse ? ` is-${hpFx.pulse.kind}` : '')} style={{ color: ink(hpColor, 3.2) }}>
              <HpPops pops={hpFx.pops} />
              {char.hpCurrent}
              <span className="fv-mesa-hpmax"> / {hpMax}</span>
              {char.combat.hpTemp > 0 && <span className="fv-mesa-hptemp"> +{char.combat.hpTemp}</span>}
            </div>
          </LoreTooltip>
          <div className="fv-hp-meter">
            <div className="fv-hp-bar" style={{ height: 18 }}>
              <HpTrail key={char.id} pct={pct} />
              <div style={{ position: 'relative', zIndex: 1, width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${hexA(hpColor, 0.6)}, ${hpColor})`, boxShadow: `0 0 16px ${hexA(hpColor, 0.7)}`, transition: 'width .4s cubic-bezier(.2,.8,.2,1)' }} />
              <div aria-hidden className="fv-hp-notches" />
            </div>
            <div className="fv-hp-btns">
              <QuickBtn color={t.danger} strong onClick={() => store.applyDamage(char.id, 5)}>−5</QuickBtn>
              <QuickBtn color={t.danger} onClick={() => store.applyDamage(char.id, 1)}>−1</QuickBtn>
              <QuickBtn color="#3FC56B" onClick={() => store.heal(char.id, 1)}>+1</QuickBtn>
              <QuickBtn color="#3FC56B" strong onClick={() => store.heal(char.id, 5)}>+5</QuickBtn>
              <QuickBtn color={t.acc} onClick={() => store.setTempHp(char.id, char.combat.hpTemp + 5)}>
                +5 <small className="fv-mesa-small">Temp</small>
              </QuickBtn>
              {char.combat.hpTemp > 0 && (
                <QuickBtn color={t.muted} onClick={() => store.setTempHp(char.id, 0)}>Zerar Temp</QuickBtn>
              )}
            </div>
          </div>
        </div>

        {/* morrendo: testes contra a morte em destaque */}
        {dying && (
          <div className="fv-mesa-dying">
            <div className="fv-mesa-dying-title">
              CAINDO — Testes contra a Morte
            </div>
            <DeathPips label="Sucessos" color="#3FC56B" value={char.combat.deathSaves.success} onSet={(n) => store.setDeathSave(char.id, 'success', n)} />
            <DeathPips label="Falhas" color={t.danger} value={char.combat.deathSaves.fail} onSet={(n) => store.setDeathSave(char.id, 'fail', n)} />
            <button onClick={rollDeathSave} className="fv-btn-gold fv-mesa-deathroll">
              <Icon name="d20" size={15} /> Rolar teste
            </button>
          </div>
        )}

        {/* chips de defesa com "ver cálculo" */}
        <div data-tour="vitals" className="fv-vitals">
          <StatChip label="CA" value={String(derived.ac)} info={calcLore('Classe de Armadura', bd.ac)} />
          <StatChip label="Iniciativa" value={modStr(derived.initiative)} info={calcLore('Iniciativa', bd.initiative)} onRoll={() => check('Iniciativa', derived.initiative)} />
          <StatChip label="Desloc." value={`${derived.speed.toString().replace('.', ',')}m`} info={calcLore('Deslocamento', bd.speed, { unit: 'm' })} />
          <StatChip label="Profic." value={modStr(derived.proficiency)} info={passiveLore('Bônus de Proficiência', modStr(derived.proficiency), 'Somado em tudo que você é treinado (PHB 2014).', ['Ver cálculo'])} />
          <StatChip label="Perc. Pass." value={String(derived.passivePerception)} info={calcLore('Percepção Passiva', bd.passivePerception)} />
          <StatChip
            label="Dados de Vida"
            value={`${char.combat.hitDiceRemaining}/${derived.hitDiceMax}`}
            info={passiveLore('Dados de Vida', `d${derived.hitDie}`, 'Gaste em descanso curto: rola o dado + CON e a vida sobe sozinha. Metade volta no descanso longo.', ['Descanso'])}
            onRoll={spendHitDie}
          />
        </div>

        {/* atributos com modificador — sempre à mão na mesa */}
        <div data-tour="abilities" className="fv-abils">
          {derived.abilityList.map((a) => {
            const color = ABILITY_COLORS[a.key];
            return (
              <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block', minWidth: 0 }}>
                <button
                  className="fv-mabil"
                  onClick={() => check(`Teste de ${ABILITY_LABELS[a.key]}`, a.mod)}
                  style={{ '--c': color } as React.CSSProperties}
                >
                  <span className="fv-mabil-key">{ABILITY_SHORT[a.key]}</span>
                  <span className="fv-mabil-mod">{modStr(a.mod)}</span>
                </button>
              </LoreTooltip>
            );
          })}
        </div>

        {/* economia de turno: ação, bônus, reação e movimento */}
        <div data-tour="turn" className="fv-mesa-turn">
          <InitiativeButton char={char} derived={derived} compact />
          {([
            { k: 'action' as const, label: 'Ação' },
            { k: 'bonus' as const, label: 'Bônus' },
            { k: 'reaction' as const, label: 'Reação' },
          ]).map((d) => {
            const used = char.combat.turn[d.k];
            return (
              <button
                key={d.k}
                className={'fv-turn-btn' + (used ? ' is-used' : '')}
                aria-pressed={used}
                onClick={() => store.toggleTurn(char.id, d.k)}
                style={{
                  cursor: 'pointer',
                  flex: '1 1 80px',
                  minHeight: 36,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (used ? t.line : hexA(t.acc, 0.5)),
                  background: used ? 'var(--sunk-deep)' : 'var(--lift)',
                  color: used ? 'var(--muted)' : 'var(--ink)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: used ? 'line-through' : 'none',
                  transition: '.2s',
                }}
              >
                {used && <i className="fv-tick" aria-hidden>✓ </i>}
                {d.label}
              </button>
            );
          })}
          <span className="fv-mesa-move">
            Mov. <b>{(derived.speed - char.combat.moveUsed).toFixed(1).replace('.', ',')}</b>/{derived.speed.toString().replace('.', ',')} m
          </span>
          <button
            type="button"
            className="fv-mesa-newturn"
            onClick={() => store.resetTurn(char.id)}
          >
            ↺ Novo turno
          </button>
        </div>
      </Panel>

      {/* ===== MASONRY: painéis de jogo (sobem e preenchem os vãos) ===== */}
      <div className="fv-masonry">
        <CompanionPanel char={char} />
        {/* "O que eu rolo?" — descreve a intenção, a ficha sugere o teste */}
        <Panel className="fv-tour-advisor">
          <RollAdvisor char={char} derived={derived} />
        </Panel>

        {/* Ataques */}
        <Panel>
          {((char.combat.spellEffects?.length ?? 0) > 0 || (char.combat.marks?.length ?? 0) > 0) && (
            <div className="fv-mesa-effects">
              <div className="fv-label fv-mesa-label-tight">Efeitos ativos</div>
              <ActiveEffects char={char} />
            </div>
          )}
          <div className="fv-mesa-head">
            <div className="fv-label">Ataques</div>
            <GoTab to="combate" label="Combate" goTab={goTab} />
          </div>
          <ExtraAttackNote char={char} />
          {derived.attacks.length === 0 && (
            <EmptyState icon="sword" title="Sem arma equipada" hint="Equipe uma arma no Inventário para atacar daqui." />
          )}
          {derived.attacks.map((atk) => (
            <div key={atk.uid} className="fv-mesa-atk">
              <div className="fv-mesa-atk-name">{atk.name} <CritBadge atk={atk} /></div>
              <AttackActions char={char} atk={atk} hitStyle={atkBtn(t.gold)} dmgStyle={atkBtn(t.danger)} subStyle={atkSub} dmgSub="DANO" />
            </div>
          ))}
        </Panel>

        {/* Condições: seleção compacta + só as ativas à vista */}
        <Panel>
          <div className="fv-label fv-mesa-label">Condições</div>
          <select
            value={condPick}
            aria-label="Adicionar condição"
            onChange={(e) => {
              const v = e.target.value;
              if (v && !char.combat.conditions.includes(v)) store.toggleCondition(char.id, v);
              setCondPick('');
            }}
            className="fv-input fv-mesa-select"
          >
            <option value="">Selecionar condição…</option>
            {CONDITIONS.filter((c) => !char.combat.conditions.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.label} — {c.short}</option>
            ))}
          </select>
          <div className="fv-mesa-conds">
            {char.combat.conditions.map((c) => {
              const def = getCondition(c);
              return (
                <LoreTooltip key={c} info={conditionLore(c)} anchorStyle={{ display: 'block' }}>
                  <div className="fv-mesa-cond">
                    <span className="fv-mesa-cond-dot">
                      <ConditionIcon id={c} size={18} />
                    </span>
                    <div className="fv-mesa-cond-body">
                      <div className="fv-mesa-cond-name">{def?.label ?? c}</div>
                      {def && <div className="fv-mesa-cond-short">{def.short}</div>}
                    </div>
                    <button
                      type="button"
                      className="fv-mesa-cond-x"
                      onClick={() => store.toggleCondition(char.id, c)}
                      aria-label={`Remover ${c}`}
                    >
                      ✕
                    </button>
                  </div>
                </LoreTooltip>
              );
            })}
            {char.combat.conditions.length === 0 && (
              <div className="fv-mesa-empty">Nenhuma condição ativa — como deve ser.</div>
            )}
          </div>
        </Panel>

        {/* Salvaguardas + perícias-chave */}
        <Panel>
          <div className="fv-mesa-head">
            <div className="fv-label">Salvaguardas</div>
            <GoTab to="ficha" label="Ficha" goTab={goTab} />
          </div>
          <div className="fv-mesa-saves">
            {derived.abilityList.map((a) => (
              <button
                key={a.key}
                onClick={() => check(`Resist. de ${ABILITY_LABELS[a.key]}`, a.save)}
                style={{
                  cursor: 'pointer',
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (a.saveProf ? hexA(t.gold, 0.5) : t.line),
                  background: a.saveProf ? hexA(t.gold, 0.08) : 'var(--sunk)',
                  textAlign: 'center',
                  transition: '.2s',
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: '.08em', color: a.saveProf ? t.gold : 'var(--muted)' }}>{ABILITY_SHORT[a.key]}</div>
                <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{modStr(a.save)}</div>
              </button>
            ))}
          </div>
          <div className="fv-mesa-row">
            <div className="fv-label">Perícias Treinadas</div>
            <button type="button" className="fv-textlink fv-mesa-more" onClick={() => setSkillsOpen(true)}>
              Ver todas →
            </button>
          </div>
          <div className="fv-mesa-chips">
            {proficientSkills.map((sk) => (
              <button
                key={sk.key}
                onClick={() => check(sk.label, sk.bonus)}
                style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 32, padding: '7px 12px', borderRadius: 999, border: '1px solid ' + (sk.expertise ? t.gold : hexA(t.gold, 0.4)), background: sk.expertise ? hexA(t.gold, 0.13) : hexA(t.gold, 0.07), color: 'var(--ink)', transition: '.2s' }}
              >
                {sk.label} <b style={{ color: t.gold, fontFamily: 'var(--font-num)' }}>{modStr(sk.bonus)}</b>
                {sk.disadvantage && <span className="fv-disadv" title={`Desvantagem: ${sk.disadvantage}`}> desv.</span>}
              </button>
            ))}
            {proficientSkills.length === 0 && <span className="fv-mesa-empty">Sem proficiências ainda.</span>}
          </div>
          {(char.toolProfs ?? []).length > 0 && (
            <>
              <div className="fv-label fv-mesa-label-gap">Ferramentas</div>
              <div className="fv-mesa-chips">
                {(char.toolProfs ?? []).map((tool) => {
                  const chk = calculateToolCheck(char, tool);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => check(`${tool.label} (${ABILITY_SHORT[chk.ability]})`, chk.total)}
                      style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 32, padding: '7px 12px', borderRadius: 999, border: '1px solid ' + (tool.expertise ? t.gold : hexA(t.acc, 0.4)), background: tool.expertise ? hexA(t.gold, 0.1) : 'var(--lift)', color: 'var(--ink)', transition: '.2s' }}
                    >
                      {tool.label} <span className="fv-mesa-chip-ab">{ABILITY_SHORT[chk.ability]}</span>{' '}
                      <b style={{ color: tool.expertise ? t.gold : t.acc, fontFamily: 'var(--font-num)' }}>{modStr(chk.total)}</b>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {/* histórico curto: últimas rolagens desta ficha */}
          <RollTimeline char={char} compact limit={5} />
        </Panel>

        {/* Magia (se conjurador) */}
        {derived.isCaster && (
          <Panel>
            <div className="fv-mesa-row fv-mesa-row-top">
              <div className="fv-label">Magia</div>
              <span className="fv-mesa-castinfo">
                CD{' '}
                <LoreTooltip info={calcLore('CD de Magia', bd.spellDC!)}>
                  <b className="fv-mesa-num is-gold">{derived.spellDC}</b>
                </LoreTooltip>{' '}
                · Ataque{' '}
                <LoreTooltip info={calcLore('Ataque Mágico', bd.spellAttack!)}>
                  <b className="fv-mesa-num is-acc">{modStr(derived.spellAttack!)}</b>
                </LoreTooltip>
              </span>
            </div>
            {slotLevels.map((lv) => {
              const slot = slotView[lv];
              return (
                <div key={lv} className="fv-mesa-slotrow">
                  <span className="fv-mesa-slotlv">{lv}º círculo</span>
                  <div className="fv-mesa-chips">
                    {Array.from({ length: slot.max }, (_, i) => {
                      const filled = i >= slot.used;
                      return (
                        <span
                          key={i}
                          onClick={() => store.toggleSpellSlot(char.id, lv, i + 1)}
                          style={{ cursor: 'pointer', width: 15, height: 15, transform: 'rotate(45deg)', borderRadius: 3, border: '1px solid ' + (filled ? t.acc : t.line), background: filled ? hexA(t.acc, 0.85) : 'transparent', boxShadow: filled ? '0 0 8px ' + hexA(t.acc, 0.6) : 'none' }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {prepared.length > 0 && (
              <div className="fv-mesa-spells">
                {prepared.slice(0, 10).map((sp) => (
                  <div key={sp.id} className="fv-mesa-spell">
                    <span className="fv-mesa-spell-lv">{sp.level === 0 ? 'T' : sp.level}</span>
                    <LoreTooltip info={spellLore(sp)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                      <span className="fv-mesa-spell-name">{sp.name}</span>
                    </LoreTooltip>
                    <SpellCastButton char={char} derived={derived} spell={sp} castMod={castModMesa} compact />
                  </div>
                ))}
                {prepared.length > 10 && <span className="fv-mesa-spell-more">+{prepared.length - 10} na aba Magias</span>}
              </div>
            )}
            <div className="fv-mesa-foot">
              <GoTab to="magias" label="Magias" goTab={goTab} />
            </div>
          </Panel>
        )}

        {/* Recursos + descansos */}
        <Panel>
          <div className="fv-mesa-head">
            <div className="fv-label">Recursos &amp; Descanso</div>
            <GoTab to="descanso" label="Descanso" goTab={goTab} />
          </div>
          {resources.length === 0 && <div className="fv-mesa-empty fv-mesa-empty-pad">Nenhum recurso de classe neste nível.</div>}
          {resources.map((res) => {
            const left = Math.min(res.max, char.combat.resources[res.id] ?? res.max);
            return (
              <div key={res.id} className="fv-mesa-res">
                <LoreTooltip info={passiveLore(res.label, res.unlimited ? 'ilimitado' : `${left}/${res.max}`, `${res.desc}. Recarrega em descanso ${res.recharge === 'short' ? 'curto' : 'longo'}.`, ['Recurso'])}>
                  <span className="fv-mesa-res-name">
                    {res.label}
                    {res.die && <span className="fv-mesa-res-die">{res.die}</span>}
                  </span>
                </LoreTooltip>
                <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 14, color: res.unlimited || left > 0 ? t.gold : 'var(--muted)' }}>
                  {res.unlimited ? '∞' : `${left}/${res.max}`}
                </span>
                {!res.unlimited && (
                  <>
                    <QuickBtn color={t.danger} onClick={() => store.setResource(char.id, res.id, Math.max(0, left - 1))}>Usar</QuickBtn>
                    <QuickBtn color={t.acc} onClick={() => store.setResource(char.id, res.id, Math.min(res.max, left + 1))}>+</QuickBtn>
                  </>
                )}
              </div>
            );
          })}
          <div className="fv-mesa-rests">
            <button onClick={() => store.shortRest(char.id)} style={{ ...restBtn, borderColor: t.acc, color: t.acc }}>
              <Icon name="moon" size={14} /> Descanso Curto
            </button>
            <button onClick={() => store.longRest(char.id)} style={{ ...restBtn, borderColor: t.gold, color: t.gold, background: hexA(t.gold, 0.08) }}>
              <Icon name="moon" size={14} /> Descanso Longo
            </button>
          </div>
        </Panel>

      </div>

      {skillsOpen && <SkillsModal char={char} derived={derived} onClose={() => setSkillsOpen(false)} />}
    </div>
  );
}

/* ---------- blocos auxiliares ---------- */

function StatChip({ label, value, info, onRoll }: { label: string; value: string; info: ReturnType<typeof passiveLore>; onRoll?: () => void }) {
  return (
    <LoreTooltip info={info} anchorStyle={{ display: 'block' }}>
      <button
        onClick={onRoll}
        className={'fv-stat-chip' + (onRoll ? ' is-rollable' : '')}
        aria-label={onRoll ? `Rolar ${label} (${value})` : undefined}
      >
        {onRoll && <Icon name="d20" size={11} className="fv-stat-chip-die" />}
        <div className="fv-stat-chip-val">{value}</div>
        <div className="fv-stat-chip-label">{label}</div>
      </button>
    </LoreTooltip>
  );
}

function QuickBtn({ children, color, strong, onClick }: { children: React.ReactNode; color: string; strong?: boolean; onClick: () => void }) {
  return (
    <button className={'fv-hpq' + (strong ? ' is-strong' : '')} onClick={onClick} style={{ '--c': color } as React.CSSProperties}>
      {children}
    </button>
  );
}

function DeathPips({ label, color, value, onSet }: { label: string; color: string; value: number; onSet: (n: number) => void }) {
  const ink = useInk();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: ink(color) }}>{label}</span>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          onClick={() => onSet(n)}
          style={{
            cursor: 'pointer',
            width: 15,
            height: 15,
            borderRadius: 999,
            border: '1px solid ' + (value >= n ? color : 'var(--line)'),
            background: value >= n ? color : 'transparent',
            boxShadow: value >= n ? `0 0 8px ${hexA(color, 0.6)}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

const restBtn: CSSProperties = {
  cursor: 'pointer',
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 40,
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid',
  background: 'var(--sunk)',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 12.5,
  transition: '.2s',
};

function atkBtn(color: string): CSSProperties {
  return {
    cursor: 'pointer',
    fontFamily: 'var(--font-num)',
    fontWeight: 700,
    fontSize: 13.5,
    color,
    padding: '7px 11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid ' + hexA(color, 0.4),
    background: 'var(--sunk)',
    lineHeight: 1.05,
  };
}

const atkSub: CSSProperties = {
  fontSize: 10,
  letterSpacing: '.06em',
  color: 'var(--muted)',
  fontWeight: 600,
  marginTop: 2,
};

/** Atalho do Jogar para a aba que aprofunda o assunto. */
function GoTab({ to, label, goTab }: { to: string; label: string; goTab?: (id: string) => void }) {
  if (!goTab) return null;
  return (
    <button type="button" className="fv-goto" onClick={() => goTab(to)} aria-label={`Abrir a aba ${label}`}>
      {label} <span aria-hidden>›</span>
    </button>
  );
}
