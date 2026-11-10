import { describe, expect, it } from 'vitest';
import { ddbProxy } from '../../../api/ddb';

const call = (id: string, upstream: typeof fetch, method = 'GET') => ddbProxy(new Request(`https://app.test/api/ddb?id=${id}`, { method }), upstream);
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('ponte do D&D Beyond (api/ddb)', () => {
  it('só aceita id numérico e GET; só fala com o servidor do D&D Beyond', async () => {
    let asked = '';
    const spy = (async (url: string) => { asked = url; return new Response(JSON.stringify({ success: true, data: { name: 'X' } })); }) as unknown as typeof fetch;
    expect((await call('abc', spy)).status).toBe(400);
    expect((await call('12', spy)).status).toBe(400);
    expect((await call('123456', spy, 'POST')).status).toBe(405);
    const ok = await call('123456', spy);
    expect(ok.status).toBe(200);
    expect(asked).toBe('https://character-service.dndbeyond.com/character/v5/character/123456');
    expect(await ok.json()).toEqual({ data: { name: 'X' } });
    expect(ok.headers.get('cache-control')).toBe('no-store');
  });

  it('personagem privado, apagado ou resposta estranha viram erros claros', async () => {
    expect((await call('123456', reply(403, {}))).status).toBe(403);
    expect((await call('123456', reply(200, { success: false, data: null }))).status).toBe(403);
    expect((await call('123456', reply(404, {}))).status).toBe(404);
    expect((await call('123456', reply(500, {}))).status).toBe(502);
    const boom = (async () => { throw new Error('rede'); }) as unknown as typeof fetch;
    expect((await call('123456', boom)).status).toBe(504);
  });
});
