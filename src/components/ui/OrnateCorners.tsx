/** Cantos ornamentais dourados sobrepostos a um painel (decorativo). */
export function OrnateCorners({ size = 16, inset = 8, color = 'var(--gold)', opacity = 0.6 }: { size?: number; inset?: number; color?: string; opacity?: number }) {
  const corners = [
    { top: inset, left: inset, bt: true, bl: true },
    { top: inset, right: inset, bt: true, br: true },
    { bottom: inset, left: inset, bb: true, bl: true },
    { bottom: inset, right: inset, bb: true, br: true },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: size,
            height: size,
            pointerEvents: 'none',
            opacity,
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            borderTop: c.bt ? `1.5px solid ${color}` : undefined,
            borderBottom: c.bb ? `1.5px solid ${color}` : undefined,
            borderLeft: c.bl ? `1.5px solid ${color}` : undefined,
            borderRight: c.br ? `1.5px solid ${color}` : undefined,
            boxShadow: `0 0 8px var(--bloom)`,
          }}
        />
      ))}
    </>
  );
}
