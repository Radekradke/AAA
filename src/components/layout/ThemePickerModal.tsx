import { Modal } from '@/components/ui/Modal';
import { THEMES, THEME_ORDER } from '@/data/themes';
import { DICE_SKINS } from '@/data/diceSkins';
import { useUiStore } from '@/store/uiStore';

/**
 * Escolher tema: cada clima numa prévia em miniatura (fundo, painel, fonte de
 * título, metal e cor viva) — escolher já aplica, sem precisar confirmar.
 */
export function ThemePickerModal({ onClose }: { onClose: () => void }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  return (
    <Modal title="Escolher tema" icon="image" onClose={onClose} maxWidth={760}>
      <div className="fv-themes" role="radiogroup" aria-label="Tema visual">
        {THEME_ORDER.map((id) => {
          const th = THEMES[id];
          const on = theme === id;
          const flat = th.motif === 'none';
          const die = DICE_SKINS[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              className={'fv-theme-card' + (on ? ' is-on' : '')}
              onClick={() => setTheme(id)}
            >
              {/* prévia: uma "tela" do tema em miniatura */}
              <span
                aria-hidden
                className="fv-theme-preview"
                style={{
                  background: flat ? th.bg : `radial-gradient(120% 90% at 50% 0%, ${th.bg2}, ${th.bg})`,
                  borderRadius: flat ? 2 : 10,
                }}
              >
                <span className="fv-theme-preview-title" style={{ fontFamily: th.font, color: th.gold, letterSpacing: flat ? '.16em' : '.06em', textTransform: flat ? 'uppercase' : 'none' }}>
                  Ficha Viva
                </span>
                <span
                  className="fv-theme-preview-panel"
                  style={{
                    background: flat ? th.panel : `linear-gradient(180deg, ${th.panel}, ${th.panel2})`,
                    borderColor: th.line,
                    borderRadius: flat ? 1 : 8,
                    boxShadow: flat ? 'none' : `0 0 18px ${th.bloom}`,
                  }}
                >
                  <i style={{ background: th.ink, opacity: 0.85 }} />
                  <i style={{ background: th.muted, width: '60%' }} />
                  <span className="fv-theme-preview-row">
                    <b style={{ background: flat ? 'transparent' : `linear-gradient(180deg, ${th.goldB}, ${th.gold})`, borderColor: th.gold, borderRadius: flat ? 1 : 6 }} />
                    <b style={{ background: th.acc, borderColor: th.acc, borderRadius: flat ? 1 : 999, width: 18 }} />
                  </span>
                </span>
              </span>
              <span className="fv-theme-text">
                <b style={{ fontFamily: th.font }}>{th.label}</b>
                <small>{th.tagline}</small>
                <small className="fv-theme-die">
                  {/* a skin do dado deste tema */}
                  {die.body.map((c, i) => (
                    <i key={c} aria-hidden style={{ background: `radial-gradient(circle at 34% 26%, rgba(255,255,255,.45), transparent 50%), ${c}`, color: die.ink[i] }}>
                      20
                    </i>
                  ))}
                  Dados: {die.label}
                </small>
              </span>
              {on && <span className="fv-theme-check" aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
