import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundledSpellArt, spellArt, spellRarity } from '../spellArt';
import { SPELLS, SPELL_BY_ID } from '@/data/spells';
import { spellLore } from '../lore';

describe('arte das magias', () => {
  it('sem arquivo, não inventa arte (e a dica segue sem carta)', () => {
    expect(spellArt('sp-magia-que-nao-existe')).toBeNull();
    const semArte = SPELLS.find((s) => !bundledSpellArt()[s.id]);
    if (semArte) expect(spellLore(semArte).art).toBeUndefined();
  });

  it('com arquivo, a dica mostra a carta com a moldura do círculo', () => {
    const id = Object.keys(bundledSpellArt())[0];
    if (!id) return; // ainda sem artes na pasta
    const lore = spellLore(SPELL_BY_ID[id]);
    expect(lore.art?.src).toBe(spellArt(id));
    expect(lore.art?.rarity).toBe(spellRarity(SPELL_BY_ID[id].level));
  });

  it('moldura pelo círculo: truque comum … 9º lendário', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9].map(spellRarity)).toEqual(['comum', 'incomum', 'incomum', 'raro', 'raro', 'muito-raro', 'muito-raro', 'lendario']);
  });

  it('todo arquivo em src/assets/magias tem o nome de uma magia', () => {
    for (const id of Object.keys(bundledSpellArt())) expect(SPELL_BY_ID[id], `${id} não é uma magia`).toBeTruthy();
  });

  it('docs/ARTE-MAGIAS.md lista todas as magias, uma vez cada', () => {
    const doc = readFileSync(resolve(__dirname, '../../../docs/ARTE-MAGIAS.md'), 'utf8');
    // só as linhas da tabela (o texto de introdução também cita um arquivo de exemplo)
    const listed = [...doc.matchAll(/^\|.*?`([a-z0-9-]+)\.webp`/gm)].map((m) => m[1]);
    expect(new Set(listed).size).toBe(listed.length);
    expect(SPELLS.filter((s) => !listed.includes(s.id)).map((s) => s.id)).toEqual([]);
  });
});
