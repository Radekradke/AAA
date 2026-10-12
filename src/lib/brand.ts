/** Mesma geometria da marca inline; usado para colorir o ícone da aba. */
export function brandSvg(color: string): string {
  // A cor vem da paleta interna. Não interpolamos marcação externa no SVG.
  const safeColor = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#f4d58d';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="${safeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25Z"/><path d="m16 2.5-7 7h14Zm0 27v-5" stroke-width="1.2"/><path d="M11 23V12h10M11 17h7" stroke-width="2.4"/></svg>`;
}
