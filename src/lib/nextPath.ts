/**
 * Para onde ir depois de entrar: o menu principal, ou a tela que a pessoa
 * tentou abrir antes do login (ex.: "Mesas" no menu). Guardado na sessão
 * porque o login com Google sai do site e volta pelo /auth/callback.
 */
const KEY = 'fv-next';

/** Só caminhos internos ("/mesas"), nunca outro site. */
function safe(path: string | null | undefined): string | null {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
}

export function rememberNext(path: string): void {
  try {
    const p = safe(path);
    if (p) sessionStorage.setItem(KEY, p);
  } catch {
    /* sessão indisponível: cai no menu */
  }
}

/** Lê e apaga o destino guardado (padrão: menu principal). */
export function consumeNext(): string {
  try {
    const p = safe(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    return p ?? '/';
  } catch {
    return '/';
  }
}
