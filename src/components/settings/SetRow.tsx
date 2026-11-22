import type { ReactNode } from 'react';

/** Uma linha de ajuste: título + explicação à esquerda, controle à direita. */
export function SetRow({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="fv-set-row">
      <div className="fv-set-row-text">
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </div>
      <div className="fv-set-row-ctl">{children}</div>
    </div>
  );
}
