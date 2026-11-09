import { describe, expect, it } from 'vitest';
import { discordText, isDiscordWebhook, relayable, rollMessage } from '../discord';

describe('Discord', () => {
  it('só aceita webhook do Discord em https', () => {
    expect(isDiscordWebhook('https://discord.com/api/webhooks/123/abc_DEF-9')).toBe(true);
    expect(isDiscordWebhook('https://ptb.discord.com/api/webhooks/123/abc')).toBe(true);
    expect(isDiscordWebhook('http://discord.com/api/webhooks/123/abc')).toBe(false);
    expect(isDiscordWebhook('https://evil.example/api/webhooks/123/abc')).toBe(false);
    expect(isDiscordWebhook('https://discord.com.evil.example/api/webhooks/123/abc')).toBe(false);
    expect(isDiscordWebhook('')).toBe(false);
  });

  it('só rolagem pública vai para o canal', () => {
    expect(relayable({ type: 'roll', visibility: 'public' })).toBe(true);
    expect(relayable({ type: 'roll', visibility: 'master' })).toBe(false);
    expect(relayable({ type: 'roll', visibility: 'private' })).toBe(false);
    expect(relayable({ type: 'damage', visibility: 'public' })).toBe(false);
  });

  it('a mensagem traz herói, rolagem, dados e total; 20 natural em destaque', () => {
    const m = rollMessage({ who: 'Kael', label: 'Ataque · Espada Longa', total: 25, expr: '1d20+5', rolls: [20], d20: true, crit: true });
    const e = (m.embeds as { title: string; description: string; color: number }[])[0];
    expect(e.title).toBe('Kael · Ataque · Espada Longa');
    expect(e.description).toContain('**25**');
    expect(e.description).toContain('20 natural');
    expect(e.description).toContain('[20]');
    expect(m.allowed_mentions).toEqual({ parse: [] });
  });

  it('texto do jogador não marca ninguém nem quebra o markdown', () => {
    expect(discordText('@everyone *oi*', 50)).toBe('@​everyone \\*oi\\*');
    expect(discordText('a'.repeat(300), 10)).toHaveLength(10);
  });
});
