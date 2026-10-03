import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GUIDE_EXAMPLE, buildChatGptGuide } from '../chatgptGuide';
import { fromSimpleSheet } from '@/engine/simpleSheet';
import { RACES, getSubraces } from '@/data/races';
import { CLASSES } from '@/data/classes';
import { BACKGROUNDS } from '@/data/backgrounds';
import { subclassesFor } from '@/data/subclasses';

const DOC = resolve(__dirname, '../../../docs/CRIAR-COM-CHATGPT.md');

describe('guia Criar com o ChatGPT', () => {
  const guide = buildChatGptGuide();

  it('o arquivo em docs/ está igual ao gerado (rode npm run docs:chatgpt)', () => {
    if (process.env.UPDATE_GUIDE) writeFileSync(DOC, guide);
    expect(readFileSync(DOC, 'utf8')).toBe(guide);
  });

  it('lista todas as raças, sub-raças, classes, subclasses e antecedentes', () => {
    for (const r of RACES) {
      expect(guide).toContain(r.label);
      for (const s of getSubraces(r.id)) expect(guide).toContain(s.label);
    }
    for (const c of CLASSES) {
      expect(guide).toContain(`### ${c.label}`);
      for (const s of subclassesFor(c.id)) expect(guide).toContain(s.label);
    }
    for (const b of BACKGROUNDS) expect(guide).toContain(`| ${b.label} |`);
  });

  it('o exemplo do guia importa sem nenhum aviso', () => {
    const { char, warnings } = fromSimpleSheet(GUIDE_EXAMPLE, 'u1');
    expect(warnings).toEqual([]);
    expect(char.name).toBe('Lyra Ventobranco');
    expect(char.subclassId).not.toBeNull();
  });
});
