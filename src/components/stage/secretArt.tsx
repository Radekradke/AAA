import '@/styles/secrets.css';
import type { SecretKind } from '@/types/stage';
import { SECRET_COLOR } from '@/store/stageStore';
import { SEAL_METAL, mixHex } from '@/lib/colorMix';

const KINDS: SecretKind[] = ['chest', 'trap', 'door', 'clue', 'item'];

/**
 * Arte dos segredos do mapa: selo de lacre/medalhão com borda recortada,
 * relevo metálico, granulação e o símbolo gravado — nada de círculo chapado.
 * Os gradientes e o filtro de grão ficam num <svg> de definições só (SecretDefs).
 */

/** Símbolos gravados (24×24, traço). */
export const SECRET_GLYPH: Record<SecretKind, string> = {
  // baú: corpo, tampa abaulada, ferragens e fechadura
  chest: 'M4 11h16v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 11V9a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2M8 4.6V11M16 4.6V11M10.5 11v2.6h3V11M12 13.6v1.6',
  // armadilha de mandíbulas: dentes que se fecham e a corrente
  trap: 'M3 15.5h18M4.5 15.5 6 11l1.5 4.5L9 11l1.5 4.5L12 11l1.5 4.5L15 11l1.5 4.5L18 11l1.5 4.5M3.5 15.5c0 2.5 3.8 4 8.5 4s8.5-1.5 8.5-4M12 19.5V22',
  // passagem secreta: arco de pedra, junta das pedras e a fresta entreaberta
  door: 'M5 21V10a7 7 0 0 1 14 0v11M3 21h18M9 21v-8.5a3 3 0 0 1 6 0V21M5.6 7l2.2 1.3M18.4 7l-2.2 1.3M12 3v2.4M15 16.5h.01',
  // pista: lupa sobre uma pegada
  clue: 'M10 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM14.8 14.8 20.5 20.5M8.2 7.6c.9-.5 1.9-.3 2.3.6.4 1-.3 2.6-1.4 3-1 .4-1.8-.3-1.9-1.3M11.6 12.2h.01M9.4 12.9h.01',
  // objeto: gema lapidada
  item: 'M7 4h10l4 5.5L12 21 3 9.5zM3 9.5h18M9.5 4 12 9.5 14.5 4M12 21 8.5 9.5M12 21l3.5-11.5',
};

export function SecretGlyph({ kind, size = 18, className }: { kind: SecretKind; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={SECRET_GLYPH[kind]} />
    </svg>
  );
}

/** Borda recortada do selo (lacre): 14 gomos irregulares. */
const SEAL_EDGE = (() => {
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    // gomos de lacre: alternam e "escorrem" de leve, nenhum igual ao outro
    const wobble = [0.6, -0.4, 0.9, 0.2, -0.7, 0.5, 0.1][i % 7];
    const r = i % 2 ? 27.2 + wobble * 0.6 : 30.2 + wobble;
    pts.push(`${(32 + Math.cos(a) * r).toFixed(2)},${(32 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

/** Selo do segredo, com profundidade (sombra, aro metálico, face com grão, brilho). */
export function SecretSeal({ kind, found }: { kind: SecretKind; found?: boolean }) {
  return (
    <svg className={`fv-seal is-${kind}`} viewBox="0 0 64 64" aria-hidden>
      <ellipse className="fv-seal-shadow" cx="33" cy="36" rx="27" ry="25" />
      <path className="fv-seal-edge" d={SEAL_EDGE} />
      <circle className="fv-seal-rim" cx="32" cy="32" r="22.5" />
      <circle className="fv-seal-face" cx="32" cy="32" r="19.5" fill={`url(#fv-seal-face-${kind})`} />
      <circle className="fv-seal-grain" cx="32" cy="32" r="19.5" />
      <circle className="fv-seal-bevel" cx="32" cy="32" r="18.6" />
      {/* símbolo gravado: sombra escura deslocada + traço claro */}
      <g transform="translate(20.5 20.5) scale(0.958)">
        <path className="fv-seal-engrave-low" d={SECRET_GLYPH[kind]} transform="translate(0.7 0.9)" />
        <path className="fv-seal-engrave" d={SECRET_GLYPH[kind]} />
      </g>
      <ellipse className="fv-seal-gloss" cx="25" cy="21" rx="11" ry="5.5" transform="rotate(-28 25 21)" />
      {found && (
        <g className="fv-seal-found">
          <circle cx="47" cy="47" r="9" />
          <path d="m42.6 47.2 3 3 5.4-6" />
        </g>
      )}
    </svg>
  );
}

/** Gradientes e grão compartilhados pelos selos (um por mapa). */
export function SecretDefs() {
  return (
    <svg className="fv-seal-defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        {KINDS.map((k) => (
          <radialGradient key={k} id={`fv-seal-face-${k}`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={mixHex(SECRET_COLOR[k], SEAL_METAL.white, 0.35)} />
            <stop offset="55%" stopColor={SECRET_COLOR[k]} />
            <stop offset="100%" stopColor={mixHex(SECRET_COLOR[k], SEAL_METAL.black, 0.62)} />
          </radialGradient>
        ))}
        <linearGradient id="fv-seal-rim" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0%" stopColor={SEAL_METAL.hi} />
          <stop offset="48%" stopColor={SEAL_METAL.mid} />
          <stop offset="100%" stopColor={SEAL_METAL.lo} />
        </linearGradient>
        <linearGradient id="fv-seal-edge" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={mixHex(SEAL_METAL.mid, SEAL_METAL.black, 0.15)} />
          <stop offset="100%" stopColor={mixHex(SEAL_METAL.lo, SEAL_METAL.black, 0.3)} />
        </linearGradient>
        <filter id="fv-seal-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.28" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="fv-seal-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
    </svg>
  );
}
