import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { getClass } from '@/data/classes';
import { damageExpr } from '@/engine/combat';
import { modStr } from '@/engine/dice';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { calcLore, passiveLore } from '@/lib/lore';

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
  const { attack, damage, rollDice, check } = useDiceRoller();
  const store = useCharacterStore();
  const cls = getClass(char.classId);
  const [amt, setAmt] = useState('');
  // CD da salvaguarda de Concentração após sofrer dano (10 ou metade do dano)
  const [concDC, setConcDC] = useState<number | null>(null);

  const hpMax = derived.maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((char.hpCurrent / Math.max(1, hpMax)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';

  const turnDefs = [
    { k: 'action' as const, label: 'Ação' },
    { k: 'bonus' as const, label: 'Ação Bônus' },
    { k: 'reaction' as const, label: 'Reação' },
  ];
  const moveLeft = (derived.speed - char.combat.moveUsed).toFixed(1).replace('.', ',');
  const concentrating = !!char.combat.concentration;
  const exhaustion = char.combat.exhaustion ?? 0;

  // aplica dano e, se concentrando, calcula a CD da salvaguarda de CON (10 ou metade)
  const dealDamage = (n: number) => {
    if (n <= 0) return;
    store.applyDamage(char.id, n);
    if (concentrating) setConcDC(Math.max(10, Math.floor(n / 2)));
  };
  const applyAmount = (heal: boolean) => {
    const n = Math.max(0, Math.floor(Number(amt) || 0));
    if (!n) return;
    if (heal) store.heal(char.id, n);
    else dealDamage(n);
    setAmt('');
  };

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Vitalidade */}
      <Panel full>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
          <LoreTooltip info={calcLore('PV máximo', derived.breakdowns.maxHp, { intro: 'Como o PV máximo foi construído, nível a nível.' })}>
            <div className="fv-label" style={{ cursor: 'help' }}>Pontos de Vida</div>
          </LoreTooltip>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 'clamp(26px,4vw,38px)', lineHeight: 1, color: hpColor }}>
            {char.hpCurrent}
            <span style={{ fontSize: '.5em', color: 'var(--muted)' }}> / {hpMax}</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            height: 'clamp(20px,2.6vw,26px)',
            borderRadius: 5,
            background: 'rgba(0,0,0,.44)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,.4)',
            clipPath: 'polygon(7px 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 7px 100%, 0 50%)',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${hexA(hpColor, 0.6)}, ${hpColor})`,
              boxShadow: `0 0 18px ${hexA(hpColor, 0.7)}`,
              transition: 'width .45s cubic-bezier(.2,.8,.2,1), background .4s',
            }}
          />
          {/* entalhes de HUD a cada 10% */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.5) calc(10% - 1px) 10%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 12, letterSpacing: '.1em', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>
            {pct}%
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <HpBtn label="−5 Dano" color="var(--danger)" strong onClick={() => dealDamage(5)} />
          <HpBtn label="−1" color="var(--danger)" onClick={() => dealDamage(1)} />
          <HpBtn label="+1" color="#3FC56B" onClick={() => store.heal(char.id, 1)} />
          <HpBtn label="+5 Cura" color="#3FC56B" strong onClick={() => store.heal(char.id, 5)} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
            PV Temp.
            <button
              onClick={() => store.setTempHp(char.id, char.combat.hpTemp + 5)}
              onContextMenu={(e) => { e.preventDefault(); store.setTempHp(char.id, 0); }}
              title="Clique: +5 · clique direito: zerar"
              style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, color: 'var(--ink)', fontSize: 15, background: 'rgba(0,0,0,.3)', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 10px' }}
            >
              {char.combat.hpTemp}
            </button>
          </div>
        </div>

        {/* dano/cura por valor exato */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="fv-input"
            value={amt}
            onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') applyAmount(false); }}
            inputMode="numeric"
            placeholder="valor"
            aria-label="Valor de dano ou cura"
            style={{ width: 92, minHeight: 40, textAlign: 'center', fontFamily: "'Chakra Petch', monospace", fontWeight: 700 }}
          />
          <button onClick={() => applyAmount(false)} disabled={!amt} style={amtBtn('var(--danger)', !!amt)}>Aplicar dano</button>
          <button onClick={() => applyAmount(true)} disabled={!amt} style={amtBtn('#3FC56B', !!amt)}>Curar</button>
        </div>

        {/* lembrete: salvaguarda de Concentração após sofrer dano */}
        {concentrating && concDC !== null && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.acc, 0.6), background: hexA(t.acc, 0.1) }}>
            <span style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: 'var(--ink)' }}>
              Concentração: salvaguarda de <b>Constituição</b> CD <b style={{ color: t.acc, fontFamily: "'Chakra Petch', monospace" }}>{concDC}</b>
            </span>
            <button
              onClick={() => { check(`Concentração · CON (CD ${concDC})`, derived.abilities.con.save); setConcDC(null); }}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + t.acc, background: hexA(t.acc, 0.14), color: t.acc, fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13 }}
            >
              Rolar {modStr(derived.abilities.con.save)}
            </button>
            <button onClick={() => setConcDC(null)} aria-label="Dispensar" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Concentração — lembrete para o conjurador (salvaguarda de CON ao sofrer dano) */}
        <LoreTooltip info={passiveLore('Concentração', concentrating ? 'Ativa' : 'Inativa', 'Muitas magias exigem concentração. Ao sofrer dano, faça uma salvaguarda de Constituição (CD 10 ou metade do dano, o que for maior) ou a magia termina. Só é possível concentrar em uma magia por vez. Cair a 0 PV rompe a concentração.', ['Conjuração'])} anchorStyle={{ display: 'block' }}>
          <button
            onClick={() => store.toggleConcentration(char.id)}
            className={concentrating ? 'animate-glowPulse' : undefined}
            style={{
              marginTop: 12,
              width: '100%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid ' + (concentrating ? t.acc : t.line),
              background: concentrating ? hexA(t.acc, 0.12) : 'rgba(0,0,0,.26)',
              color: concentrating ? t.acc : t.muted,
              fontFamily: "'Cinzel', serif",
              fontSize: 14,
              transition: '.2s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 11, height: 11, borderRadius: 999, background: concentrating ? t.acc : 'transparent', border: '1px solid ' + (concentrating ? t.acc : t.muted), boxShadow: concentrating ? `0 0 10px ${t.acc}` : 'none', transition: '.2s' }} />
              {concentrating ? 'Concentrando numa magia' : 'Concentração'}
            </span>
            <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11.5 }}>{concentrating ? 'romper' : 'inativa'}</span>
          </button>
        </LoreTooltip>
      </Panel>

      {/* Ataques */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 6 }}>Ataques</div>
        {derived.attacks.length === 0 && (
          <EmptyState
            icon="sword"
            title="Nenhuma arma equipada"
            hint="Vá ao Inventário e toque em Equipar numa arma — o ataque e o dano aparecem aqui prontos para rolar."
          />
        )}
        {derived.attacks.map((atk) => (
          <div key={atk.uid} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{atk.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{atk.note}</div>
            </div>
            <LoreTooltip info={calcLore(`Ataque · ${atk.name}`, atk.hitBreakdown, { intro: '1d20 + os bônus abaixo. Compare com a CA do alvo.' })}>
              <button
                onClick={() => attack(atk)}
                style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: 'var(--gold)', padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', lineHeight: 1.05 }}
              >
                {modStr(atk.attackBonus)}
                <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>ACERTO</div>
              </button>
            </LoreTooltip>
            <LoreTooltip info={calcLore(`Dano · ${atk.name}`, atk.damageBreakdown, { intro: `${atk.damageDice}d${atk.damageDie} ${atk.damageType} + os bônus abaixo (crítico: dobre os dados).` })}>
              <button
                onClick={() => damage(atk)}
                style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, color: 'var(--danger)', padding: '7px 13px', borderRadius: 10, border: '1px solid rgba(255,80,40,.35)', background: 'transparent', lineHeight: 1.05 }}
              >
                {damageExpr(atk)}
                <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{atk.damageType.toUpperCase()}</div>
              </button>
            </LoreTooltip>
          </div>
        ))}
      </Panel>

      {/* Economia de Turno */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 13 }}>
          <div className="fv-label">Economia de Turno</div>
          <button onClick={() => store.resetTurn(char.id)} style={{ cursor: 'pointer', fontSize: 11, color: 'var(--acc)', background: 'none', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
            ↺ Novo turno
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {turnDefs.map((d) => {
            const used = char.combat.turn[d.k];
            return (
              <LoreTooltip key={d.k} info={passiveLore(d.label, used ? 'Usada' : 'Disponível', 'Marque para controlar o que seu personagem já gastou no turno atual. Use “Novo turno” para limpar ação, bônus, reação e movimento.', ['Economia de turno'])} anchorStyle={{ display: 'block' }}>
                <button
                  onClick={() => store.toggleTurn(char.id, d.k)}
                  style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 46,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid ' + (used ? t.line : hexA(t.acc, 0.45)),
                  background: used ? 'rgba(0,0,0,.3)' : hexA(t.acc, 0.08),
                  color: used ? t.muted : t.ink,
                  fontFamily: "'Cinzel', serif",
                  fontSize: 14.5,
                  transition: '.2s',
                }}
                >
                  <span style={{ textDecoration: used ? 'line-through' : 'none' }}>{used ? '✓ ' : ''}{d.label}</span>
                  <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: used ? t.muted : t.acc }}>{used ? 'Usada' : 'Disponível'}</span>
                </button>
              </LoreTooltip>
            );
          })}
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ink)' }}>Movimento</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {moveLeft} m de {derived.speed.toString().replace('.', ',')} m
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => store.adjustMove(char.id, -1.5)} style={moveBtn(false)}>−1,5</button>
            <button onClick={() => store.adjustMove(char.id, 1.5)} style={moveBtn(true)}>+1,5</button>
          </div>
        </div>
      </Panel>

      {/* Recursos */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 13 }}>Recursos de Combate</div>

        {(cls.resources ?? []).map((res) => {
          const left = char.combat.resources[res.id] ?? 0;
          return (
            <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ink)' }}>{res.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{res.desc} · recarga {res.recharge === 'short' ? 'curta' : 'longa'}</div>
              </div>
              <LoreTooltip info={passiveLore(res.label, `${left}/${res.max}`, `${res.desc}. Recarrega em descanso ${res.recharge === 'short' ? 'curto' : 'longo'}.`, ['Recurso de classe'])}>
                <button
                  onClick={() => store.setResource(char.id, res.id, left > 0 ? left - 1 : res.max)}
                  style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 10, border: '1px solid ' + (left > 0 ? t.gold : t.line), color: left > 0 ? t.gold : t.muted, background: left > 0 ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.26)' }}
                >
                  {left} / {res.max}
                </button>
              </LoreTooltip>
            </div>
          );
        })}

        {/* Dados de Vida */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ink)' }}>Dados de Vida</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{derived.hitDiceMax}d{derived.hitDie} · gaste no descanso</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <LoreTooltip info={passiveLore('Dado de Vida', `${derived.hitDiceMax}d${derived.hitDie}`, 'Durante um descanso curto, gaste um dado de vida para rolar cura e somar Constituição. Descanso longo recupera parte deles.', ['Descanso', 'Cura'])}>
              <button
                onClick={() => { if (char.combat.hitDiceRemaining > 0) { rollDice(derived.hitDie, { label: 'Dado de Vida', modifier: derived.abilities.con.mod }); store.spendHitDie(char.id); } }}
                style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--acc)', background: 'rgba(0,0,0,.26)' }}
              >
                Gastar
              </button>
            </LoreTooltip>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: 'var(--ink)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}>
              {char.combat.hitDiceRemaining} / {derived.hitDiceMax}
            </div>
          </div>
        </div>

        {/* Resgate da Morte */}
        <div style={{ padding: '13px 0 2px' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ink)', marginBottom: 9 }}>Resgate da Morte</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <DeathRow label="Sucesso" color="#3FC56B" value={char.combat.deathSaves.success} onClick={(n) => store.setDeathSave(char.id, 'success', n)} />
            <DeathRow label="Falha" color={t.danger} value={char.combat.deathSaves.fail} onClick={(n) => store.setDeathSave(char.id, 'fail', n)} />
          </div>
        </div>

        {/* Exaustão (0–6, PHB 2014) */}
        <div style={{ padding: '13px 0 2px', borderTop: '1px solid var(--line)', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--ink)' }}>Exaustão</div>
            <span style={{ fontSize: 11, color: exhaustion >= 4 ? t.danger : 'var(--muted)', fontWeight: 600 }}>{EXHAUSTION_EFFECT[exhaustion]}</span>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const on = exhaustion >= n;
              const col = n >= 5 ? t.danger : n >= 3 ? '#E0A93E' : t.acc;
              return (
                <LoreTooltip key={n} info={passiveLore(`Exaustão · nível ${n}`, EXHAUSTION_EFFECT[n], 'A exaustão acumula em níveis (1–6). Cada nível soma-se aos anteriores. Um descanso longo remove 1 nível. Clique num nível para defini-lo; clique nele de novo para recuar.', ['Condição'])}>
                  <span
                    onClick={() => store.setExhaustion(char.id, n)}
                    style={{
                      cursor: 'pointer',
                      width: 26,
                      height: 26,
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: "'Chakra Petch', monospace",
                      fontWeight: 700,
                      fontSize: 12,
                      borderRadius: 7,
                      border: '1px solid ' + (on ? col : 'var(--line)'),
                      background: on ? hexA(col, 0.16) : 'rgba(0,0,0,.26)',
                      color: on ? col : 'var(--muted)',
                      boxShadow: on ? `0 0 9px ${hexA(col, 0.5)}` : 'none',
                      transition: '.2s',
                    }}
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

function HpBtn({ label, color, strong, onClick }: { label: string; color: string; strong?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: "'Chakra Petch', monospace",
        fontWeight: 700,
        fontSize: 14,
        color,
        minHeight: 40,
        padding: strong ? '9px 16px' : '9px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid ' + (strong ? color : hexA(color, 0.4)),
        background: strong ? hexA(color, 0.1) : 'transparent',
        transition: '.2s',
      }}
    >
      {label}
    </button>
  );
}

function amtBtn(color: string, enabled: boolean): React.CSSProperties {
  return {
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: 12.5,
    color,
    minHeight: 40,
    padding: '9px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid ' + hexA(color, enabled ? 0.6 : 0.25),
    background: enabled ? hexA(color, 0.1) : 'transparent',
    opacity: enabled ? 1 : 0.5,
    transition: '.2s',
  };
}

function moveBtn(accent: boolean): React.CSSProperties {
  return {
    cursor: 'pointer',
    fontFamily: "'Chakra Petch', monospace",
    fontWeight: 700,
    fontSize: 13,
    color: accent ? 'var(--acc)' : 'var(--ink)',
    width: 46,
    padding: '8px 0',
    borderRadius: 9,
    border: '1px solid var(--line)',
    background: 'rgba(0,0,0,.26)',
  };
}

function DeathRow({ label, color, value, onClick }: { label: string; color: string; value: number; onClick: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 11, color }}>{label}</span>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          onClick={() => onClick(n)}
          style={{
            cursor: 'pointer',
            width: 17,
            height: 17,
            borderRadius: 999,
            border: '1px solid ' + (value >= n ? color : 'var(--line)'),
            background: value >= n ? color : 'transparent',
            boxShadow: value >= n ? `0 0 9px ${hexA(color, 0.6)}` : 'none',
            transition: '.2s',
          }}
        />
      ))}
    </div>
  );
}
