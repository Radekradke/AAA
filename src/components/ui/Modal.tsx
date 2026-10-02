import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useDialogFocus } from '@/lib/useDialogFocus';

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
 * Acessível: foco entra no diálogo e fica preso nele (Tab), Esc fecha só o
 * de cima, o foco volta para quem abriu, e o título nomeia o diálogo.
 */
export function Modal({ title, icon, onClose, children, footer, maxWidth = 620, bodyStyle }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useDialogFocus(ref, true, onClose);

  return createPortal(
    <div className="fv-modal-overlay" onClick={onClose}>
      <div ref={ref} className="fv-modal fv-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ maxWidth }}>
        <div className="fv-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {icon && <Icon name={icon} size={19} color="var(--gold)" />}
            <h2 id={titleId} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(15px,2.4vw,18px)', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h2>
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
