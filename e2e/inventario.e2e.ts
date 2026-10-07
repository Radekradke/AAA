import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const ring = (uid: string, itemId: string, name: string, attunement: boolean, extra: Record<string, unknown> = {}) => ({
  uid, itemId, name, category: 'ring', note: '', rarity: 'raro', weight: 0, quantity: 1, favorite: false, attuned: false, attunement, worn: false, location: 'mochila', ...extra,
});
const HERO = {
  ...WIZARD,
  inventory: [
    ...(WIZARD.inventory as unknown[]),
    ring('r1', 'm-ring-prot', 'Anel de Proteção', true, { acBonus: 1, magic: { saves: 1 } }),
    ring('r2', 'm-ring-swimming', 'Anel da Natação', false),
    ring('r3', 'm-ring-waterwalking', 'Anel de Andar na Água', false),
  ],
};

async function openItems(page: Page) {
  const inv = page.locator('.fv-sheet-tab', { hasText: 'Inventário' });
  if (await inv.isVisible()) return inv.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Itens', exact: true }).click();
}
const card = (page: Page, name: string) => page.locator(`.fv-inv-card[data-item="${name}"]`);
const ac = (page: Page) => page.locator('.fv-header-stat').first().locator('.fv-header-stat-val');

test.describe('inventário: anéis e sintonia', () => {
  test('veste anel, sintoniza e a CA sobe; o terceiro anel é recusado @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await openItems(page);
    await expect(ac(page)).toHaveText('12');
    const box = (name: RegExp) => page.getByRole('button', { name });

    // vestir sem sintonia: avisa e não muda a CA
    await box(/^Mochila:/).click();
    await card(page, 'Anel de Proteção').getByRole('button', { name: 'Vestir' }).click();
    await expect(page.getByText(/só funciona sintonizado/)).toBeVisible();
    await expect(ac(page)).toHaveText('12');

    // sintonizar: +1 de CA
    await page.getByRole('button', { name: /Anel de Proteção.*sem sintonia/ }).click();
    await expect(ac(page)).toHaveText('13');

    // segundo anel: cabe; terceiro: recusado com o motivo
    await card(page, 'Anel da Natação').getByRole('button', { name: 'Vestir' }).click();
    // o card já avisa antes de tentar; tentando, a mochila diz o motivo
    await expect(card(page, 'Anel de Andar na Água')).toContainText('Já está usando 2 anéis');
    await card(page, 'Anel de Andar na Água').getByRole('button', { name: 'Vestir' }).click();
    await expect(page.locator('[aria-live="polite"]', { hasText: 'Já está usando 2 anéis' })).toBeVisible();
    await expect(card(page, 'Anel de Andar na Água')).toBeVisible(); // continua na mochila

    // em Equipado: os dois vestidos; tirar o de Proteção devolve a CA
    await box(/^Equipado:/).click();
    await expect(card(page, 'Anel de Proteção').getByText('Vestido')).toBeVisible();
    await expect(card(page, 'Anel da Natação').getByText('Vestido')).toBeVisible();
    await card(page, 'Anel de Proteção').getByRole('button', { name: 'Tirar' }).click();
    await expect(ac(page)).toHaveText('12');
  });
});
