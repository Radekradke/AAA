import { useMemo } from 'react';
import type { Character } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { creationGains, creationPending } from '@/engine/creationSummary';
import { getRace } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';

interface LiveSummaryProps {
  char: Character;
  /** Navega até a etapa onde resolver uma pendência. */
  onGoStep?: (step: number) => void;
}

/**
 * Resumo vivo do herói durante a criação: o personagem tomando forma —
 * identidade, atributos com modificador, vitais, tudo que as escolhas
 * desbloquearam ("Você desbloqueou…") e o que ainda falta.
 */
export function LiveSummary({ char, onGoStep }: LiveSummaryProps) {
  const t = useTheme();
  const derived = useMemo(() => deriveCharacter(char), [char]);
  const gains = useMemo(() => creationGains(char), [char]);
  const pending = useMemo(() => creationPending(char), [char]);

  const race = getRace(char.raceId);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {/* identidade */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 17, color: char.name.trim() ? 'var(--ink)' : 'var(--muted)', lineHeight: 1.2 }}>
          {char.name.trim() || 'Herói sem nome'}
        </div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--acc)' }}>
          {race.label} · {cls.label} · Nível {char.level}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{bg.label}</div>
      </div>

      {/* atributos com modificador */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {derived.abilityList.map((a) => {
          const color = ABILITY_COLORS[a.key];
          return (
            <div key={a.key} style={{ textAlign: 'center', padding: '5px 2px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + hexA(color, 0.3), background: hexA(color, 0.07) }}>
              <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 8.5, fontWeight: 700, color: hexA(color, 0.95) }}>{ABILITY_SHORT[a.key]}</div>
              <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 14, color: 'var(--ink)', lineHeight: 1.1 }}>{modStr(a.mod)}</div>
            </div>
          );
        })}
      </div>

      {/* vitais */}
      <div style={{ display: 'flex', gap: 5 }}>
        {[
          { label: 'PV', value: String(derived.maxHp) },
          { label: 'CA', value: String(derived.ac) },
          { label: 'DESL.', value: `${String(derived.speed).replace('.', ',')}m` },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.24)' }}>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: t.gold }}>{s.value}</div>
            <div style={{ fontSize: 8.5, letterSpacing: '.1em', color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* pendências — guiam sem agredir */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map((p) => (
            <button
              key={p.label}
              onClick={onGoStep ? () => onGoStep(p.step) : undefined}
              style={{
                cursor: onGoStep ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed ' + hexA(t.acc, 0.5),
                background: hexA(t.acc, 0.06),
                color: 'var(--ink)',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              <span aria-hidden style={{ flex: 'none', width: 7, height: 7, borderRadius: 999, background: t.acc, boxShadow: `0 0 7px ${t.acc}` }} />
              <span style={{ flex: 1 }}>{p.label}</span>
              {onGoStep && <span style={{ flex: 'none', fontSize: 10, color: t.acc }}>Resolver ›</span>}
            </button>
          ))}
        </div>
      )}
      {pending.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA('#3FC56B', 0.4), background: hexA('#3FC56B', 0.07), fontSize: 11.5, fontWeight: 700, color: '#3FC56B' }}>
          <Icon name="starFill" size={13} /> Ficha pronta para o despertar
        </div>
      )}

      {/* desbloqueios por escolha */}
      <div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, marginBottom: 7 }}>
          Você desbloqueou
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {gains.map((g) => (
            <div key={g.source}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{g.source}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {g.items.map((item) => (
                  <span
                    key={item}
                    className="animate-popIn"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      padding: '4px 8px',
                      borderRadius: 999,
                      border: '1px solid ' + hexA(t.gold, 0.3),
                      background: hexA(t.gold, 0.06),
                      color: 'var(--ink)',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
