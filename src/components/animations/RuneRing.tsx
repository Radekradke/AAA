interface RuneRingProps {
  /** Conteúdo central (sigilo, inicial, avatar). */
  children?: React.ReactNode;
  size?: number | string;
  className?: string;
}

/**
 * Sigilo arcano: anéis concêntricos (um pontilhado girando) e um losango
 * dourado brilhante ao centro. Marca visual da Ficha Viva.
 */
export function RuneRing({ children, size = 168, className }: RuneRingProps) {
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className={className} style={{ position: 'relative', width: dim, height: dim }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          border: '1px solid var(--gold)',
          opacity: 0.55,
          boxShadow: '0 0 50px var(--bloom)',
        }}
      />
      <div
        className="animate-ringSpin"
        style={{ position: 'absolute', inset: '14px', borderRadius: 999, border: '1px dashed var(--line)' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '30%',
          border: '1px solid var(--gold)',
          transform: 'rotate(45deg)',
          boxShadow: '0 0 30px var(--bloom)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}
