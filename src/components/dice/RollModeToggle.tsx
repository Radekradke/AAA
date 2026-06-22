import { useUiStore } from '@/store/uiStore';
import type { RollMode } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

const MODES: { id: RollMode; label: string; symbol: string; color: (t: ReturnType<typeof useTheme>) => string }[] = [
  { id: 'disadvantage', label: 'Desvantagem', symbol: '▼', color: (t) => t.danger },
  { id: 'normal', label: 'Normal', symbol: '●', color: (t) => t.muted },
  { id: 'advantage', label: 'Vantagem', symbol: '▲', color: (t) => t.acc },
];

/** Seletor de vantagem/desvantagem aplicado aos testes de d20 da ficha. */
export function RollModeToggle() {
  const mode = useUiStore((s) => s.rollMode);
  const setRollMode = useUiStore((s) => s.setRollMode);
  const t = useTheme();

  return (
    <div
      title="Modo de rolagem (vantagem/desvantagem)"
      style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--panel)', backdropFilter: 'blur(8px)' }}
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        const c = m.color(t);
        return (
          <button
            key={m.id}
            onClick={() => setRollMode(m.id)}
            aria-label={m.label}
            title={m.label}
            style={{
              cursor: 'pointer',
              width: 30,
              height: 26,
              borderRadius: 999,
              border: '1px solid ' + (active ? c : 'transparent'),
              background: active ? hexA(c, 0.16) : 'transparent',
              color: active ? c : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              transition: '.2s',
            }}
          >
            {m.symbol}
          </button>
        );
      })}
    </div>
  );
}
