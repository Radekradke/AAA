import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);

test.describe('busca geral', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
  });

  test('não aparece no menu principal; nas outras telas, sim', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Heróis/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toHaveCount(0);
    await page.goto('/config');
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toBeVisible();
  });

  test('regra abre o resumo ali mesmo; herói leva à ficha; aba leva à aba', async ({ page }) => {
    await page.goto('/personagens');
    await expect(page.getByText(NAME).first()).toBeVisible();
    await page.keyboard.press('Control+k');
    const busca = page.getByRole('dialog', { name: 'Buscar' });
    const campo = busca.getByRole('combobox');
    await campo.fill('bola de fogo');
    await expect(busca.getByRole('option').first()).toContainText('Bola de Fogo');
    await campo.press('Enter');
    await expect(busca.getByRole('heading', { name: 'Bola de Fogo' })).toBeVisible();
    await expect(busca).toContainText('Conjuração');
    await page.keyboard.press('Escape'); // volta à lista
    await expect(busca.getByRole('combobox')).toHaveValue('bola de fogo');
    await page.keyboard.press('Escape'); // fecha
    await expect(busca).toHaveCount(0);

    // sem acento e em minúsculas: acha o herói e abre a ficha
    await page.keyboard.press('/');
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').fill(NAME.split(' ')[0].toLowerCase());
    await page.getByRole('option', { name: new RegExp(NAME) }).click();
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}$`));

    // dentro da ficha, as abas também aparecem
    await expect(page.locator('.fv-sheet-tab', { hasText: 'Mesa' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toHaveCount(1); // a tela anterior já saiu
    await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').fill('magias');
    await expect(page.getByRole('group', { name: 'Abas desta ficha' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').press('Enter');
    await expect(page.locator('.fv-sheet-tab', { hasText: 'Magias' })).toHaveAttribute('aria-current', 'page');
  });

  test('criatura mostra o bloco de estatísticas @celular', async ({ page }) => {
    await page.goto('/personagens');
    await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').fill('goblin');
    await page.getByRole('option', { name: /Goblin/ }).first().click();
    await expect(page.getByRole('dialog', { name: 'Buscar' }).getByRole('heading', { name: 'Goblin' })).toBeVisible();
  });
});
