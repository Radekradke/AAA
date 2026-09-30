import { describe, expect, it } from 'vitest';
import { castTurnKey, rollTempHp, spellOutcome } from '../spellEffects';
import { SPELL_BY_ID } from '@/data/spells';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { ensureCharacterV2 } from '../levelUp';
import type { ActiveSpellEffect, Character } from '@/types/character';

const sp = (id: string) => SPELL_BY_ID[id];
const withEffect = (c: Character, spellId: string, slot: number): Character => {
  const out = spellOutcome(sp(spellId), slot, 3)!;
  const e: ActiveSpellEffect = { spellId, name: sp(spellId).name, ...out.effect! };
  return { ...c, combat: { ...c.combat, spellEffects: [...(c.combat.spellEffects ?? []), e] } };
};
const wizard = () => ensureCharacterV2(finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId: 'wizard', raceId: 'human' })));

describe('PV temporários', () => {
  it('Vitalidade Falsa: 1d4+4, +5 por círculo acima; Agathys 5 por círculo', () => {
    const fl = spellOutcome(sp('phb-false-life'), 1, 3)!;
    expect(fl.target).toBe('self');
    expect(rollTempHp(fl.tempHp!, () => 0)).toBe(5);
    expect(rollTempHp(fl.tempHp!, () => 0.99)).toBe(8);
    expect(rollTempHp(spellOutcome(sp('phb-false-life'), 3, 3)!.tempHp!, () => 0)).toBe(15);
    expect(spellOutcome(sp('phb-armor-agathys'), 2, 3)!.tempHp).toEqual({ flat: 10 });
  });
});

describe('efeitos entram na ficha', () => {
  it('Armadura Arcana: CA 13 + DES sem armadura; Escudo +5', () => {
    const c = wizard();
    const bare = { ...c, equipped: { ...c.equipped, armor: null, shield: null } };
    const d0 = deriveCharacter(bare);
    const dex = d0.abilities.dex.mod;
    expect(deriveCharacter(withEffect(bare, 'sp-armaduraarcana', 1)).ac).toBe(13 + dex);
    expect(deriveCharacter(withEffect(withEffect(bare, 'sp-armaduraarcana', 1), 'sp-escudo', 1)).ac).toBe(18 + dex);
  });
  it('Pele de Árvore: CA mínima 16; Auxílio no 3º: +10 PV máximo; Acelerar dobra deslocamento', () => {
    const c = wizard();
    expect(deriveCharacter(withEffect(c, 'phb-barkskin', 2)).ac).toBeGreaterThanOrEqual(16);
    expect(deriveCharacter(withEffect(c, 'phb-aid', 3)).maxHp).toBe(deriveCharacter(c).maxHp + 10);
    expect(deriveCharacter(withEffect(c, 'sp-hipnose', 3)).speed).toBe(deriveCharacter(c).speed * 2);
  });
});

describe('economia de ação pela conjuração', () => {
  it('lê o tempo de conjuração', () => {
    expect(castTurnKey('1 ação')).toBe('action');
    expect(castTurnKey('1 ação bônus')).toBe('bonus');
    expect(castTurnKey('Reação')).toBe('reaction');
    expect(castTurnKey('1 minuto')).toBeNull();
  });
});
