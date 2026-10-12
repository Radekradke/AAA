import { describe, expect, it, vi } from 'vitest';
import { applyCreationConcept, CREATION_CONCEPTS, firstActions } from '../creationConcepts';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { creationPending } from '../creationSummary';
import { creationSpellPlan } from '../creationSpells';
import { deriveCharacter } from '../dndRules';
import { applyRest, previewRest } from '../rest';
import { saveSlotPools, syncSlotPools } from '../spellcasting';
import { previewEquip } from '../equipPreview';
import { getItem } from '@/data/items';
import { getSpell } from '@/data/spells';
import { itemToInventory, moveItemTo, placeInOffHand, toggleItemAttunement } from '../inventory';
import { effectState, effectUndoGuard, undoEffectRemoval } from '../effectUndo';
import { diaryOf, sectionHits } from '../diary';
import { diaryPartOf, isEmptyDiaryPart, withDiary, withoutDiary } from '@/services/diaryCloud';
import type { Character } from '@/types/character';
import { characterImportError } from '../characterImport';

function hero(classId = 'fighter') {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'test', name: 'Teste', classId }));
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  return c;
}
function give(c: Character, id: string) { const i = itemToInventory(getItem(id)!); c.inventory.push(i); return i; }

describe('criação guiada por conceito', () => {
  for (const concept of CREATION_CONCEPTS) it(`${concept.id}: chega válido à revisão, sem dispensar as regras`, () => {
    const c = createDraftCharacter({ ownerId: 'test', name: 'Teste', gender: 'fem' });
    const id = c.id;
    applyCreationConcept(c, concept.id);
    expect(c.id).toBe(id);
    expect(c.gender).toBe('fem');
    expect(c.classId).toBe(concept.classId);
    expect(creationPending(c)).toEqual([]);
    expect(firstActions(c.classId)).toHaveLength(2);
    expect(deriveCharacter(finalizeCharacter(c)).maxHp).toBeGreaterThan(0);
  });
  it('mantém o nome como decisão obrigatória', () => {
    const c = createDraftCharacter({ ownerId: 'test' });
    applyCreationConcept(c, 'guardian');
    expect(creationPending(c).map((p) => p.label)).toEqual(['Dê um nome ao herói']);
    expect(deriveCharacter(c).ac).toBeGreaterThanOrEqual(18);
  });
  it('mago começa com truque ofensivo sugerido', () => {
    const c = createDraftCharacter({ ownerId: 'test' });
    applyCreationConcept(c, 'mage');
    expect(creationSpellPlan(c)!.cantrips.chosen.map(getSpell).some((s) => s?.level === 0 && s.damage)).toBe(true);
  });
  it('conceito desconhecido não altera o rascunho', () => {
    const c = createDraftCharacter({ ownerId: 'test' }); const before = structuredClone(c);
    applyCreationConcept(c, 'unknown'); expect(c).toEqual(before);
  });
});

describe('prévia de descanso', () => {
  it('curto recupera pacto e preserva espaços comuns, sem curar PV', () => {
    const c = hero('wizard'); c.classLevels = [{ classId: 'wizard', level: 3 }, { classId: 'warlock', level: 2 }]; c.level = 5;
    const pools = syncSlotPools(c, true); pools.spellcasting[1].used = 1; pools.pact[1].used = 1; saveSlotPools(c, pools);
    c.hpCurrent = 1; const before = structuredClone(c); const p = previewRest(c, 'short');
    expect(c).toEqual(before);
    expect(p.changes.some((x) => x.label.includes('pacto'))).toBe(true);
    expect(p.changes.some((x) => x.label.includes('comuns') || x.label === 'PV')).toBe(false);
    applyRest(c, 'short'); expect(syncSlotPools(c).spellcasting[1].used).toBe(1); expect(syncSlotPools(c).pact[1].used).toBe(0);
  });
  it('longo calcula PV depois de encerrar Auxílio e mostra exaustão', () => {
    const c = hero(); c.hpCurrent = 1; c.combat.exhaustion = 2; c.combat.conditions = ['Envenenado'];
    c.combat.spellEffects = [{ spellId: 'aid', name: 'Auxílio', until: 'rest', label: '+5 PV', maxHp: 5 }];
    const p = previewRest(c, 'long'); expect(p.removed).toEqual(expect.arrayContaining(['Auxílio', 'Envenenado']));
    applyRest(c, 'long'); expect(Number(p.changes.find((x) => x.label === 'PV')!.after)).toBe(c.hpCurrent); expect(c.combat.exhaustion).toBe(1);
  });
  it('cargas não rolam nem são gastas durante a prévia', () => {
    const c = hero(); const i = give(c, 'm-ring-prot'); i.charges = { max: 7, regain: '1d6+1' }; c.combat.itemCharges = { [i.uid]: 5 };
    const random = vi.spyOn(Math, 'random'); const p = previewRest(c, 'long'); expect(p.charges.join(' ')).toContain('1d6+1'); expect(random).not.toHaveBeenCalled(); expect(c.combat.itemCharges[i.uid]).toBe(5); random.mockRestore();
  });
  it('explica que descanso longo não revive a 0 PV', () => { const c = hero(); c.hpCurrent = 0; expect(previewRest(c, 'long').blocked).toBe(true); });
});

