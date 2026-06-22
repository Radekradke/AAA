import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { deriveCharacter } from '@/engine/dndRules';
import { raceLine } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import { modStr } from '@/engine/dice';

export function StepReview({ char }: StepProps) {
  const d = deriveCharacter(char);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);

  const allSkills = Array.from(new Set([...char.skillProfs, ...bg.skills]));
  const abilityLine = ABILITY_KEYS.map((k) => `${ABILITY_SHORT[k]} ${d.abilities[k].total}`).join(' · ');

  const rows = [
    { k: 'Nome', v: char.name.trim() || 'Herói Sem Nome' },
    { k: 'Origem', v: raceLine(char) },
    { k: 'Caminho', v: `${cls.label} · Nível ${char.level}` },
    { k: 'Antecedente', v: bg.label },
    { k: 'Atributos', v: abilityLine },
    { k: 'CA · PV · Prof.', v: `${d.ac} · ${d.maxHp} · +${d.proficiency}` },
    { k: 'Perícias', v: allSkills.map((s) => SKILL_BY_KEY[s].label).join(', ') || '—' },
    { k: 'Iniciativa · Desloc.', v: `${modStr(d.initiative)} · ${d.speed.toString().replace('.', ',')} m` },
  ];

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo VII"
        title="Despertar"
        subtitle="Tudo pronto. Revise a lenda e desperte o herói para a aventura."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.k}
            style={{
              background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
              border: '1px solid var(--line)',
              borderRadius: 13,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{r.k}</div>
            <div style={{ marginTop: 5, fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15, color: 'var(--ink)', lineHeight: 1.3 }}>
              {r.v}
            </div>
          </div>
        ))}
      </div>
      {char.concept.trim() && (
        <div
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 13,
            border: '1px solid var(--line)',
            background: 'rgba(0,0,0,.22)',
            color: 'var(--muted)',
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          “{char.concept.trim()}”
        </div>
      )}
    </div>
  );
}
