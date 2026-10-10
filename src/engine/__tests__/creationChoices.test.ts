import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { clearClassChoices, clearSubclassChoices, creationChoices, pendingChoices } from '../classChoices';
import { creationPending, giftsAtCreation, STEP_GIFTS, subclassAtCreation, visibleSteps } from '../creationSummary';
import { applySelection, defaultSelection, kitForClass, revalidateKit, selectionFromChar } from '../loadout';
import { deriveCharacter } from '../dndRules';
import { CLASSES } from '@/data/classes';
import { RACES, getSubraces } from '@/data/races';
import { subclassesFor } from '@/data/subclasses';
import { getSpell } from '@/data/spells';
import type { Character } from '@/types/character';

const draft = (classId: string, patch: Partial<Character> = {}): Character => {
  const d = createDraftCharacter({ ownerId: 'u', name: 'Teste', classId, ...(patch.raceId ? { raceId: patch.raceId } : {}) });
  return { ...d, ...patch, classLevels: [{ classId, level: 1 }] };
};
/** Marca a primeira opção de cada escolha do 1º nível (e a subclasse, se for no 1º). */
const fillAll = (c: Character, subclassId?: string): Character => {
  const out = structuredClone(c);
  if (subclassAtCreation(out)) out.subclassId = subclassId ?? subclassesFor(out.classId)[0].id;
  for (let i = 0; i < 3; i++) {
    for (const ch of creationChoices(out)) {
      if (ch.missing) out.choices = { ...(out.choices ?? {}), [ch.spec.storeKey]: [...ch.chosen, ...ch.options.filter((o) => !ch.chosen.includes(o.id)).slice(0, ch.missing).map((o) => o.id)] };
    }
  }
  return out;
};

