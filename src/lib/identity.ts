/**
 * Quem é dono de uma ficha. Contas da nuvem (Supabase) têm id UUID; os
 * perfis deste aparelho usam 'guest' (jogar sem conta) ou 'u…' (conta local).
 * Fichas de perfis locais podem mudar de dono (resgate, entrar na nuvem);
 * fichas de uma conta da nuvem nunca — pertencem àquela conta.
 */
export const GUEST_ID = 'guest';

const CLOUD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de uma conta da nuvem (UUID do Supabase)? */
export function isCloudUserId(id: string | null | undefined): boolean {
  return !!id && CLOUD_ID.test(id);
}

/**
 * Conta da nuvem de verdade (pode sincronizar, entrar em mesa, compartilhar).
 * "Não é convidado" não basta: uma conta LOCAL criada antes de a nuvem estar
 * ligada continua logada, e tudo que ela mandasse à nuvem seria recusado.
 * Quem chama ainda confere se a nuvem está configurada (cloudEnabled).
 */
export function isCloudAccount(user: { id: string; guest?: boolean } | null | undefined): boolean {
  return !!user && !user.guest && isCloudUserId(user.id);
}
