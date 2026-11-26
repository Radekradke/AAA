/** Ícones de traço do mapa (24×24, currentColor). */
const S = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IcoMove = () => <svg {...S}><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></svg>;
export const IcoRuler = () => <svg {...S}><path d="M3 17 17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></svg>;
export const IcoCircle = () => <svg {...S}><circle cx="12" cy="12" r="8" /><path d="M12 12h8" strokeDasharray="2 2" /></svg>;
export const IcoCone = () => <svg {...S}><path d="M4 12 20 4v16z" /></svg>;
export const IcoLine = () => <svg {...S}><path d="M4 18 18 4l2 2L6 20z" /></svg>;
export const IcoSquare = () => <svg {...S}><rect x="4" y="4" width="16" height="16" rx="1" /></svg>;
export const IcoLaser = () => <svg {...S}><path d="M4 20c4-1 4-6 8-7s5-5 8-9" /><circle cx="20" cy="4" r="1.5" fill="currentColor" /></svg>;
export const IcoEye = () => <svg {...S}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IcoEyeOff = () => <svg {...S}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.3 6.3C3.6 8.1 2 12 2 12s4 7 10 7c1.8 0 3.4-.6 4.7-1.4" /></svg>;
export const IcoWall = () => <svg {...S}><path d="M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" /></svg>;
export const IcoDoor = () => <svg {...S}><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18" /><circle cx="15" cy="12" r="1" fill="currentColor" /></svg>;
export const IcoDoorShut = () => <svg {...S}><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M4 21h16M14.5 12.5v.01" /></svg>;
export const IcoDoorOpen = () => <svg {...S}><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3H18v18M4 21h16M6 3.6l6 2.4V21l-6-1.6" /><path d="M10 12.5v.01" /></svg>;
export const IcoLock = () => <svg {...S}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" /></svg>;
export const IcoFlame = () => <svg {...S}><path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.8-5.2 3.4-8.4 1.6 1.3 2.3 2.8 2.4 4.3 1-1 1.6-2.4 1.6-3.9 2.6 1.9 4.6 4.9 4.6 8 0 3.2-2.4 5.6-6 5.6z" /><path d="M12 21c-1.5 0-2.6-1.1-2.6-2.6 0-1.6 1.4-2.4 2.6-4.1 1.2 1.7 2.6 2.5 2.6 4.1 0 1.5-1.1 2.6-2.6 2.6z" /></svg>;
export const IcoTrash = () => <svg {...S}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const IcoExpand = () => <svg {...S}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
export const IcoShrink = () => <svg {...S}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>;
export const IcoPull = () => <svg {...S}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>;
export const IcoPlus = () => <svg {...S}><path d="M12 5v14M5 12h14" /></svg>;
export const IcoMinus = () => <svg {...S}><path d="M5 12h14" /></svg>;
export const IcoGrid = () => <svg {...S}><path d="M4 4h16v16H4zM4 9.33h16M4 14.67h16M9.33 4v16M14.67 4v16" /></svg>;
