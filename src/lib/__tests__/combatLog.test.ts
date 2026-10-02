import { describe, expect, it } from 'vitest';
import { buildChronicle, eventText, strikeText } from '../combatLog';
import type { SessionEvent } from '@/types/session';

let t = Date.parse('2026-10-02T20:00:00Z');
const ev = (type: string, payload: Record<string, unknown>, visibility: SessionEvent['visibility'] = 'public'): SessionEvent => ({
  id: String(t), sessionId: 's', type, actorId: 'm', targetId: null, payload, visibility, createdAt: new Date((t += 1000)).toISOString(),
});

describe('texto do ataque', () => {
  it('golpe, rolagem contra a CA, dano e PV', () => {
    expect(strikeText({ by: 'Goblin #1', target: 'Kael', ac: 17, action: 'Cimitarra', roll: 19, hit: true, crit: false, damage: 6, type: 'cortante', hpBefore: 31, hpAfter: 25 }))
      .toBe('Goblin #1 → Kael (CA 17) · Cimitarra 19: acertou — 6 cortante (PV 31→25)');
  });

  it('erro e queda', () => {
    expect(strikeText({ by: 'Ogro', target: 'Ivar', ac: 18, action: 'Clava', roll: 12, hit: false, crit: false, damage: 0 })).toBe('Ogro → Ivar (CA 18) · Clava 12: errou');
    expect(strikeText({ by: 'Ogro', target: 'Bia', hit: true, crit: true, damage: 20, hpBefore: 9, hpAfter: 0 })).toBe('Ogro → Bia: CRÍTICO! — 20 (PV 9→0, caiu)');
  });

  it('eventos antigos (sem contexto) continuam legíveis', () => {
    expect(eventText(ev('attack', { by: 'A', target: 'B', hit: true, crit: false, damage: 3 }))).toBe('A → B: acertou — 3');
  });
});

describe('crônica em Markdown', () => {
  const events = [
    ev('session_started', { name: 'Sessão 4' }),
    ev('roll', { who: 'Bia', label: 'Percepção', total: 14 }),
    ev('combat_started', { name: 'Emboscada' }),
    ev('round_started', { round: 1 }),
    ev('hero_hp', { name: 'Kael', amount: 6, kind: 'damage' }),
    ev('attack', { by: 'Goblin #1', target: 'Kael', hit: true, crit: false, damage: 6, action: 'Cimitarra', roll: 19, ac: 17 }),
    ev('attack', { by: 'Goblin #2', target: 'Kael', hit: false, crit: false, damage: 0, roll: 8, ac: 17 }),
    ev('attack', { by: 'Espião', target: 'Kael', hit: true, crit: true, damage: 9 }, 'master'),
    ev('round_started', { round: 2 }),
    ev('attack', { by: 'Kael', target: 'Goblin #1', hit: true, crit: false, damage: 8, hpBefore: 7, hpAfter: 0 }),
    ev('encounter_finished', { round: 2 }),
  ];

  it('agrupa por encontro e rodada', () => {
    const md = buildChronicle(events, { title: 'Sessão 4' });
    expect(md).toMatch(/^# Sessão 4\n/);
    expect(md).toContain('## ⚔ Emboscada');
    expect(md.indexOf('### Rodada 1')).toBeLessThan(md.indexOf('### Rodada 2'));
    expect(md).toContain('Goblin #1 → Kael (CA 17) · Cimitarra 19: acertou — 6');
    expect(md).toContain('Fim do encontro — 2 rodadas');
  });

  it('placar sem contar duas vezes o dano em herói', () => {
    const md = buildChronicle(events, { title: 'x' });
    expect(md).toContain('| Kael | 8 | 6 | 1/1 | 0 |');
    expect(md).toContain('| Goblin #1 | 6 | 8 | 1/1 | 0 |');
    expect(md).toContain('| Goblin #2 | 0 | 0 | 0/1 | 0 |');
  });

  it('segredos do mestre e rolagens soltas só se pedir', () => {
    const plain = buildChronicle(events, { title: 'x', includeRolls: false });
    expect(plain).not.toContain('Espião');
    expect(plain).not.toContain('Percepção');
    const full = buildChronicle(events, { title: 'x', includeSecret: true, includeRolls: true });
    expect(full).toContain('Espião → Kael: CRÍTICO! — 9 _(só o mestre)_');
    expect(full).toContain('Bia · Percepção: 14');
  });
});
