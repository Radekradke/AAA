import { describe, expect, it } from 'vitest';
import { useCharacterStore } from '@/store/characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import { characterFileName } from '../exportCharacter';

describe('exportar a ficha em JSON', () => {
  it('nome do arquivo sem acento nem símbolo', () => {
    expect(characterFileName({ name: 'Lyra Sombraluz' })).toBe('lyra-sombraluz.json');
    expect(characterFileName({ name: 'Ægir, o Coração-de-Pedra!' })).toBe('gir-o-coracao-de-pedra.json');
    expect(characterFileName({ name: '   ' })).toBe('ficha.json');
    expect(characterFileName({ name: '???' })).toBe('ficha.json');
  });

  it('o JSON exportado volta pelo Importar personagem (ida e volta)', () => {
    const hero = { ...finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Kael Venturo', classId: 'fighter' })), level: 4, title: 'heroi-da-estrada', scars: [{ id: 's1', text: 'Corte no rosto', date: '2026-01-01', by: 'mestre' as const }] };
    useCharacterStore.setState({ characters: [hero] });
    const json = JSON.stringify(hero, null, 2); // o mesmo que downloadCharacterJson grava
    const res = useCharacterStore.getState().importCharacter(json, 'outra-conta');
    expect(res.ok).toBe(true);
    const back = useCharacterStore.getState().characters.find((c) => c.id === res.id)!;
    expect(back.id).not.toBe(hero.id); // vira uma ficha nova
    expect(back.ownerId).toBe('outra-conta');
    expect(back.name).toBe('Kael Venturo');
    expect(back.level).toBe(4);
    expect(back.scars?.[0].text).toBe('Corte no rosto');
  });
});
