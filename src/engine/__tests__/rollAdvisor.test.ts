import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { adviseRoll, normalizeText } from '../rollAdvisor';
import type { Character } from '@/types/character';

function makeChar(classId = 'rogue'): Character {
  const draft = createDraftCharacter({ ownerId: 'test', name: 'Teste', classId, raceId: 'human' });
  return finalizeCharacter(draft);
}

function top(text: string, char = makeChar()) {
  return adviseRoll(text, char, deriveCharacter(char));
}

describe('O que eu rolo? (rollAdvisor)', () => {
  it('normaliza acentos e pontuação', () => {
    expect(normalizeText('  Ele está MENTINDO?! ')).toBe('ele esta mentindo');
  });

  it.each([
    ['quero escalar o muro', 'skill:athletics'],
    ['ele está mentindo?', 'skill:insight'],
    ['me esconder nas sombras', 'skill:stealth'],
    ['lembrar desse brasão', 'skill:history'],
    ['resistir ao veneno', 'save:con'],
    ['andar na corda bamba', 'skill:acrobatics'],
    ['convencer o guarda a deixar a gente passar', 'skill:persuasion'],
    ['o combate começou', 'initiative'],
    ['identificar o animal', 'skill:nature'],
    ['seguir o rastro do lobo', 'skill:survival'],
    ['bater carteira do nobre', 'skill:sleightOfHand'],
  ])('"%s" → %s', (text, expected) => {
    expect(top(text)[0]?.id).toBe(expected);
  });

  it('não confunde palavras parecidas (prefixo só no início da palavra)', () => {
    // "ver" não pode casar dentro de "convencer"
    expect(top('convencer o rei').map((s) => s.id)).not.toContain('skill:perception');
    // "plano" (de ação) não é Arcanismo
    expect(top('qual é o plano')).toEqual([]);
  });

  it('ferramenta só aparece se o personagem for proficiente', () => {
    const rogue = makeChar('rogue');
    rogue.toolProfs = [{ id: 'thieves-tools', label: 'Ferramentas de Ladrão' }];
    expect(top('abrir a fechadura', rogue)[0]?.id).toBe('tool:thieves-tools');

    const fighter = makeChar('fighter');
    fighter.toolProfs = [];
    expect(top('abrir a fechadura', fighter).map((s) => s.id)).not.toContain('tool:thieves-tools');
  });

  it('bônus e composição batem com a ficha derivada', () => {
    const char = makeChar('rogue');
    const derived = deriveCharacter(char);
    const [s] = adviseRoll('me esconder', char, derived);
    const stealth = derived.skills.find((k) => k.key === 'stealth')!;
    expect(s.bonus).toBe(stealth.bonus);
    expect(s.math).toMatch(/^DES [+-]\d/);
  });

  it('texto vazio ou sem gatilho não sugere nada', () => {
    expect(top('')).toEqual([]);
    expect(top('xyz')).toEqual([]);
  });

  it('limita a quantidade de sugestões', () => {
    const char = makeChar();
    expect(adviseRoll('escalar o muro e me esconder e ouvir barulho', char, deriveCharacter(char), 2)).toHaveLength(2);
  });
});
