import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { calcLore, abilityLore, conditionLore, passiveLore, spellLore } from '@/lib/lore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { getClass } from '@/data/classes';
import { SPELL_BY_ID } from '@/data/spells';
import { ABILITY_LABELS, ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { CONDITIONS, getCondition } from '@/data/conditions';
import { heroSubtitle } from '@/lib/summary';
import { modStr } from '@/engine/dice';
import { damageExpr } from '@/engine/combat';
import { SkillsModal } from './SkillsModal';

/**
 * Aba Mesa — HUD de sessão real: tudo que o jogador precisa bater o olho,
 * com ações de um toque (dano, cura, recursos, descansos, rolagens e
 * testes contra a morte). Mobile-first, cards grandes e escaneáveis.
 */
export function TabMesa({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const { rollDice, check, attack, damage } = useDiceRoller();
  const cls = getClass(char.classId);
  const bd = derived.breakdowns;
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [condPick, setCondPick] = useState('');

  const hpMax = derived.maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((char.hpCurrent / Math.max(1, hpMax)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';
  const dying = char.hpCurrent <= 0;

  const proficientSkills = derived.skills.filter((s) => s.proficient);
  const prepared = char.preparedSpells.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.level - b.level);
  const slotLevels = Object.keys(char.combat.spellSlots).map(Number).sort((a, b) => a - b);

  // teste contra a morte: rola e registra automaticamente (PHB 2014)
  const rollDeathSave = () => {
    const r = rollDice(20, { label: 'Teste contra a Morte' });
    const nat = r.rolls[0];
    const ds = char.combat.deathSaves;
    if (nat === 20) {
      store.heal(char.id, 1);
    } else if (nat === 1) {
      store.setDeathSave(char.id, 'fail', Math.min(3, ds.fail + 2));
    } else if (r.total >= 10) {
      store.setDeathSave(char.id, 'success', Math.min(3, ds.success + 1));
    } else {
      store.setDeathSave(char.id, 'fail', Math.min(3, ds.fail + 1));
    }
  };

  return (
    <div className="animate-riseIn" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px,1.4vw,16px)' }}>
      {/* ===== VITAIS ===== */}
      <Panel style={{ padding: 'clamp(14px,1.8vw,20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(20px,3vw,26px)', color: 'var(--ink)', lineHeight: 1 }}>
              {char.name}
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--acc)' }}>
              {heroSubtitle(char)}{derived.subclassLabel ? ` · ${derived.subclassLabel}` : ''}
            </div>
          </div>
          <LoreTooltip info={passiveLore('Inspiração', char.inspiration ? 'Disponível' : 'Sem inspiração', 'Concedida pelo mestre. Gaste para ter vantagem em um teste, ataque ou salvaguarda.', ['Mesa'])}>
            <button
              onClick={() => store.toggleInspiration(char.id)}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 15px',
                borderRadius: 999,
                border: '1px solid ' + (char.inspiration ? t.gold : t.line),
                background: char.inspiration ? hexA(t.gold, 0.14) : 'rgba(0,0,0,.24)',
                color: char.inspiration ? t.gold : 'var(--muted)',
                fontFamily: "'Cinzel', serif",
                fontWeight: 700,
                fontSize: 12.5,
                boxShadow: char.inspiration ? '0 0 18px ' + hexA(t.gold, 0.35) : 'none',
                transition: '.25s',
              }}
            >
              <Icon name={char.inspiration ? 'starFill' : 'star'} size={15} />
              Inspiração
            </button>
          </LoreTooltip>
        </div>

        {/* PV gigante + barra */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,22px)', flexWrap: 'wrap' }}>
          <LoreTooltip info={calcLore('PV máximo', bd.maxHp, { intro: 'Construção do PV máximo, nível a nível.' })}>
            <div style={{ cursor: 'help', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 'clamp(40px,7vw,56px)', lineHeight: 1, color: hpColor }}>
              {char.hpCurrent}
              <span style={{ fontSize: '.42em', color: 'var(--muted)' }}> / {hpMax}</span>
              {char.combat.hpTemp > 0 && <span style={{ fontSize: '.42em', color: t.acc }}> +{char.combat.hpTemp}</span>}
            </div>
          </LoreTooltip>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ height: 18, borderRadius: 4, background: 'rgba(0,0,0,.44)', border: '1px solid var(--line)', overflow: 'hidden', position: 'relative', clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0 50%)' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${hexA(hpColor, 0.6)}, ${hpColor})`, boxShadow: `0 0 16px ${hexA(hpColor, 0.7)}`, transition: 'width .4s' }} />
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.5) calc(10% - 1px) 10%)' }} />
            </div>
            <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <QuickBtn color={t.danger} strong onClick={() => store.applyDamage(char.id, 5)}>−5</QuickBtn>
              <QuickBtn color={t.danger} onClick={() => store.applyDamage(char.id, 1)}>−1</QuickBtn>
              <QuickBtn color="#3FC56B" onClick={() => store.heal(char.id, 1)}>+1</QuickBtn>
              <QuickBtn color="#3FC56B" strong onClick={() => store.heal(char.id, 5)}>+5</QuickBtn>
              <QuickBtn color={t.acc} onClick={() => store.setTempHp(char.id, char.combat.hpTemp + 5)}>+5 Temp</QuickBtn>
              {char.combat.hpTemp > 0 && (
                <QuickBtn color={t.muted} onClick={() => store.setTempHp(char.id, 0)}>Zerar Temp</QuickBtn>
              )}
            </div>
          </div>
        </div>

        {/* morrendo: testes contra a morte em destaque */}
        {dying && (
          <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.danger, 0.5), background: hexA(t.danger, 0.1), display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: t.danger }}>
              CAINDO — Testes contra a Morte
            </div>
            <DeathPips label="Sucessos" color="#3FC56B" value={char.combat.deathSaves.success} onSet={(n) => store.setDeathSave(char.id, 'success', n)} />
            <DeathPips label="Falhas" color={t.danger} value={char.combat.deathSaves.fail} onSet={(n) => store.setDeathSave(char.id, 'fail', n)} />
            <button onClick={rollDeathSave} className="fv-btn-gold" style={{ padding: '9px 16px', fontSize: 13, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="d20" size={15} /> Rolar teste
            </button>
          </div>
        )}

        {/* chips de defesa com "ver cálculo" */}
        <div style={{ marginTop: 13, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 }}>
          <StatChip label="CA" value={String(derived.ac)} info={calcLore('Classe de Armadura', bd.ac)} />
          <StatChip label="Iniciativa" value={modStr(derived.initiative)} info={calcLore('Iniciativa', bd.initiative)} onRoll={() => check('Iniciativa', derived.initiative)} />
          <StatChip label="Desloc." value={`${derived.speed.toString().replace('.', ',')}m`} info={calcLore('Deslocamento', bd.speed, { unit: 'm' })} />
          <StatChip label="Profic." value={modStr(derived.proficiency)} info={passiveLore('Bônus de Proficiência', modStr(derived.proficiency), 'Somado em tudo que você é treinado (PHB 2014).', ['Ver cálculo'])} />
          <StatChip label="Perc. Pass." value={String(derived.passivePerception)} info={calcLore('Percepção Passiva', bd.passivePerception)} />
          <StatChip
            label="Dados de Vida"
            value={`${char.combat.hitDiceRemaining}/${derived.hitDiceMax}`}
            info={passiveLore('Dados de Vida', `d${derived.hitDie}`, 'Gaste em descanso curto para curar (dado + CON). Metade recupera no descanso longo.', ['Descanso'])}
            onRoll={
              char.combat.hitDiceRemaining > 0
                ? () => { rollDice(derived.hitDie, { label: 'Dado de Vida', modifier: derived.abilities.con.mod }); store.spendHitDie(char.id); }
                : undefined
            }
          />
        </div>

        {/* atributos com modificador — sempre à mão na mesa */}
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
          {derived.abilityList.map((a) => {
            const color = ABILITY_COLORS[a.key];
            return (
              <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block', minWidth: 0 }}>
                <button
                  onClick={() => check(`Teste de ${ABILITY_LABELS[a.key]}`, a.mod)}
                  style={{
                    cursor: 'pointer',
                    width: '100%',
                    padding: '7px 2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid ' + hexA(color, 0.3),
                    borderBottom: '2px solid ' + hexA(color, 0.65),
                    background: `linear-gradient(180deg, ${hexA(color, 0.09)}, rgba(0,0,0,.26))`,
                    textAlign: 'center',
                    transition: '.2s',
                  }}
                >
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', color: hexA(color, 0.95) }}>
                    {ABILITY_SHORT[a.key]}
                  </div>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 17, color: 'var(--ink)', lineHeight: 1.1 }}>
                    {modStr(a.mod)}
                  </div>
                </button>
              </LoreTooltip>
            );
          })}
        </div>

        {/* economia de turno: ação, bônus, reação e movimento */}
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { k: 'action' as const, label: 'Ação' },
            { k: 'bonus' as const, label: 'Bônus' },
            { k: 'reaction' as const, label: 'Reação' },
          ]).map((d) => {
            const used = char.combat.turn[d.k];
            return (
              <button
                key={d.k}
                onClick={() => store.toggleTurn(char.id, d.k)}
                style={{
                  cursor: 'pointer',
                  flex: '1 1 80px',
                  minHeight: 36,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (used ? t.line : hexA(t.acc, 0.5)),
                  background: used ? 'rgba(0,0,0,.32)' : hexA(t.acc, 0.09),
                  color: used ? 'var(--muted)' : 'var(--ink)',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: used ? 'line-through' : 'none',
                  transition: '.2s',
                }}
              >
                {used ? '✓ ' : ''}{d.label}
              </button>
            );
          })}
          <span style={{ flex: '1 1 110px', textAlign: 'center', fontFamily: "'Chakra Petch', monospace", fontSize: 11.5, color: 'var(--muted)' }}>
            Mov. <b style={{ color: 'var(--ink)' }}>{(derived.speed - char.combat.moveUsed).toFixed(1).replace('.', ',')}</b>/{derived.speed.toString().replace('.', ',')} m
          </span>
          <button
            onClick={() => store.resetTurn(char.id)}
            style={{ cursor: 'pointer', minHeight: 36, padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'transparent', color: 'var(--acc)', fontSize: 11.5, fontWeight: 600 }}
          >
            ↺ Novo turno
          </button>
        </div>
      </Panel>

      {/* ===== GRID: rolagens + ataques ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 'clamp(12px,1.4vw,16px)', alignItems: 'start' }}>
        {/* Ataques */}
        <Panel>
          <div className="fv-label" style={{ marginBottom: 8 }}>Ataques</div>
          {derived.attacks.length === 0 && (
            <EmptyState icon="sword" title="Sem arma equipada" hint="Equipe uma arma no Inventário para atacar daqui." />
          )}
          {derived.attacks.map((atk) => (
            <div key={atk.uid} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{atk.name}</div>
              </div>
              <LoreTooltip info={calcLore(`Ataque · ${atk.name}`, atk.hitBreakdown)}>
                <button onClick={() => attack(atk)} style={atkBtn(t.gold)}>
                  {modStr(atk.attackBonus)}
                  <div style={atkSub}>ACERTO</div>
                </button>
              </LoreTooltip>
              <LoreTooltip info={calcLore(`Dano · ${atk.name}`, atk.damageBreakdown, { intro: `${atk.damageDice}d${atk.damageDie} ${atk.damageType}` })}>
                <button onClick={() => damage(atk)} style={atkBtn(t.danger)}>
                  {damageExpr(atk)}
                  <div style={atkSub}>DANO</div>
                </button>
              </LoreTooltip>
            </div>
          ))}
        </Panel>

        {/* Salvaguardas + perícias-chave */}
        <Panel>
          <div className="fv-label" style={{ marginBottom: 8 }}>Salvaguardas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {derived.abilityList.map((a) => (
              <button
                key={a.key}
                onClick={() => check(`Resist. de ${ABILITY_LABELS[a.key]}`, a.save)}
                style={{
                  cursor: 'pointer',
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (a.saveProf ? hexA(t.gold, 0.5) : t.line),
                  background: a.saveProf ? hexA(t.gold, 0.08) : 'rgba(0,0,0,.24)',
                  textAlign: 'center',
                  transition: '.2s',
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: '.08em', color: a.saveProf ? t.gold : 'var(--muted)' }}>{ABILITY_SHORT[a.key]}</div>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{modStr(a.save)}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, margin: '13px 0 8px' }}>
            <div className="fv-label">Perícias Treinadas</div>
            <button
              onClick={() => setSkillsOpen(true)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--acc)', fontSize: 11.5, fontWeight: 600 }}
            >
              Ver todas →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {proficientSkills.map((sk) => (
              <button
                key={sk.key}
                onClick={() => check(sk.label, sk.bonus)}
                style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 32, padding: '7px 12px', borderRadius: 999, border: '1px solid ' + (sk.expertise ? t.gold : hexA(t.gold, 0.4)), background: sk.expertise ? hexA(t.gold, 0.13) : hexA(t.gold, 0.07), color: 'var(--ink)', transition: '.2s' }}
              >
                {sk.label} <b style={{ color: t.gold, fontFamily: "'Chakra Petch', monospace" }}>{modStr(sk.bonus)}</b>
              </button>
            ))}
            {proficientSkills.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sem proficiências ainda.</span>}
          </div>
        </Panel>

        {/* Magia (se conjurador) */}
        {derived.isCaster && (
          <Panel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div className="fv-label">Magia</div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                CD{' '}
                <LoreTooltip info={calcLore('CD de Magia', bd.spellDC!)}>
                  <b style={{ cursor: 'help', color: t.gold, fontFamily: "'Chakra Petch', monospace" }}>{derived.spellDC}</b>
                </LoreTooltip>{' '}
                · Ataque{' '}
                <LoreTooltip info={calcLore('Ataque Mágico', bd.spellAttack!)}>
                  <b style={{ cursor: 'help', color: t.acc, fontFamily: "'Chakra Petch', monospace" }}>{modStr(derived.spellAttack!)}</b>
                </LoreTooltip>
              </span>
            </div>
            {slotLevels.map((lv) => {
              const slot = char.combat.spellSlots[lv];
              return (
                <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, color: 'var(--ink)', minWidth: 72 }}>{lv}º círculo</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
              <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {prepared.slice(0, 8).map((sp) => (
                  <LoreTooltip key={sp.id} info={spellLore(sp)}>
                    <span className="fv-chip" style={{ cursor: 'help', fontSize: 10.5, padding: '4px 9px' }}>
                      {sp.level === 0 ? 'T' : sp.level} · {sp.name}
                    </span>
                  </LoreTooltip>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Recursos + descansos */}
        <Panel>
          <div className="fv-label" style={{ marginBottom: 8 }}>Recursos &amp; Descanso</div>
          {(cls.resources ?? []).map((res) => {
            const left = char.combat.resources[res.id] ?? 0;
            return (
              <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                <LoreTooltip info={passiveLore(res.label, `${left}/${res.max}`, `${res.desc}. Recarrega em descanso ${res.recharge === 'short' ? 'curto' : 'longo'}.`, ['Recurso'])}>
                  <span style={{ cursor: 'help', flex: 1, fontFamily: "'Cinzel', serif", fontSize: 13.5, color: 'var(--ink)' }}>{res.label}</span>
                </LoreTooltip>
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 14, color: left > 0 ? t.gold : 'var(--muted)' }}>
                  {left}/{res.max}
                </span>
                <QuickBtn color={t.danger} onClick={() => store.setResource(char.id, res.id, Math.max(0, left - 1))}>Usar</QuickBtn>
                <QuickBtn color={t.acc} onClick={() => store.setResource(char.id, res.id, Math.min(res.max, left + 1))}>+</QuickBtn>
              </div>
            );
          })}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button onClick={() => store.shortRest(char.id)} style={{ ...restBtn, borderColor: t.acc, color: t.acc }}>
              <Icon name="moon" size={14} /> Descanso Curto
            </button>
            <button onClick={() => store.longRest(char.id)} style={{ ...restBtn, borderColor: t.gold, color: t.gold, background: hexA(t.gold, 0.08) }}>
              <Icon name="moon" size={14} /> Descanso Longo
            </button>
          </div>
        </Panel>

        {/* Condições: seleção compacta + só as ativas à vista */}
        <Panel>
          <div className="fv-label" style={{ marginBottom: 8 }}>Condições</div>
          <select
            className="fv-input"
            value={condPick}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !char.combat.conditions.includes(v)) store.toggleCondition(char.id, v);
              setCondPick('');
            }}
            style={{ minHeight: 42, padding: '9px 34px 9px 12px', fontSize: 13.5 }}
          >
            <option value="" style={{ color: '#111' }}>Selecionar condição…</option>
            {CONDITIONS.filter((c) => !char.combat.conditions.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id} style={{ color: '#111' }}>{c.label} — {c.short}</option>
            ))}
          </select>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {char.combat.conditions.map((c) => {
              const def = getCondition(c);
              return (
                <LoreTooltip key={c} info={conditionLore(c)} anchorStyle={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.danger, 0.5), background: hexA(t.danger, 0.1), boxShadow: '0 0 12px ' + hexA(t.danger, 0.18) }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, flex: 'none', background: t.danger, boxShadow: '0 0 8px ' + t.danger }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{def?.label ?? c}</div>
                      {def && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{def.short}</div>}
                    </div>
                    <button
                      onClick={() => store.toggleCondition(char.id, c)}
                      aria-label={`Remover ${c}`}
                      style={{ cursor: 'pointer', flex: 'none', width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid ' + hexA(t.danger, 0.5), background: 'rgba(0,0,0,.3)', color: t.danger, fontSize: 13 }}
                    >
                      ✕
                    </button>
                  </div>
                </LoreTooltip>
              );
            })}
            {char.combat.conditions.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhuma condição ativa — como deve ser.</div>
            )}
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
        style={{
          cursor: onRoll ? 'pointer' : 'help',
          width: '100%',
          textAlign: 'center',
          padding: '9px 6px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)',
          borderTop: '2px solid ' + (onRoll ? 'var(--acc)' : 'var(--line)'),
          background: 'rgba(0,0,0,.26)',
          transition: '.2s',
        }}
      >
        <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{value}</div>
        <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </button>
    </LoreTooltip>
  );
}

