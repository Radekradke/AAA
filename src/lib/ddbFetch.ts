import type { DdbCharacter } from '@/engine/ddbImport';

/** Busca o personagem público pela ponte da Vercel (api/ddb). Mensagens prontas para a tela. */
export async function fetchDdbCharacter(id: string): Promise<{ ok: true; data: DdbCharacter } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(`/api/ddb?id=${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
  } catch {
    return { ok: false, error: 'Sem conexão: a importação do D&D Beyond precisa de internet.' };
  }
  const body = (await res.json().catch(() => null)) as { data?: DdbCharacter; error?: string } | null;
  if (res.ok && body?.data) return { ok: true, data: body.data };
  const err = body?.error;
  if (res.status === 403 || err === 'private')
    return { ok: false, error: 'Esse personagem é privado. No D&D Beyond: abra o personagem → Manage → Character Settings → Privacy → Public, e tente de novo.' };
  if (res.status === 404 && err === 'missing') return { ok: false, error: 'Não achei esse personagem no D&D Beyond. Confira o link.' };
  if (res.status === 404 || !body) return { ok: false, error: 'A importação do D&D Beyond não está disponível neste endereço (só no site publicado).' };
  return { ok: false, error: 'O D&D Beyond não respondeu agora. Tente de novo em instantes.' };
}
