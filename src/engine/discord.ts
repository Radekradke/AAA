/**
 * Discord: a rolagem vira uma mensagem (embed) num canal, por webhook. Puro,
 * sem rede — o envio fica em `src/lib/discordRelay.ts`.
 */

/** Webhook do Discord (o mesmo formato que o banco aceita em supabase/discord.sql). */
const WEBHOOK = /^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export function isDiscordWebhook(url: string | null | undefined): url is string {
  return !!url && url.length <= 300 && WEBHOOK.test(url.trim());
}

/** O que a rolagem leva (o mesmo payload do evento 'roll' da mesa ao vivo). */
export interface DiscordRoll {
  who: string;
  label: string;
  total: number;
  expr?: string;
  rolls?: number[];
  crit?: boolean;
  fail?: boolean;
  damage?: boolean;
  d20?: boolean;
}

const COLOR = { crit: 0xe0b14a, fail: 0xc2483a, damage: 0xff6a3d, normal: 0x7c6cf0 };

/** Texto do jogador no Discord: sem markdown, sem @menção e com tamanho limitado. */
export function discordText(s: string, max: number): string {
  const clean = String(s ?? '')
    .replace(/[\\`*_~|>]/g, (c) => `\\${c}`)
    .replace(/@/g, '@​')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Corpo do POST no webhook: um embed com quem rolou, o quê, os dados e o total. */
export function rollMessage(r: DiscordRoll): Record<string, unknown> {
  const dice = r.rolls?.length ? `[${r.rolls.slice(0, 20).join(', ')}${r.rolls.length > 20 ? ', …' : ''}]` : '';
  const tag = r.d20 && r.crit ? ' · 20 natural!' : r.d20 && r.fail ? ' · 1 natural' : '';
  return {
    username: 'Ficha Viva',
    // ninguém é marcado, nem com @everyone escrito no nome da rolagem
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: discordText(`${r.who} · ${r.label}`, 240),
        description: `**${Math.round(r.total)}**${tag}${r.expr ? `\n${discordText(r.expr, 60)} ${dice}` : dice ? `\n${dice}` : ''}`,
        color: r.d20 && r.crit ? COLOR.crit : r.d20 && r.fail ? COLOR.fail : r.damage ? COLOR.damage : COLOR.normal,
        footer: { text: 'Ficha Viva' },
      },
    ],
  };
}

/** Só rolagem pública vai para o canal (privada e "só mestre" nunca). */
export function relayable(e: { type: string; visibility: string }): boolean {
  return e.type === 'roll' && e.visibility === 'public';
}
