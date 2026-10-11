import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const weapon = (uid: string, itemId: string, name: string, w: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  uid, itemId, name, category: 'weapon', note: '', rarity: 'comum', weight: 1, quantity: 1, favorite: false, attuned: false,
  weapon: { damageDice: 1, type: 'martial', range: 'melee', properties: [], ...w }, ...extra,
});
const GLAIVE = weapon('g1', 'w-glaive', 'Glaive', { damageDie: 10, damageType: 'cortante', properties: ['Pesada', 'Alcance', 'Duas mãos'] });
const LONGSWORD = weapon('l1', 'w-longsword', 'Espada Longa', { damageDie: 8, damageType: 'cortante', versatileDie: 10 });
const DAGGER = weapon('d1', 'w-dagger', 'Adaga', { damageDie: 4, damageType: 'perfurante', type: 'simple', properties: ['Leve'] }, { location: 'mochila' });
const SHIELD = { uid: 's1', itemId: 's-shield', name: 'Escudo', category: 'shield', note: '+2 CA', rarity: 'comum', weight: 3, quantity: 1, favorite: false, attuned: false, acBonus: 2 };

const fighter = (id: string, extra: Record<string, unknown>) => ({
  ...WIZARD, id, name: 'Brakka', raceId: 'human', subraceId: null, classId: 'fighter', level: 5, subclassId: null,
  classLevels: [{ classId: 'fighter', level: 5 }], baseAbilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
  choices: {}, knownSpells: [], preparedSpells: [], hpCurrent: 44, levelHistory: [],
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0 },
  ...extra,
});
// glaive com Mestre em Armas Grandes + Mestre em Hastes
const POLEARM = fighter('gwm5', {
  feats: ['gwm', 'polearm-master'],
  inventory: [GLAIVE],
  equipped: { armor: null, shield: null, mainHand: 'g1', offHand: null, ranged: null },
});
// espada longa + escudo, adaga na mochila
const SWORD = fighter('sw5', {
  feats: [],
  inventory: [LONGSWORD, SHIELD, DAGGER],
  equipped: { armor: null, shield: 's1', mainHand: 'l1', offHand: null, ranged: null },
});

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const attackRow = (page: Page, name: string) =>
  page.locator('div', { has: page.getByText(name, { exact: true }) }).filter({ has: page.locator('.fv-atk') }).last();

test.describe('talentos de arma e mãos', () => {
  test('Mestre em Armas Grandes: −5 no acerto e +10 no dano; Mestre em Hastes dá o ataque com o cabo', async ({ page }) => {
    await signIn(page, 'guest', { characters: [POLEARM], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/gwm5');
    await page.evaluate(() => { Math.random = () => 0.5; });
    await tab(page, 'Combate');

    const glaive = attackRow(page, 'Glaive');
    const hit = glaive.getByRole('button', { name: /ACERTO/ });
    await expect(hit).toContainText('+6');
    await glaive.getByRole('button', { name: /Mestre em Armas Grandes: −5/ }).click();
    await expect(hit).toContainText('+1');

    // acerta com −5: o dano já vem com o +10 ligado
    await hit.click();
    await page.getByRole('button', { name: 'Acertou — dano' }).click();
    await expect(page.getByRole('button', { name: 'Mestre em Armas Grandes +10' })).toHaveAttribute('aria-pressed', 'true');

    // cabo da haste: 1d4 concussão como ataque bônus
    await expect(page.getByText('Glaive (cabo)')).toBeVisible();
    await expect(page.getByText(/ação bônus após Atacar com a haste/)).toBeVisible();
  });

  test('versátil some com escudo; "Equipar na segunda mão" põe a adaga e tira o escudo', async ({ page }) => {
    await signIn(page, 'guest', { characters: [SWORD], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/sw5');
    await tab(page, 'Combate');

    // com escudo: sem "Duas mãos" o dano da espada longa não tem escolha — rola direto, sem janela
    await expect(attackRow(page, 'Espada Longa').getByRole('button', { name: /CORTANTE/ })).toContainText('1d8');
    await attackRow(page, 'Espada Longa').getByRole('button', { name: /CORTANTE/ }).click();
    await expect(page.getByRole('dialog', { name: 'Dano de Espada Longa' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Duas mãos/ })).toHaveCount(0);

    await tab(page, 'Inventário');
    await page.getByRole('button', { name: /^Mochila:/ }).click();
    await page.locator('.fv-inv-card[data-item="Adaga"]').getByRole('button', { name: 'Equipar na segunda mão' }).click();
    await expect(page.locator('[aria-live="polite"]', { hasText: 'Adaga na segunda mão; Escudo foi para a mochila' })).toBeVisible();

    await tab(page, 'Combate');
    // espada longa não é leve: segura a adaga, mas sem o ataque bônus da luta com duas armas
    await expect(page.getByText(/mão secundária · sem ataque bônus/)).toBeVisible();
  });
});
