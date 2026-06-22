import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { SelectableCard } from './SelectableCard';
import { CLASSES, getClass } from '@/data/classes';
import { standardArrayFor } from '@/engine/characterBuilder';
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
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo III"
        title="Caminho"
        subtitle="A classe define o seu papel na batalha e na lenda. Doze caminhos, uma vocação."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 11 }}>
        {CLASSES.map((c) => {
          const sel = char.classId === c.id;
          return (
            <SelectableCard key={c.id} selected={sel} jewel={c.jewel} onClick={() => pickClass(c.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1,
                    width: 40,
                    textAlign: 'center',
                    color: sel ? t.gold : c.jewel,
                    textShadow: '0 0 14px ' + hexA(sel ? t.gold : c.jewel, 0.5),
                  }}
                >
                  {c.mono}
                </div>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', lineHeight: 1.1 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                    {c.die} · {c.primShort}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 9, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--acc)' }}>
                {c.kind}
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>{cls.label}</div>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: 'var(--acc)' }}>
            Dado de Vida {cls.die} · {cls.kind} · {cls.primShort}
          </div>
        </div>
        <p style={{ margin: '9px 0 0', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>{cls.blurb}</p>
      </div>
    </div>
  );
}
