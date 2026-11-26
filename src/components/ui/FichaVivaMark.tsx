import { useId } from 'react';
import type { SVGProps } from 'react';

/** Emblema aprovado, recolorido pela transparência da arte original. */
export function FichaVivaMark({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  const maskId = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 1280 1280" aria-hidden="true" focusable="false" className={`fv-brand-mark ${className}`} {...props}>
      <defs><mask id={maskId}><image href="/brand/dragao-v2/emblema-preto.png" width="1280" height="1280" /></mask></defs>
      <rect width="1280" height="1280" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
