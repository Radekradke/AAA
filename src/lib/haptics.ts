/**
 * Vibração curta no celular para momentos que merecem (crítico, falha
 * crítica). Silenciosa onde não há suporte e para quem pediu menos movimento.
 */
export function haptic(pattern: number | number[]): void {
  try {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* sem vibração */
  }
}
