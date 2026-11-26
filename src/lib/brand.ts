/** Ficha reduzida: leitura do símbolo na aba, em uma única cor do tema. */
export const BRAND_COMPACT_PATH = 'M7 4h18q4 0 4 5v2H12v14h11v4H8L5 11Q1 11 1 7q0-3 3-3h3Zm-3 2q-1 0-1 1 0 2 2 2h3V7q0-1-1-1H4Zm14 7 1.3 3.7L23 18l-3.7 1.3L18 23l-1.3-3.7L13 18l3.7-1.3Z';
export function brandSvg(color: string): string {
  const safeColor = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#f4d58d';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="${safeColor}" fill-rule="evenodd" d="${BRAND_COMPACT_PATH}"/></svg>`;
}
