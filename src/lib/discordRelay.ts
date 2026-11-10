import { isDiscordWebhook, rollMessage, type DiscordRoll } from '@/engine/discord';

/**
 * Envio para o Discord, em fila: o webhook aceita ~5 mensagens a cada 2 s,
 * então sai uma por vez com folga e, se o Discord pedir calma (429), espera
 * o que ele mandar. Sem internet não acumula: descarta.
 */
const GAP_MS = 450;
const MAX_QUEUE = 20;

type Job = { url: string; body: Record<string, unknown>; resolve: (ok: boolean) => void };
const queue: Job[] = [];
let running = false;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, body: Record<string, unknown>, retry = true): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 429 && retry) {
      const info = (await res.json().catch(() => ({}))) as { retry_after?: number };
      await wait(Math.min(10, Math.max(0.5, Number(info.retry_after) || 1)) * 1000);
      return post(url, body, false);
    }
    return res.ok;
  } catch {
    return false;
  }
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift()!;
    job.resolve(await post(job.url, job.body));
    if (queue.length) await wait(GAP_MS);
  }
  running = false;
}

/** Põe uma mensagem na fila. Resolve `false` se não saiu (offline, webhook inválido ou apagado). */
export function sendToDiscord(url: string, body: Record<string, unknown>): Promise<boolean> {
  if (!isDiscordWebhook(url)) return Promise.resolve(false);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(false);
  if (queue.length >= MAX_QUEUE) queue.shift()?.resolve(false);
  return new Promise((resolve) => {
    queue.push({ url: url.trim(), body, resolve });
    void drain();
  });
}

export const sendRoll = (url: string, roll: DiscordRoll) => sendToDiscord(url, rollMessage(roll));

/** "Testar envio" das configurações. */
export const sendTest = (url: string, who: string) =>
  sendToDiscord(url, rollMessage({ who, label: 'Teste da Ficha Viva', total: 20, expr: '1d20', rolls: [20], d20: true, crit: true }));

/**
 * Webhook da mesa: só o navegador do MESTRE o conhece (lido do banco com RLS).
 * Fica em memória, nunca no aparelho dos jogadores nem na ficha.
 */
const tableHooks = new Map<string, string>();
export function setTableWebhook(campaignId: string, url: string | null): void {
  if (url && isDiscordWebhook(url)) tableHooks.set(campaignId, url.trim());
  else tableHooks.delete(campaignId);
}
export const tableWebhook = (campaignId: string | null) => (campaignId ? tableHooks.get(campaignId) ?? null : null);
