import { describe, expect, it } from 'vitest';
import { ITEM_DESCRIPTIONS, itemDescription } from '@/data/itemDescriptions';
import { getItem, GEAR, MAGIC_ITEMS } from '@/data/items';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { ITEM_TAGS, autoTags, itemTags } from '../itemTags';
import { itemLore } from '@/lib/lore';

/** Lotes já escritos: cada item do catálogo neles precisa de texto. */
const COVERED = [...WEAPONS, ...ARMORS, ...GEAR, ...MAGIC_ITEMS];

describe('descrições de itens', () => {
  it('todo item do catálogo (armas, armaduras, equipamento e mágicos) tem descrição e linha "na mesa"', () => {
    const missing = COVERED.filter((i) => !itemDescription(i.id)).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  it('textos têm tamanho de descrição de verdade e terminam com ponto', () => {
    for (const [id, d] of Object.entries(ITEM_DESCRIPTIONS)) {
      expect(d.desc.length, `${id} desc`).toBeGreaterThanOrEqual(90);
      expect(d.desc.length, `${id} desc`).toBeLessThanOrEqual(320);
      expect(d.use.length, `${id} use`).toBeGreaterThanOrEqual(25);
      expect(/[.!]$/.test(d.desc) && /[.!]$/.test(d.use), id).toBe(true);
    }
  });

  it('nenhum texto se repete entre itens', () => {
    const descs = Object.values(ITEM_DESCRIPTIONS).map((d) => d.desc);
    const uses = Object.values(ITEM_DESCRIPTIONS).map((d) => d.use);
    expect(new Set(descs).size).toBe(descs.length);
    expect(new Set(uses).size).toBe(uses.length);
  });

  it('só há descrição para itens que existem no catálogo', () => {
    const orphans = Object.keys(ITEM_DESCRIPTIONS).filter((id) => !getItem(id));
    expect(orphans).toEqual([]);
  });

  it('etiquetas escritas à mão são do vocabulário e não repetem as automáticas', () => {
    for (const [id, d] of Object.entries(ITEM_DESCRIPTIONS)) {
      const auto = autoTags(getItem(id)!);
      for (const t of d.tags ?? []) {
        expect(ITEM_TAGS, `${id}: ${t}`).toContain(t);
        expect(auto, `${id}: "${t}" já sai sozinha`).not.toContain(t);
      }
    }
  });

  it('versão encantada usa o texto do item base', () => {
    expect(itemDescription('w-longsword-plus2')).toBe(ITEM_DESCRIPTIONS['w-longsword']);
    expect(itemDescription('w-battleaxe-plus1')).toBe(ITEM_DESCRIPTIONS['w-battleaxe']);
  });
});

describe('etiquetas automáticas', () => {
  it('saem dos dados do item', () => {
    expect(itemTags(getItem('w-dagger')!)).toContain('Arremessável');
    expect(itemTags(getItem('w-longbow')!)).toEqual(expect.arrayContaining(['Duas mãos', 'Precisa de munição']));
    expect(itemTags(getItem('a-plate')!)).toContain('Barulhenta');
    expect(itemTags(getItem('a-leather')!)).not.toContain('Barulhenta');
    expect(itemTags(getItem('g-tool-smith')!)).toContain('Ferramenta');
    expect(itemTags(getItem('g-inst-lute')!)).not.toContain('Ferramenta');
    expect(itemTags(getItem('g-focus-wand')!)).toContain('Foco de conjuração');
    expect(itemTags(getItem('g-acid')!)).toContain('Gasta ao usar');
  });
});

describe('dica do item', () => {
  it('mostra a descrição, a linha "na mesa" e as etiquetas', () => {
    const lore = itemLore(getItem('a-leather')!);
    expect(lore.flavor).toMatch(/couro fervido/);
    expect(lore.body).toMatch(/sem atrapalhar a Furtividade/);
    expect(lore.tags).toEqual(['Barata', 'Furtividade']);
  });

  it('arma: diz o atributo do ataque e depois para que serve', () => {
    const lore = itemLore(getItem('w-rapier')!);
    expect(lore.body).toMatch(/^Ataca com Força ou Destreza.*Acuidade com 1d8/);
  });

  it('equipamento comum: a linha prática substitui a nota (sem repetir)', () => {
    const torch = itemLore(getItem('g-torch')!);
    expect(torch.body).toBe(ITEM_DESCRIPTIONS['g-torch'].use);
  });

  it('item mágico: regra exata do catálogo e a dica numa linha embaixo', () => {
    const wand = itemLore(getItem('m-wand-fireballs')!);
    const [rule, tip] = wand.body.split('\n');
    expect(rule).toMatch(/CD 15/);
    expect(tip).toBe(ITEM_DESCRIPTIONS['m-wand-fireballs'].use);
  });

  it('armadura mágica: a linha prática traz o efeito especial', () => {
    expect(itemLore(getItem('ma-adamantine')!).body).toMatch(/críticos/);
  });

  it('instância na mochila acha o texto pelo itemId', () => {
    const lore = itemLore({ itemId: 'w-dagger', name: 'Adaga da vovó', category: 'weapon', rarity: 'comum', note: '', weight: 0.5 });
    expect(lore.flavor).toMatch(/Lâmina curta/);
  });
});
