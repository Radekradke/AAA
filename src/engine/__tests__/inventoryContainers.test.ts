import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { containerOf, isEquipped, itemToInventory, moveItemTo } from '../inventory';
import { previewEquip } from '../equipPreview';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function fighter(): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId: 'fighter', raceId: 'human' }));
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  return c;
}

function add(c: Character, id: string) {
  const it = itemToInventory(getItem(id)!);
  c.inventory.push(it);
  return it;
}

describe('recipientes do inventário', () => {
  it('padrão: tesouro/mágico no Baú, resto na Mochila, equipado em Equipado', () => {
    const c = fighter();
    const sword = add(c, 'w-longsword');
    const ring = add(c, 'm-ring-prot');
    const potion = add(c, 'p-heal');
    expect(containerOf(c, ring)).toBe('bau');
    expect(containerOf(c, potion)).toBe('mochila');
    moveItemTo(c, sword.uid, 'equipado');
    expect(containerOf(c, sword)).toBe('equipado');
  });

  it('arrastar para o Baú desequipa e guarda; de volta à Mochila respeita a escolha', () => {
    const c = fighter();
    const sword = add(c, 'w-longsword');
    moveItemTo(c, sword.uid, 'equipado');
    expect(moveItemTo(c, sword.uid, 'bau')).toEqual({ ok: true });
    expect(isEquipped(c, sword)).toBe(false);
    expect(containerOf(c, sword)).toBe('bau');
    moveItemTo(c, sword.uid, 'mochila');
    expect(containerOf(c, sword)).toBe('mochila');
  });

  it('não equipa o que não tem slot', () => {
    const c = fighter();
    const potion = add(c, 'p-heal');
    const r = moveItemTo(c, potion.uid, 'equipado');
    expect(r.ok).toBe(false);
    expect(containerOf(c, potion)).toBe('mochila');
  });

  it('equipar troca o item do mesmo slot', () => {
    const c = fighter();
    const leather = add(c, 'a-leather');
    const chain = add(c, 'a-chainmail');
    moveItemTo(c, leather.uid, 'equipado');
    moveItemTo(c, chain.uid, 'equipado');
    expect(c.equipped.armor).toBe(chain.uid);
    expect(isEquipped(c, leather)).toBe(false);
  });
});

describe('comparação antes de equipar (estilo BG3)', () => {
  it('CA de → para bate com a ficha depois de equipar', () => {
    const c = fighter();
    const leather = add(c, 'a-leather');
    const chain = add(c, 'a-chainmail');
    moveItemTo(c, leather.uid, 'equipado');
    const before = deriveCharacter(c).ac;

    const p = previewEquip(c, chain.uid)!;
    expect(p.replaces?.uid).toBe(leather.uid);
    const ac = p.deltas.find((d) => d.label === 'CA')!;
    expect(ac.from).toBe(String(before));

    moveItemTo(c, chain.uid, 'equipado');
    expect(ac.to).toBe(String(deriveCharacter(c).ac));
  });

  it('armadura pesada avisa Força mínima e Furtividade', () => {
    const c = fighter();
    c.baseAbilities.str = 8;
    const plate = add(c, 'a-plate');
    const p = previewEquip(c, plate.uid)!;
    expect(p.warnings.some((w) => w.startsWith('Exige Força'))).toBe(true);
    expect(p.warnings).toContain('Desvantagem em Furtividade');
  });

  it('arma: compara acerto e dano com a que sai da mão', () => {
    const c = fighter();
    const dagger = add(c, 'w-dagger');
    const greataxe = add(c, 'w-greataxe');
    moveItemTo(c, dagger.uid, 'equipado');
    const p = previewEquip(c, greataxe.uid)!;
    const dmg = p.deltas.find((d) => d.label === 'Dano')!;
    expect(dmg.from).toMatch(/^1d4/);
    expect(dmg.to).toMatch(/^1d12/);
    expect(dmg.better).toBe(true);
  });

  it('arma de duas mãos avisa quando há escudo', () => {
    const c = fighter();
    const shield = add(c, 's-shield');
    const greataxe = add(c, 'w-greataxe');
    moveItemTo(c, shield.uid, 'equipado');
    expect(previewEquip(c, greataxe.uid)!.warnings.some((w) => w.startsWith('Duas mãos'))).toBe(true);
  });

  it('sem prévia para item já equipado ou sem slot', () => {
    const c = fighter();
    const sword = add(c, 'w-longsword');
    const potion = add(c, 'p-heal');
    moveItemTo(c, sword.uid, 'equipado');
    expect(previewEquip(c, sword.uid)).toBeNull();
    expect(previewEquip(c, potion.uid)).toBeNull();
  });
});
