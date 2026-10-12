import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { ActiveEffects } from '@/components/sheet/ActiveEffects';
import { WhoAmI } from '@/components/diary/WhoAmI';
import { HeroPortrait } from '@/components/character/HeroPortrait';
import { heroAvatar } from '@/lib/summary';

describe('estrutura dos novos componentes', () => {
  it('separa efeitos e expõe origem, benefício, duração e término no texto', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 'test', name: 'Kael' }));
    c.combat.marks = ['dodge', 'hex'];
    c.combat.spellEffects = [
      { spellId: 'shield', name: 'Escudo', label: '+5 CA', appliedBy: 'Kael', duration: '1 rodada', until: 'turn' },
      { spellId: 'manual:1', name: 'Bênção do mestre', label: '+1 CA', appliedBy: 'Mestre Rui', until: 'rest', kind: 'manual' },
    ];
    const html = renderToStaticMarkup(createElement(ActiveEffects, { char: c }));
    for (const text of ['Concentração', 'Duração', 'Marcas de classe', 'Ajustes do mestre', 'Mestre Rui', '+5 CA', '1 rodada', 'Encerra:']) expect(html).toContain(text);
    expect(html).not.toContain('undefined');
  });
  it('cartão pessoal tem acesso por botão e objetivo visível na sessão', () => {
    const c = createDraftCharacter({ ownerId: 'test' });
    c.diary = { notes: [], quests: [], clues: [], people: {}, identity: { goal: 'Salvar a vila', bond: '', fear: '', trait: '', phrase: '' } };
    const html = renderToStaticMarkup(createElement(WhoAmI, { char: c }));
    expect(html).toContain('Quem sou eu?'); expect(html).toContain('Salvar a vila');
  });
  it('gêneros usam fontes diferentes e o retrato prioritário informa carregamento', () => {
    const c = createDraftCharacter({ ownerId: 'test', classId: 'wizard', gender: 'masc' });
    const male = heroAvatar(c); c.gender = 'fem';
    expect(heroAvatar(c)).not.toBe(male);
    const html = renderToStaticMarkup(createElement(HeroPortrait, { char: c }));
    expect(html).toContain('Carregando retrato'); expect(html).toContain('loading="eager"'); expect(html).toContain('fetchpriority="high"');
  });
});
