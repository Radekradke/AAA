import type { Character } from '@/types/character';
import { useTheme } from '@/lib/useTheme';
import { raceLine } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { heroAvatar } from '@/lib/summary';

interface CreatorHeroProps {
  char: Character;
  onGender: (g: 'masc' | 'fem') => void;
}

/** Herói iluminado: arte em destaque, cone de luz volumétrica e seletor de gênero. */
export function CreatorHero({ char, onGender }: CreatorHeroProps) {
  const t = useTheme();
  const cls = getClass(char.classId);

  const genderBtn = (g: 'masc' | 'fem'): React.CSSProperties => ({
    cursor: 'pointer',
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '.03em',
    padding: '7px 15px',
    borderRadius: 999,
    border: '1px solid ' + (char.gender === g ? t.gold : 'transparent'),
    color: char.gender === g ? t.gold : t.muted,
    background: char.gender === g ? 'rgba(255,224,138,.12)' : 'transparent',
    boxShadow: char.gender === g ? '0 0 16px var(--bloom)' : 'none',
    transition: '.25s',
  });

  return (
    <div
      className="fv-hero"
      style={{
        flex: '1 1 250px',
        minWidth: 220,
        maxWidth: 360,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        alignSelf: 'stretch',
      }}
    >
      {/* cone de luz volumétrica */}
      <div
        className="animate-coneSway"
        style={{
          position: 'absolute',
          top: '-4%',
          left: '50%',
          width: '120%',
          height: '118%',
          background:
            'conic-gradient(from 180deg at 50% 0%, transparent 38%, var(--bloom) 50%, transparent 62%)',
          filter: 'blur(4px)',
          opacity: 0.7,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: 'min(clamp(190px,26vw,310px),46vh)',
          height: 'min(clamp(190px,26vw,310px),46vh)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-3%',
            borderRadius: 999,
            border: '1px solid var(--gold)',
            opacity: 0.4,
            boxShadow: '0 0 60px var(--bloom)',
          }}
        />
        <div
          className="animate-ringSpinFast"
          style={{ position: 'absolute', inset: '2%', borderRadius: 999, border: '1px dashed var(--line)' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-8%',
            backgroundImage: `url("${heroAvatar(char)}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'drop-shadow(0 0 24px var(--bloom))',
          }}
        />
      </div>

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            fontSize: 'clamp(20px,2.4vw,26px)',
            color: 'var(--ink)',
          }}
        >
          {char.name.trim() || 'Herói Sem Nome'}
        </div>
        <div style={{ marginTop: 5, fontSize: 13.5, letterSpacing: '.06em', color: 'var(--acc)' }}>
          {raceLine(char)} · {cls.label}
        </div>
        <div
          style={{
            marginTop: 13,
            display: 'inline-flex',
            gap: 5,
            background: 'rgba(0,0,0,.28)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            padding: 4,
          }}
        >
          <button onClick={() => onGender('masc')} style={genderBtn('masc')}>
            Masculino
          </button>
          <button onClick={() => onGender('fem')} style={genderBtn('fem')}>
            Feminino
          </button>
        </div>
      </div>
    </div>
  );
}
