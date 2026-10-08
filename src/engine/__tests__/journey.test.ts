import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { journeyOf } from '../journey';
import { addDeed } from '../deeds';

describe('linha da jornada', () => {
  it('criação, níveis, feitos, cicatrizes e sessões em ordem; migração fica de fora', () => {
    const base = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Kael', classId: 'fighter' }));
    const t = (s: string) => Date.parse(s);
    const c = {
      ...base,
      createdAt: t('2026-01-01T12:00:00Z'),
      levelHistory: [
        { level: 2, classId: 'fighter', classLevel: 2, hpMethod: 'media' as const, hpValue: 6, features: [], at: 0, synthetic: true },
        { level: 3, classId: 'fighter', classLevel: 3, hpMethod: 'media' as const, hpValue: 6, features: ['Arquétipo Marcial'], subclassId: 'champion', at: t('2026-03-01T12:00:00Z') },
      ],
      deeds: addDeed(undefined, 'kills', 1, new Date('2026-02-01T12:00:00Z')).deeds,
      scars: [{ id: 's1', text: 'Garra no ombro', date: '2026-04-01T12:00:00Z', session: 'Sessão 4', by: 'mestre' as const }],
      sessions: [{ id: 'x', name: 'Sessão 4', at: '2026-03-31T12:00:00Z' }],
    };
    const j = journeyOf(c);
    expect(j.map((e) => e.kind)).toEqual(['inicio', 'feito', 'nivel', 'sessao', 'cicatriz']);
    expect(j[2]).toMatchObject({ title: 'Nível 3' });
    expect(j[2].detail).toContain('Campeão');
    expect(j[4].detail).toContain('pelo mestre');
  });

  it('o começo vem primeiro mesmo com data de criação mais nova (ficha importada)', () => {
    const base = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Kael', classId: 'fighter' }));
    const j = journeyOf({ ...base, createdAt: Date.parse('2026-12-01T00:00:00Z'), deeds: addDeed(undefined, 'kills', 1, new Date('2026-02-01T12:00:00Z')).deeds });
    expect(j.map((e) => e.kind)).toEqual(['inicio', 'feito']);
  });
});