describe('escolhas do 1º nível feitas na criação', () => {
  it('nenhuma classe, subclasse ou raça chega à ficha com escolha de 1º nível pendente', () => {
    for (const cls of CLASSES) {
      const subs = subclassAtCreation(draft(cls.id)) ? subclassesFor(cls.id).map((s) => s.id) : [undefined];
      for (const sub of subs) {
        for (const race of RACES) {
          for (const subrace of getSubraces(race.id).length ? getSubraces(race.id).map((s) => s.id) : [null]) {
            const c = fillAll(draft(cls.id, { raceId: race.id, subraceId: subrace }), sub);
            const label = `${cls.id}/${sub ?? '-'} ${race.id}/${subrace ?? '-'}`;
            expect(creationPending(c).filter((p) => p.step === STEP_GIFTS).map((p) => p.label), label).toEqual([]);
            const f = finalizeCharacter(c);
            expect(pendingChoices(f).map((p) => p.spec.storeKey), label).toEqual([]);
            expect(!f.subclassId && subclassAtCreation(f), label).toBe(false);
          }
        }
      }
    }
  });

  it('a criação aponta o que falta: subclasse, Estilo de Luta, Inimigo Favorito, ferramenta do Anão', () => {
    expect(creationPending(draft('cleric')).map((p) => p.label)).toContain('Escolha o Domínio Divino (Clérigo)');
    expect(creationPending(draft('warlock')).some((p) => p.label.includes('Patrono Transcendental') && p.step === STEP_GIFTS)).toBe(true);
    expect(creationPending(draft('fighter')).some((p) => p.label === 'Escolha: Estilo de Luta' && p.step === STEP_GIFTS)).toBe(true);
    const ranger = creationPending(draft('ranger')).map((p) => p.label);
    expect(ranger).toEqual(expect.arrayContaining(['Escolha: Inimigo Favorito', 'Escolha: Explorador Nato (terreno)']));
    expect(creationPending(draft('bard')).some((p) => p.label === 'Escolha: Instrumentos musicais (faltam 3)')).toBe(true);
    expect(creationPending(draft('fighter', { raceId: 'dwarf', subraceId: 'hill-dwarf' })).find((p) => p.label.includes('Anão'))?.step).toBe(STEP_GIFTS);
    // Alto Elfo: o truque de mago também é um Dom
    expect(creationPending(draft('fighter', { raceId: 'elf', subraceId: 'high-elf' })).some((p) => p.label === 'Escolha: Truque de mago (Alto Elfo)' && p.step === STEP_GIFTS)).toBe(true);
    // o capítulo Dons só aparece quando há o que decidir
    expect(giftsAtCreation(draft('barbarian', { raceId: 'human', subraceId: null }))).toBe(false);
    expect(visibleSteps(draft('barbarian', { raceId: 'human', subraceId: null }))).not.toContain(STEP_GIFTS);
    expect(visibleSteps(draft('barbarian', { raceId: 'dwarf', subraceId: 'hill-dwarf' }))).toContain(STEP_GIFTS);
    // Feiticeiro Dracônico: Ancestral Dragão aparece só depois de escolher a origem
    const sorc = draft('sorcerer');
    expect(creationChoices(sorc, 'class')).toEqual([]);
    expect(creationChoices({ ...sorc, subclassId: 'draconic' }, 'class').map((c) => c.spec.label)).toEqual(['Ancestral Dragão']);
  });

  it('ferramentas, truque e idiomas escolhidos na criação entram na ficha', () => {
    const bard = finalizeCharacter({ ...draft('bard'), choices: { 'bard.bardInstruments': ['lute', 'flute', 'lyre'] } });
    expect(bard.toolProfs.filter((t) => t.source === 'Bardo').map((t) => t.id)).toEqual(['lute', 'flute', 'lyre']);
    const dwarf = finalizeCharacter({ ...draft('fighter', { raceId: 'dwarf', subraceId: 'hill-dwarf' }), choices: { 'race.dwarfTool': ['masons-tools'], 'fighter.fightingStyle': ['defense'] } });
    expect(dwarf.toolProfs.some((t) => t.id === 'masons-tools' && t.source === 'Anão')).toBe(true);

    // Domínio da Natureza: o truque de druida entra e não se repete na sugestão de truques
    const nature = finalizeCharacter({ ...draft('cleric'), subclassId: 'nature', choices: { 'cleric.natureCantrip': ['sp-orientacao'], 'cleric.natureSkill': ['nature'] } });
    expect(nature.preparedSpells.filter((id) => id === 'sp-orientacao')).toHaveLength(1);
    const cantrips = nature.preparedSpells.filter((id) => getSpell(id)?.level === 0 && id !== 'sp-orientacao');
    expect(cantrips).toHaveLength(3);

    const draconic = deriveCharacter(finalizeCharacter({ ...draft('sorcerer'), subclassId: 'draconic', choices: { 'sorcerer.dragonAncestor': ['red'] } }));
    expect(draconic.languages).toContain('Dracônico');
  });

  it('Patrulheiro aprende o idioma do inimigo favorito só quando ele fala algum', () => {
    const beasts = { ...draft('ranger'), choices: { 'ranger.favoredEnemy': ['beasts'], 'ranger.favoredTerrain': ['forest'] } };
    expect(creationChoices(beasts).some((c) => c.spec.key === 'favoredLanguage')).toBe(false);
    const giants = { ...draft('ranger'), choices: { 'ranger.favoredEnemy': ['giants'], 'ranger.favoredTerrain': ['forest'] } };
    const lang = creationChoices(giants).find((c) => c.spec.key === 'favoredLanguage')!;
    expect(lang.missing).toBe(1);
    const done = finalizeCharacter({ ...giants, choices: { ...giants.choices, 'ranger.favoredLanguage': ['Gigante'] } });
    expect(deriveCharacter(done).languages).toContain('Gigante');
  });

  it('trocar classe ou subclasse limpa as escolhas antigas; domínio sem armadura pesada ajusta o kit', () => {
    const c = draft('cleric', { raceId: 'dwarf', subraceId: 'hill-dwarf' });
    c.subclassId = 'knowledge';
    c.choices = { 'cleric.knowledgeLanguages': ['Élfico', 'Gigante'], 'race.dwarfTool': ['masons-tools'] };
    clearSubclassChoices(c);
    expect(c.choices).toEqual({ 'race.dwarfTool': ['masons-tools'] });
    c.choices = { 'cleric.knowledgeLanguages': ['Élfico'], 'race.dwarfTool': ['masons-tools'] };
    clearClassChoices(c);
    expect(c.choices).toEqual({ 'race.dwarfTool': ['masons-tools'] });

    // sem domínio a cota de malha fica liberada; o Conhecimento não dá armadura pesada
    const k = draft('cleric', { raceId: 'human' });
    applySelection(k, defaultSelection('cleric', k));
    const chain = kitForClass('cleric').choices.find((ch) => ch.id === 'armor')!.options.find((o) => o.requires)!;
    const withChain = { ...selectionFromChar(k), armor: { option: chain.id } };
    applySelection(k, withChain);
    expect(k.inventory.some((i) => i.itemId === 'a-chainmail')).toBe(true);
    k.subclassId = 'knowledge';
    revalidateKit(k);
    expect(k.inventory.some((i) => i.itemId === 'a-chainmail')).toBe(false);
  });
});
