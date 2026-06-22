import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { heroSubtitle, heroAvatar } from '@/lib/summary';
import { getRace } from '@/data/races';
import { modStr } from '@/engine/dice';

interface SheetHeaderProps {
  char: Character;
  derived: DerivedCharacter;
}

/** Cabeçalho da ficha: avatar, nome, subtítulo e blocos de defesa. */
export function SheetHeader({ char, derived }: SheetHeaderProps) {
  const race = getRace(char.raceId);

  const defense = [
    { label: 'CA', val: String(derived.ac) },
    { label: 'Iniciativa', val: modStr(derived.initiative) },
    { label: 'Desloc.', val: `${derived.speed.toString().replace('.', ',')}m` },
    { label: 'Perc. Pass.', val: String(derived.passivePerception) },
    { label: 'Profic.', val: modStr(derived.proficiency) },
  ];

  return (
    <div
      className="fv-panel animate-breathe"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(14px,2.5vw,26px)',
        flexWrap: 'wrap',
        borderRadius: 18,
        padding: 'clamp(16px,2.4vw,24px)',
      }}
    >
      <div style={{ position: 'relative', width: 'clamp(64px,9vw,86px)', height: 'clamp(64px,9vw,86px)', flex: 'none', display: 'grid', placeItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            border: '1px solid ' + race.jewel,
            boxShadow: '0 0 30px var(--bloom)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url("${heroAvatar(char)}")`,
              backgroundSize: 'cover',
              backgroundPosition: '50% 22%',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(22px,3vw,32px)', color: 'var(--ink)', lineHeight: 1 }}>
          {char.name}
        </div>
        <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--acc)', letterSpacing: '.04em' }}>{heroSubtitle(char)}</div>
        <div style={{ marginTop: 11, maxWidth: 340 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Chakra Petch', monospace", fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>NÍVEL {char.level}</span>
            <span>{char.alignment}</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'rgba(0,0,0,.35)', overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div
              style={{
                width: `${Math.min(100, (char.level / 20) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, var(--accSoft), var(--acc))',
                boxShadow: '0 0 12px var(--bloom)',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {defense.map((d) => (
          <div key={d.label} style={{ textAlign: 'center', minWidth: 62, padding: '11px 12px', borderRadius: 13, background: 'rgba(0,0,0,.28)', border: '1px solid var(--line)' }}>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>{d.val}</div>
            <div style={{ fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
