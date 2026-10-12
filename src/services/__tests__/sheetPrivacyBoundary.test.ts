import { describe, it, expect } from 'vitest';
import { toRow } from '../characterSheetService';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';

describe('serialização compartilhável', () => {
  it('redige todos os campos privados e preserva o personagem original', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 'teste', name: 'Controle' }));
    c.notes = 'NOTA PRIVADA';
    c.journal = [{ id: 'j', body: 'CRÔNICA PRIVADA' } as never];
    c.diary = { notes: [{ id: 'n', text: 'SEGREDO PRIVADO', at: 1 }], quests: [], clues: [], people: {} };
    const row = toRow(c, 'teste');
    expect(JSON.stringify(row.snapshot)).not.toContain('PRIVAD');
    expect(row.snapshot.name).toBe('Controle');
    expect(row.snapshot.hpCurrent).toBe(c.hpCurrent);
    expect(c.notes).toBe('NOTA PRIVADA');
    expect(c.diary.notes).toHaveLength(1);
  });
});
