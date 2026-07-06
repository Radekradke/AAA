/**
 * Links de apoio ao projeto (doação).
 * ────────────────────────────────────────────────────────────────────
 * TROQUE os valores abaixo pelos SEUS perfis. Deixe uma string vazia ('')
 * para esconder aquele botão. Nada mais precisa ser mexido.
 */
export const SUPPORT = {
  /** Apoio recorrente (mensal). Ex.: 'https://apoia.se/SEU-USUARIO' */
  apoiase: 'https://apoia.se/SEU-USUARIO',
  /** GitHub Sponsors. Ex.: 'https://github.com/sponsors/SEU-USUARIO' */
  githubSponsors: 'https://github.com/sponsors/SEU-USUARIO',
};

/** Um link está configurado quando não é o placeholder nem vazio. */
export function isConfigured(url: string): boolean {
  return !!url && !/SEU-USUARIO/.test(url);
}

/** Há pelo menos um canal de apoio válido? */
export function hasSupport(): boolean {
  return isConfigured(SUPPORT.apoiase) || isConfigured(SUPPORT.githubSponsors);
}
