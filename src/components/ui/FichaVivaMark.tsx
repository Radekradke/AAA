import type { SVGProps } from 'react';

/** Monograma F + dado de RPG. A marca herda a cor do tema via currentColor. */
export function FichaVivaMark({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`fv-brand-mark ${className}`} {...props}>
      <path d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25Z" />
      <path d="m16 2.5-7 7h14Zm0 27v-5" strokeWidth="1.2" />
      <path d="M11 23V12h10M11 17h7" strokeWidth="2.4" />
    </svg>
  );
}
