import { describe, it, expect } from 'vitest';
import { linkState, mergeOnline, queuedLabel } from '../tableLink';
import type { PresencePlayer } from '@/types/session';

const p = (userId: string, role: 'master' | 'player', name: string, characterName: string | null = null): PresencePlayer => ({ userId, role, name, characterId: null, characterName, onlineAt: '' });

describe('estado da mesa (sessão + palco)', () => {
  it('mostra o pior canal em uso e ignora o parado', () => {
    expect(linkState('idle', 'connected')).toBe('connected');
    expect(linkState('connected', 'reconnecting')).toBe('reconnecting');
    expect(linkState('connecting', 'offline')).toBe('offline');
    expect(linkState('idle', 'idle')).toBe('idle');
  });

  it('junta a presença dos dois canais sem repetir ninguém', () => {
    const session = [p('u1', 'player', 'Ana', 'Kael')];
    const stage = [p('u1', 'player', 'Kael'), p('gm', 'master', 'Mestre'), p('u2', 'player', 'Lyra')];
    const all = mergeOnline(session, stage);
    expect(all.map((x) => x.userId)).toEqual(['gm', 'u1', 'u2']);
    // a da sessão ganha: traz o herói
    expect(all.find((x) => x.userId === 'u1')?.characterName).toBe('Kael');
  });

  it('conta as jogadas na fila', () => {
    expect(queuedLabel(0)).toBe('');
    expect(queuedLabel(1)).toBe(' · 1 jogada na fila');
    expect(queuedLabel(3)).toBe(' · 3 jogadas na fila');
  });
});
