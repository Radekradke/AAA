import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface ModalProps {
  title: ReactNode;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  /** Rodapé fixo (botões de ação) — não rola junto com o conteúdo. */
  footer?: ReactNode;
  /** Largura máxima em px (o modal nunca passa da viewport). */
  maxWidth?: number;
  bodyStyle?: CSSProperties;
}

/**
 * Base única de modal do app: nunca vaza da viewport (largura e altura
 * seguras com dvh), cabeçalho com fechar sempre visível, conteúdo com
 * scroll interno e rodapé fixo opcional. Esc e clique no fundo fecham.
 */
export function Modal({ title, icon, onClose, children, footer, maxWidth = 620, bodyStyle }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fv-modal fv-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth }}>
        <div className="fv-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {icon && <Icon name={icon} size={19} color="var(--gold)" />}
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(15px,2.4vw,18px)', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </div>
          <button className="fv-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="fv-modal-body fv-no-scrollbar" style={bodyStyle}>{children}</div>
        {footer && <div className="fv-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
