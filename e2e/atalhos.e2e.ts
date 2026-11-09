import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

/** Atalhos de teclado na ficha (PC): I, 1–6, Alt+1–6, Shift = vantagem e ? para a lista. */
test.describe('atalhos de teclado', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${WIZARD.id}`);
    await expect(page.locator('.fv-init-btn').first()).toBeVisible();
  });

  test('I rola a iniciativa; digitando num campo, não', async ({ page }) => {
    await page.getByPlaceholder('ex.: escalar o muro').fill('igual');
    await expect(page.locator('.fv-init-btn-last')).toHaveCount(0);
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('i');
    await expect(page.locator('.fv-init-btn-last').first()).toBeVisible();
  });

  test('números rolam testes, Alt rola salvaguarda, Shift dá vantagem, ? mostra a lista', async ({ page }) => {
    await page.keyboard.press('Shift+Digit1');
    await expect(page.getByText(/Teste de Força/).first()).toBeVisible();
    await page.keyboard.press('Alt+Digit4');
    await expect(page.getByText(/Resist\. de Intelig/).first()).toBeVisible();
    await page.keyboard.press('Shift+Slash');
    const help = page.getByRole('dialog', { name: 'Atalhos de teclado' });
    await expect(help).toContainText('Salvaguarda do mesmo atributo');
    // com a janela aberta, as teclas não rolam por trás
    await page.keyboard.press('Digit3');
    await expect(page.getByText(/Teste de Constitui/)).toHaveCount(0);
  });
});
