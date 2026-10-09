import { describe, it, expect } from 'vitest';
import { SPELL_BY_ID, SPELLS } from '@/data/spells';
import { spellAutomation } from '../spellAutomation';

const sp = (id: string) => {
  const s = SPELL_BY_ID[id];
  if (!s) throw new Error(`magia ${id} não existe`);
  return s;
};
const kinds = (id: string) => spellAutomation(sp(id)).lines.map((l) => l.kind);

describe('automação das magias: o que a ficha faz × o que fica com a mesa', () => {
  it('Escudo aplica a CA sozinho e sai no próximo turno', () => {
    const a = spellAutomation(sp('sp-escudo'));
    expect(a.level).toBe('full');
    expect(a.lines.some((l) => l.kind === 'auto' && /CA/.test(l.text))).toBe(true);
    expect(a.lines.some((l) => /próximo turno/.test(l.text))).toBe(true);
  });

  it('magia de dano com salvaguarda: a ficha rola, o mestre aplica o resultado', () => {
    const fireball = Object.values(SPELL_BY_ID).find((s) => s.damage && s.save && !s.attack && s.level === 3)!;
    const a = spellAutomation(fireball);
    expect(a.level).toBe('partial');
    expect(kinds(fireball.id)).toContain('roll');
    expect(a.lines.some((l) => l.kind === 'table' && /salvaguarda/.test(l.text))).toBe(true);
  });

  it('Bênção fica marcada, mas avisa que o 1d4 não entra sozinho nas rolagens', () => {
    const a = spellAutomation(sp('sp-bencao'));
    expect(a.level).toBe('partial');
    expect(a.lines.some((l) => l.kind === 'table' && /soma nas rolagens/.test(l.text))).toBe(true);
  });

  it('magia só descritiva é resolvida na mesa', () => {
    const a = spellAutomation(sp('sp-detectar'));
    expect(a.level).toBe('manual');
    expect(a.lines.at(-1)?.kind).toBe('table');
  });

  it('toda magia do catálogo tem um resumo coerente', () => {
    for (const s of SPELLS) {
      const a = spellAutomation(s);
      expect(a.lines.length).toBeGreaterThan(0);
      if (a.level === 'full') expect(a.lines.every((l) => l.kind !== 'table')).toBe(true);
      if (a.level === 'manual') expect(a.lines.some((l) => l.kind === 'roll')).toBe(false);
    }
  });
});
