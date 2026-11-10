/**
 * Ponte para o D&D Beyond (Vercel, edge): o navegador não lê o JSON público
 * do personagem direto (CORS), então esta função busca e devolve. Só aceita
 * o id numérico, só fala com o servidor de personagens do D&D Beyond, limita
 * tempo e tamanho e não guarda nada. Integração não oficial.
 */
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://character-service.dndbeyond.com/character/v5/character/';
const MAX_BYTES = 3_000_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** A lógica, com o `fetch` trocável nos testes. */
export async function ddbProxy(req: Request, upstream: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'GET') return json(405, { error: 'method' });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^\d{3,12}$/.test(id)) return json(400, { error: 'id' });
  let res: Response;
  try {
    res = await upstream(UPSTREAM + id, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  } catch {
    return json(504, { error: 'timeout' });
  }
  // personagem privado ou apagado: o D&D Beyond responde 401/403/404
  if (res.status === 401 || res.status === 403) return json(403, { error: 'private' });
  if (res.status === 404) return json(404, { error: 'missing' });
  if (!res.ok) return json(502, { error: 'upstream' });
  const text = await res.text();
  if (text.length > MAX_BYTES) return json(413, { error: 'too-big' });
  let body: { success?: boolean; data?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json(502, { error: 'upstream' });
  }
  if (!body?.success || !body.data) return json(403, { error: 'private' });
  return json(200, { data: body.data });
}

// a Vercel chama com (request, context): o segundo argumento não é o fetch
export default function handler(req: Request): Promise<Response> {
  return ddbProxy(req);
}
