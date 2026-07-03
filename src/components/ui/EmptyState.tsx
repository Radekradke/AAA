import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  /** Dica de próximo passo — o vazio precisa parecer intencional. */
  hint?: ReactNode;
  /** Ação principal opcional (ex.: botão "+ Adicionar"). */
  action?: ReactNode;
}

/** Estado vazio padrão do app: ícone, título e dica de como preencher. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="fv-empty">
      <Icon name={icon} size={26} color="var(--gold)" style={{ opacity: 0.75 }} />
      <div className="fv-empty-title">{title}</div>
      {hint && <div className="fv-empty-hint">{hint}</div>}
      {action}
    </div>
  );
}
