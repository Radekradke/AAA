/**
 * O que a tela de abertura já pede para cada tema, enquanto o JS baixa
 * (plugin themePreload no vite.config): o arquivo do tema em
 * src/styles/themes/ e a fonte do título da tela inicial (arquivo do
 * @fontsource, o mesmo que fonts.ts importa). Sem imports: o vite.config
 * também lê este arquivo. Os temas são conferidos em themePreload.test.ts.
 */
export const THEME_PRELOAD: Record<string, [css: string, titleFont: string]> = {
  astral: ['astral', 'marcellus-sc-latin-400-normal'],
  frio: ['noite', 'cinzel-latin-600-normal'],
  brasa: ['forja', 'grenze-latin-800-normal'],
  verdejante: ['bosque', 'alegreya-sc-latin-700-normal'],
  carmesim: ['corte', 'cormorant-sc-latin-700-normal'],
  ouro: ['ouro', 'eb-garamond-latin-600-normal'],
  eclipse: ['eclipse', 'antonio-latin-500-normal'],
  rubra: ['rubra', 'outfit-latin-700-normal'],
  orfeu: ['orfeu', 'cormorant-sc-latin-700-normal'],
  artemis: ['artemis', 'cinzel-latin-600-normal'],
};
