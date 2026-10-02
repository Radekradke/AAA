import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);

test.describe('ficha', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
  });

  test('abre e troca de aba', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    for (const aba of ['Combate', 'Inventário', 'Magias', 'Diário', 'Ficha']) {
      const tab = page.locator('.fv-sheet-tab', { hasText: aba });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-current', 'page');
    }
  });

  test('versão para imprimir / PDF', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('menuitem', { name: 'Imprimir / salvar PDF' }).click();
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}/imprimir$`));
    const papel = page.locator('.fv-print');
    await expect(papel.getByRole('heading', { level: 1 })).toHaveText(NAME);
    await expect(papel).toContainText('Testes de resistência');
    await expect(papel).toContainText('Magias');

    // na impressão só o papel aparece
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.fv-printpage-bar').first()).toBeHidden();
    await expect(papel).toBeVisible();
  });

  test('sem conta, compartilhar explica o caminho alternativo', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('menuitem', { name: 'Compartilhar por link' }).click();
    await expect(page.getByRole('dialog')).toContainText('precisa de uma conta');
  });

  test('cabe na tela do celular sem rolagem lateral @celular', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBeLessThanOrEqual(1);
  });
});