describe('comparação de equipamento', () => {
  it('segunda mão calcula a perda do escudo sem alterar a ficha', () => {
    const c = hero(); const sword = give(c, 'w-shortsword'); const shield = give(c, 's-shield'); const dagger = give(c, 'w-dagger');
    moveItemTo(c, sword.uid, 'equipado'); moveItemTo(c, shield.uid, 'equipado'); const before = structuredClone(c);
    const p = previewEquip(c, dagger.uid, deriveCharacter(c), 'offHand')!; expect(c).toEqual(before);
    expect(p.removed).toContain(shield.name);
    const result = placeInOffHand(c, dagger); if (result.ok) c.equipped = result.equipped;
    expect(Number(p.facts!.find((f) => f.label === 'CA')!.to)).toBe(deriveCharacter(c).ac);
  });
  it('informa ausência de proficiência e bloqueio de conjuração por armadura', () => {
    const c = hero('wizard'); const armor = give(c, 'a-chainmail'); const p = previewEquip(c, armor.uid)!;
    expect(p.warnings.join(' ')).toContain('não pode conjurar'); expect(p.facts!.find((f) => f.label === 'Proficiência no item')!.to).toBe('Não');
  });
  it('explica perda de habilidades do Monge', () => { const c = hero('monk'); const shield = give(c, 's-shield'); expect(previewEquip(c, shield.uid)!.warnings.join(' ')).toContain('Artes Marciais'); });
  it('mostra sintonia pendente sem ativar bônus mágico', () => { const c = hero(); const ring = give(c, 'm-ring-prot'); const p = previewEquip(c, ring.uid)!; expect(p.warnings.join(' ')).toContain('sintonia'); expect(ring.attuned).toBe(false); });
  it('sintonia que veste um anel usa a mesma regra da prévia', () => {
    const c = hero(); const ring = give(c, 'm-ring-prot'); const before = structuredClone(c);
    const p = previewEquip(c, ring.uid, deriveCharacter(c), 'attune')!; expect(c).toEqual(before);
    toggleItemAttunement(c, ring.uid);
    expect(Number(p.facts!.find((f) => f.label === 'CA')!.to)).toBe(deriveCharacter(c).ac);
    expect(p.facts!.find((f) => f.label === 'Sintonia')!.to).toContain('1/3 · sintonizado');
  });
  it('escudo sem proficiência também impede conjurar', () => { const c = hero('wizard'); const shield = give(c, 's-shield'); expect(previewEquip(c, shield.uid)!.warnings.join(' ')).toContain('não pode conjurar'); });
});

describe('desfazer efeito sem apagar ações posteriores', () => {
  const beforeRemoval = () => { const c = hero(); c.combat.spellEffects = [{ spellId: 'shield', name: 'Escudo', label: '+5 CA', ac: 5, until: 'turn' }]; const before = effectState(c); c.combat.spellEffects = []; return { c, before, guard: effectUndoGuard(c) }; };
  it('restaura o efeito quando o estado de combate permanece compatível', () => { const { c, before, guard } = beforeRemoval(); c.notes = 'nova anotação'; expect(undoEffectRemoval(c, before, guard)).toBe(true); expect(c.combat.spellEffects).toHaveLength(1); expect(c.notes).toBe('nova anotação'); });
  it('recusa depois de sofrer dano', () => { const { c, before, guard } = beforeRemoval(); c.hpCurrent -= 1; expect(undoEffectRemoval(c, before, guard)).toBe(false); expect(c.combat.spellEffects).toEqual([]); });
  it('recusa depois de gastar recurso ou avançar turno', () => { const { c, before, guard } = beforeRemoval(); c.combat.turn.action = true; expect(undoEffectRemoval(c, before, guard)).toBe(false); });
});

describe('cartão e momentos privados', () => {
  it('importação rejeita formatos que quebrariam o cartão ou os momentos', () => {
    const c = hero(); c.diary = { ...diaryOf(c), identity: { goal: '', bond: '', fear: '', trait: '', phrase: '' } };
    expect(characterImportError(c, hero())).toBeNull();
    expect(characterImportError({ ...c, diary: { ...c.diary, identity: { goal: 123 } } }, hero())).toContain('textos');
    expect(characterImportError({ ...c, diary: { ...c.diary, moments: [{ id: 'm', title: 'Cena', text: null, at: 1 }] } }, hero())).toContain('Momento');
  });
  it('não perde um diário contendo apenas o cartão ou um momento', () => {
    const c = hero(); c.diary = { ...diaryOf(c), identity: { goal: 'Salvar a vila', bond: '', fear: 'segredo', trait: '', phrase: '' } };
    expect(isEmptyDiaryPart(diaryPartOf(c))).toBe(false);
    const stripped = withoutDiary(c); expect(JSON.stringify(stripped)).not.toContain('Salvar a vila'); expect(JSON.stringify(stripped)).not.toContain('segredo');
    expect(withDiary(stripped, diaryPartOf(c)).diary?.identity).toEqual(c.diary.identity);
    delete c.diary.identity; c.diary.moments = [{ id: 'm', title: 'Vitória', text: 'Foi por pouco', at: 1 }];
    expect(isEmptyDiaryPart(diaryPartOf(c))).toBe(false); expect(sectionHits(c, 'por pouco').chronicle).toBe(1);
    expect(withoutDiary(c).diary).toBeUndefined();
  });
});
