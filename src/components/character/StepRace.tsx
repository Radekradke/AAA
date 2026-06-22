import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { SelectableCard } from './SelectableCard';
import { RACES, getRace, getSubraces } from '@/data/races';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

export function StepRace({ char, update }: StepProps) {
  const t = useTheme();
  const race = getRace(char.raceId);
  const subs = getSubraces(char.raceId);

  const pickRace = (id: string) =>
    update((c) => {
      c.raceId = id;
      const s = getSubraces(id);
      c.subraceId = s.length ? s[s.length - 1].id : null;
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo II"
        title="Origem"
        subtitle="A linhagem molda o corpo e o destino. Escolha de onde vem a sua força."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 13 }}>
        {RACES.map((r) => {
          const sel = char.raceId === r.id;
          return (
            <SelectableCard key={r.id} selected={sel} jewel={r.jewel} onClick={() => pickRace(r.id)} badge="SELECIONADO">
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 700,
                  fontSize: 30,
                  lineHeight: 1,
                  color: sel ? t.gold : r.jewel,
                  textShadow: '0 0 18px ' + hexA(sel ? t.gold : r.jewel, 0.55),
                }}
              >
                {r.mono}
              </div>
              <div style={{ marginTop: 10, fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
                {r.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 12.5, fontFamily: "'Chakra Petch', monospace", color: 'var(--acc)' }}>
                {r.bonus}
              </div>
            </SelectableCard>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
          backdropFilter: 'blur(10px)',
          padding: 18,
        }}
      >
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{race.label}</div>
        <p style={{ margin: '7px 0 13px', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.55 }}>{race.desc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: subs.length ? 14 : 0 }}>
          {race.traits.map((tr) => (
            <span
              key={tr}
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid var(--line)',
                padding: '5px 11px',
                borderRadius: 999,
              }}
            >
              {tr}
            </span>
          ))}
        </div>
        {subs.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Sublinhagem
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {subs.map((sub) => {
                const sel = char.subraceId === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => update((c) => { c.subraceId = sub.id; })}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 15px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      border: '1px solid ' + (sel ? t.gold : t.line),
                      color: sel ? t.gold : t.muted,
                      background: sel ? hexA(t.gold, 0.1) : 'transparent',
                      transition: '.25s',
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