function QuickBtn({ children, color, strong, onClick }: { children: React.ReactNode; color: string; strong?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: "'Chakra Petch', monospace",
        fontWeight: 700,
        fontSize: 12.5,
        minHeight: 34,
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid ' + (strong ? color : hexA(color, 0.45)),
        background: strong ? hexA(color, 0.12) : 'transparent',
        color,
        transition: '.2s',
      }}
    >
      {children}
    </button>
  );
}

function DeathPips({ label, color, value, onSet }: { label: string; color: string; value: number; onSet: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color }}>{label}</span>
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
  background: 'rgba(0,0,0,.24)',
  fontFamily: "'Cinzel', serif",
  fontWeight: 700,
  fontSize: 12.5,
  transition: '.2s',
};

function atkBtn(color: string): CSSProperties {
  return {
    cursor: 'pointer',
    fontFamily: "'Chakra Petch', monospace",
    fontWeight: 700,
    fontSize: 13.5,
    color,
    padding: '7px 11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid ' + hexA(color, 0.4),
    background: 'rgba(0,0,0,.26)',
    lineHeight: 1.05,
  };
}

const atkSub: CSSProperties = {
  fontSize: 7.5,
  letterSpacing: '.12em',
  color: 'var(--muted)',
  fontWeight: 600,
  marginTop: 2,
};
