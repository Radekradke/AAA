import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);

async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  const nav = page.getByRole('navigation', { name: 'Abas da ficha' });
  const direct = nav.getByRole('button', { name: new RegExp(`^${mobile}`) });
  if (await direct.count()) return direct.first().click();
  await nav.getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: new RegExp(mobile) }).click();
}

const item = (uid: string, itemId: string, name: string, attuned: boolean) => ({
  uid, itemId, name, category: 'wondrous', note: '', rarity: 'muito-raro', weight: 2, quantity: 1, favorite: false, attuned, attunement: true,
});

const HERO = {
  ...WIZARD,
  inventory: [...(WIZARD.inventory as unknown[]), item('staff-fire', 'm-staff-fire', 'Cajado do Fogo', true), item('staff-heal', 'm-staff-healing', 'Cajado da Cura', false)],
};

test.describe('cajados: cargas e sintonia', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
  });

  test('Bola de Fogo do Cajado do Fogo gasta 3 das 10 cargas @celular', async ({ page }) => {
    await tab(page, 'Magias', 'Magias');
    const staff = page.getByRole('region', { name: /Cajado do Fogo: 10 de 10 cargas/ });
    await expect(staff).toBeVisible();
    await expect(staff).toContainText('Muralha de Fogo');
    await staff.getByRole('listitem').filter({ hasText: 'Bola de Fogo' }).getByRole('button', { name: /Usar/ }).click();
    await expect(page.getByRole('region', { name: /Cajado do Fogo: 7 de 10 cargas/ })).toBeVisible();
    await expect(page.getByText(/3 cargas · Cajado do Fogo/).first()).toBeVisible();

    // o cartão do inventário mostra as mesmas cargas
    await tab(page, 'Inventário', 'Itens');
    await page.getByRole('button', { name: /^Mochila:/ }).click();
    await expect(page.getByLabel('7 de 10 cargas').first()).toBeVisible();
  });

  test('mago não sintoniza o Cajado da Cura (só bardo, clérigo ou druida)', async ({ page }) => {
    await tab(page, 'Inventário', 'Itens');
    const row = page.getByRole('button', { name: /Cajado da Cura/ }).filter({ hasText: 'não é para a sua classe' });
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'só aceita sintonia de bardos, clérigos ou druidas' })).toBeVisible();
  });
});
