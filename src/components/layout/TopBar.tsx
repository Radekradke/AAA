import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import type { ReactNode } from 'react';

interface TopBarProps {
  /** Ações extras à direita (ex.: sair, recomeçar). */
  actions?: ReactNode;
}

/** Barra superior fixa: marca + alternador de atmosfera + ações contextuais. */
export function TopBar({ actions }: TopBarProps) {
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const sound = useUiStore((s) => s.sound);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const t = useTheme();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'clamp(14px,2.4vw,24px) clamp(16px,4vw,40px)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, pointerEvents: 'auto' }}>
        <div
          style={{
            width: 30,
            height: 30,
            border: '1px solid var(--gold)',
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            transform: 'rotate(45deg)',
            boxShadow: '0 0 16px var(--bloom)',
          }}
        >
          <span
            style={{
              transform: 'rotate(-45deg)',
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--gold)',
            }}
          >
            F
          </span>
        </div>
        <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: '.26em', fontSize: 12, color: 'var(--muted)' }}>
          FICHA&nbsp;VIVA
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto', alignItems: 'center' }}>
        <button
          onClick={toggleTheme}
          aria-label="Alternar atmosfera"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: '.04em',
            color: 'var(--ink)',
            padding: '9px 15px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--panel)',
            backdropFilter: 'blur(8px)',
            transition: '.25s',
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
              boxShadow: '0 0 10px var(--acc)',
            }}
          />
          {t.label}
        </button>
        <button
          onClick={toggleSound}
          aria-label={sound ? 'Desativar som' : 'Ativar som'}
          title={sound ? 'Som ativado' : 'Som desativado'}
          style={{
            cursor: 'pointer',
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            fontSize: 15,
            borderRadius: 999,
            border: '1px solid ' + (sound ? 'var(--gold)' : 'var(--line)'),
            background: 'var(--panel)',
            backdropFilter: 'blur(8px)',
            color: sound ? 'var(--gold)' : 'var(--muted)',
            transition: '.25s',
          }}
        >
          {sound ? '🔊' : '🔈'}
        </button>
        {actions}
      </div>
    </div>
  );
}
