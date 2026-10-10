import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// mago com Mísseis Mágicos no grimório, mas não preparada hoje
const HERO = { ...WIZARD, knownSpells: [...(WIZARD.knownSpells as string[]), 'sp-misseis', 'sp-bolafogo', 'sp-raygelo'], preparedSpells: [...(WIZARD.preparedSpells as string[]), 'sp-raygelo'] };

async function openSpells(page: Page) {
  const tab = page.locator('.fv-sheet-tab', { hasText: 'Magias' });
  if (await tab.isVisible()) return tab.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Magias', exact: true }).click();
}
const row = (page: Page, name: string) => page.locator('.fv-spell-list .fv-spell-row', { hasText: name });
const group = (page: Page, label: RegExp) => page.locator('.fv-spell-group', { has: page.locator('h3', { hasText: label }) });

test.describe('lista de magias', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${WIZARD.id}`);
    await openSpells(page);
  });

  test('preparar pelo +, favoritar fixa no topo, espaços no título do círculo @celular', async ({ page }) => {
    // CD e ataque num chip só
    await expect(page.locator('.fv-spell-dc')).toContainText(/CD \d+/);
    // espaços do círculo no próprio título
    await expect(group(page, /1º círculo/).locator('.fv-spell-group-slots')).toContainText(/livre/);

    // não preparada: apagada e sem Conjurar; o "+" à esquerda prepara
    const missiles = row(page, 'Mísseis Mágicos');
    await expect(missiles).toHaveClass(/is-dormant/);
    await expect(missiles.getByRole('button', { name: /Conjurar/ })).toHaveCount(0);
    await missiles.getByRole('button', { name: 'Preparar Mísseis Mágicos' }).click();
    await expect(missiles).not.toHaveClass(/is-dormant/);
    await expect(missiles.getByRole('button', { name: /Conjurar/ })).toBeVisible();

    // favoritar: vai para "Favoritas" no topo; desfazer devolve ao círculo
    await missiles.hover();
    await missiles.getByRole('button', { name: 'Fixar Mísseis Mágicos nas favoritas' }).click();
    await expect(group(page, /Favoritas/).locator('.fv-spell-row', { hasText: 'Mísseis Mágicos' })).toBeVisible();
    await expect(group(page, /1º círculo/).locator('.fv-spell-row', { hasText: 'Mísseis Mágicos' })).toHaveCount(0);
    const fav = row(page, 'Mísseis Mágicos');
    await fav.getByRole('button', { name: 'Tirar Mísseis Mágicos das favoritas' }).click();
    await expect(page.locator('.fv-spell-group h3', { hasText: 'Favoritas' })).toHaveCount(0);
  });

  test('filtro por círculo e busca; nome inteiro, sem "automática"', async ({ page }) => {
    await page.locator('.fv-spell-filter').getByRole('button', { name: /^Truques/ }).click();
    await expect(row(page, 'Luz')).toBeVisible();
    await expect(row(page, 'Sono')).toHaveCount(0);
    await page.locator('.fv-spell-filter').getByRole('button', { name: /^Todas/ }).click();
    await page.getByRole('textbox', { name: 'Buscar magia' }).fill('abjur');
    await expect(row(page, 'Escudo Arcano')).toBeVisible();
    await expect(row(page, 'Luz')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Buscar magia' }).fill('');
    await expect(row(page, 'Armadura Arcana').locator('.fv-spell-name')).toHaveText('Armadura Arcana');
    await expect(page.locator('.fv-spell-list', { hasText: '✓ automática' })).toHaveCount(0);
  });
});
