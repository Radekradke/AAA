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
  const selectedSub = subs.find((s) => s.id === char.subraceId);
  const totalSpeed = race.speed + (selectedSub?.speedBonus ?? 0);
  const traits = [...race.traits, ...(selectedSub?.traits ?? [])];

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
        subtitle="A linhagem molda corpo, sentidos e destino. Escolha o legado que marca o primeiro capítulo da lenda."
      />

      <div className="fv-responsive-split fv-origin-layout">
        <div className="fv-card-grid" style={{ alignContent: 'start' }}>
          {RACES.map((r) => {
            const sel = char.raceId === r.id;
            return (
              <SelectableCard
                key={r.id}
                selected={sel}
                jewel={r.jewel}
                onClick={() => pickRace(r.id)}
                badge="LEGADO"
                style={{
                  minHeight: 128,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderColor: sel ? t.gold : hexA(r.jewel, 0.36),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 12,
                      border: '1px solid ' + hexA(sel ? t.gold : r.jewel, 0.6),
                      background: hexA(sel ? t.gold : r.jewel, sel ? 0.14 : 0.08),
                      boxShadow: '0 0 18px ' + hexA(sel ? t.gold : r.jewel, 0.28),
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 800,
                      fontSize: 24,
                      lineHeight: 1,
                      color: sel ? t.gold : r.jewel,
                    }}
                  >
                    {r.mono}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                    {r.label}
                  </div>
                  <div style={{ marginTop: 5, fontSize: 12, fontFamily: "'Chakra Petch', monospace", color: sel ? t.gold : 'var(--acc)' }}>
                    {r.bonus}
                  </div>
                </div>
              </SelectableCard>
            );
          })}
        </div>

        <div
          className="fv-surface fv-choice-detail"
          style={{
            borderColor: hexA(race.jewel, 0.42),
            padding: 'clamp(16px, 2vw, 20px)',
            boxShadow: 'var(--shadow-panel), inset 0 0 70px ' + hexA(race.jewel, 0.08),
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -20,
              top: -20,
              fontFamily: "'Cinzel', serif",
              fontWeight: 800,
              fontSize: 'clamp(96px, 16vw, 150px)',
              lineHeight: 1,
              color: hexA(race.jewel, 0.1),
              textShadow: '0 0 46px ' + hexA(race.jewel, 0.18),
            }}
          >
            {race.mono}
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: race.jewel, marginBottom: 8 }}>
              Linhagem escolhida
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1, color: 'var(--ink)' }}>
                {race.label}
              </div>
              <span className="fv-chip fv-chip-gold">{race.bonus}</span>
            </div>
            <p style={{ margin: '13px 0 16px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.62, maxWidth: 620 }}>
              {race.desc}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 10, marginBottom: subs.length ? 18 : 0 }}>
              <div style={{ padding: 12, borderRadius: 13, border: '1px solid var(--line)', background: 'rgba(0,0,0,.22)' }}>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
                  {totalSpeed.toString().replace('.', ',')} m
                </div>
                <div style={{ marginTop: 2, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  deslocamento
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 13, border: '1px solid var(--line)', background: 'rgba(0,0,0,.22)' }}>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: race.jewel }}>
                  {traits.length}
                </div>
                <div style={{ marginTop: 2, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  traços de origem
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: subs.length ? 18 : 0 }}>
              {traits.map((tr) => (
                <span key={tr} className="fv-chip">
                  {tr}
                </span>
              ))}
            </div>

            {subs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 9 }}>
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
                          minHeight: 38,
                          padding: '9px 15px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                          border: '1px solid ' + (sel ? t.gold : t.line),
                          color: sel ? t.gold : t.muted,
                          background: sel ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.18)',
                          boxShadow: sel ? '0 0 18px ' + hexA(t.gold, 0.18) : 'none',
                          transition: '.25s',
                        }}
                      >
                        <span>{sub.label}</span>
                        {sub.bonus && (
                          <span style={{ marginLeft: 8, color: sel ? 'var(--ink)' : 'var(--acc)', fontFamily: "'Chakra Petch', monospace", fontSize: 11 }}>
                            {sub.bonus}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedSub?.bonus && (
                  <div style={{ marginTop: 11, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    <b style={{ color: 'var(--ink)' }}>{selectedSub.label}:</b> {selectedSub.bonus} aplicado no cálculo final.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
