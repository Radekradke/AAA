import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { getClass } from '@/data/classes';
import { damageExpr } from '@/engine/combat';
import { modStr } from '@/engine/dice';

export function TabCombate({ char, derived }: TabProps) {
  const t = useTheme();
  const { attack, damage, rollDice } = useDiceRoller();
  const store = useCharacterStore();
  const cls = getClass(char.classId);

  const hpMax = derived.maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((char.hpCurrent / Math.max(1, hpMax)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';

  const turnDefs = [
    { k: 'action' as const, label: 'Ação' },
    { k: 'bonus' as const, label: 'Ação Bônus' },
    { k: 'reaction' as const, label: 'Reação' },
  ];
  const moveLeft = (derived.speed - char.combat.moveUsed).toFixed(1).replace('.', ',');

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Vitalidade */}
      <Panel full>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
          <div className="fv-label">Pontos de Vida</div>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 'clamp(26px,4vw,38px)', lineHeight: 1, color: hpColor }}>
            {char.hpCurrent}
            <span style={{ fontSize: '.5em', color: 'var(--muted)' }}> / {hpMax}</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            height: 'clamp(20px,2.6vw,26px)',
            borderRadius: 999,
            background: 'rgba(0,0,0,.4)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,.4)',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${hexA(hpColor, 0.6)}, ${hpColor})`,
              boxShadow: `0 0 18px ${hexA(hpColor, 0.7)}`,
              transition: 'width .45s cubic-bezier(.2,.8,.2,1), background .4s',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 12, letterSpacing: '.1em', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>
            {pct}%
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <HpBtn label="−5 Dano" color="var(--danger)" strong onClick={() => store.applyDamage(char.id, 5)} />
          <HpBtn label="−1" color="var(--danger)" onClick={() => store.applyDamage(char.id, 1)} />
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
      </Panel>

      {/* Ataques */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 6 }}>Ataques</div>
        {derived.attacks.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Nenhuma arma equipada. Equipe uma arma no Inventário.
          </div>
        )}
        {derived.attacks.map((atk) => (
          <div key={atk.uid} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{atk.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{atk.note}</div>
            </div>
            <button
              onClick={() => attack(atk)}
              style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: 'var(--gold)', padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', lineHeight: 1.05 }}
            >
              {modStr(atk.attackBonus)}
              <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>ACERTO</div>
            </button>
            <button
              onClick={() => damage(atk)}
              style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, color: 'var(--danger)', padding: '7px 13px', borderRadius: 10, border: '1px solid rgba(255,80,40,.35)', background: 'transparent', lineHeight: 1.05 }}
            >
              {damageExpr(atk)}
              <div style={{ fontSize: 8, letterSpacing: '.12em', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{atk.damageType.toUpperCase()}</div>
            </button>
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
              <button
                key={d.k}
                onClick={() => store.toggleTurn(char.id, d.k)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 14px',
                  borderRadius: 11,
                  border: '1px solid ' + (used ? t.line : hexA(t.acc, 0.45)),
                  background: used ? 'rgba(0,0,0,.3)' : hexA(t.acc, 0.08),
                  color: used ? t.muted : t.ink,
                  fontFamily: "'Cinzel', serif",
                  fontSize: 14.5,
                  transition: '.2s',
                }}
              >
                <span>{d.label}</span>
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12 }}>{used ? 'Usada' : 'Disponível'}</span>
              </button>
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
              <button
                onClick={() => store.setResource(char.id, res.id, left > 0 ? left - 1 : res.max)}
                style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 10, border: '1px solid ' + (left > 0 ? t.gold : t.line), color: left > 0 ? t.gold : t.muted, background: left > 0 ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.26)' }}
              >
                {left} / {res.max}
              </button>
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
            <button
              onClick={() => { if (char.combat.hitDiceRemaining > 0) { rollDice(derived.hitDie, { label: 'Dado de Vida', modifier: derived.abilities.con.mod }); store.spendHitDie(char.id); } }}
              style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--acc)', background: 'rgba(0,0,0,.26)' }}
            >
              Gastar
            </button>
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
        padding: strong ? '9px 16px' : '9px 14px',
        borderRadius: 10,
        border: '1px solid ' + (strong ? color : hexA(color, 0.4)),
        background: strong ? hexA(color, 0.1) : 'transparent',
        transition: '.2s',
      }}
    >
      {label}
    </button>
  );
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
