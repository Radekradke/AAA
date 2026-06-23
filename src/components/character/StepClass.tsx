import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { SelectableCard } from './SelectableCard';
import { CLASSES, getClass } from '@/data/classes';
import { ABILITY_LABELS, ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { standardArrayFor } from '@/engine/characterBuilder';
import { applySelection, defaultSelection } from '@/engine/loadout';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

export function StepClass({ char, update }: StepProps) {
  const t = useTheme();
  const cls = getClass(char.classId);

  const pickClass = (id: string) =>
    update((c) => {
      c.classId = id;
      const newCls = getClass(id);
      c.savingThrowProfs = newCls.savingThrows;
      // realinha o array padrão e limpa as perícias para as opções da nova classe
      c.baseAbilities = standardArrayFor(id);
      c.skillProfs = [];
      if (c.inventory.length > 0) applySelection(c, defaultSelection(id));
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo III"
        title="Caminho"
        subtitle="A classe define seu ritmo em cena: como você enfrenta perigo, protege aliados e vira lenda."
      />

      <div className="fv-responsive-split fv-class-layout">
        <div className="fv-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', alignContent: 'start' }}>
          {CLASSES.map((c) => {
            const sel = char.classId === c.id;
            return (
              <SelectableCard
                key={c.id}
                selected={sel}
                jewel={c.jewel}
                onClick={() => pickClass(c.id)}
                style={{
                  minHeight: 118,
                  padding: 13,
                  borderColor: sel ? t.gold : hexA(c.jewel, 0.34),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 11,
                      border: '1px solid ' + hexA(sel ? t.gold : c.jewel, 0.58),
                      background: hexA(sel ? t.gold : c.jewel, sel ? 0.14 : 0.08),
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 800,
                      fontSize: 22,
                      lineHeight: 1,
                      color: sel ? t.gold : c.jewel,
                      boxShadow: '0 0 16px ' + hexA(sel ? t.gold : c.jewel, 0.25),
                    }}
                  >
                    {c.mono}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', lineHeight: 1.1 }}>
                      {c.label}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: sel ? t.gold : 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                      {c.die} · {c.primShort}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--acc)' }}>
                    {c.kind}
                  </span>
                  <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {c.skillPicks} perícias
                  </span>
                </div>
              </SelectableCard>
            );
          })}
        </div>

        <div
          className="fv-surface fv-choice-detail"
          style={{
            borderColor: hexA(cls.jewel, 0.42),
            padding: 'clamp(16px, 2vw, 20px)',
            boxShadow: 'var(--shadow-panel), inset 0 0 70px ' + hexA(cls.jewel, 0.08),
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -24,
              top: -18,
              width: 170,
              height: 170,
              borderRadius: 999,
              border: '1px solid ' + hexA(cls.jewel, 0.18),
              boxShadow: 'inset 0 0 50px ' + hexA(cls.jewel, 0.1) + ', 0 0 52px ' + hexA(cls.jewel, 0.13),
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: cls.jewel, marginBottom: 8 }}>
              Caminho escolhido
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 16,
                  border: '1px solid ' + hexA(cls.jewel, 0.52),
                  background: hexA(cls.jewel, 0.1),
                  boxShadow: '0 0 26px ' + hexA(cls.jewel, 0.24),
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: 30,
                  color: cls.jewel,
                }}
              >
                {cls.mono}
              </div>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1, color: 'var(--ink)' }}>
                  {cls.label}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <span className="fv-chip fv-chip-gold">{cls.kind}</span>
                  <span className="fv-chip">Dado de Vida {cls.die}</span>
                  <span className="fv-chip">{ABILITY_LABELS[cls.prim]}</span>
                </div>
              </div>
            </div>

            <p style={{ margin: '15px 0 16px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.62 }}>
              {cls.blurb}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10, marginBottom: 16 }}>
              <ClassStat label="atributo-chave" value={ABILITY_SHORT[cls.prim]} color={cls.jewel} />
              <ClassStat label="resistências" value={cls.savingThrows.map((k) => ABILITY_SHORT[k]).join(' / ')} color="var(--gold)" />
              <ClassStat label="escolhas" value={`${cls.skillPicks} perícias`} color="var(--acc)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Perícias possíveis
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {cls.skillChoices.slice(0, 8).map((key) => (
                    <span key={key} className="fv-chip">
                      {SKILL_BY_KEY[key].label}
                    </span>
                  ))}
                  {cls.skillChoices.length > 8 && <span className="fv-chip">+{cls.skillChoices.length - 8}</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Recursos iniciais
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {cls.resources?.length ? (
                    cls.resources.map((res) => (
                      <span key={res.id} className="fv-chip fv-chip-gold">
                        {res.label}
                      </span>
                    ))
                  ) : (
                    <span className="fv-chip">Sem recurso dedicado no nível 1</span>
                  )}
                  {cls.spellcasting && <span className="fv-chip fv-chip-gold">Conjuração</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 13, border: '1px solid var(--line)', background: 'rgba(0,0,0,.22)' }}>
      <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 800, fontSize: 18, color }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  );
}
