import { test, expect } from './fixtures/test';
import { M, WIZARD, installSupabase, signIn } from './fixtures/supabase';

/**
 * Sem internet, um pedaço de código que ainda não foi baixado não pode
 * derrubar o app nem recarregar a página (cairia na tela "sem conexão" do
 * navegador). B-005.
 */
const HERO = { ...WIZARD, id: String(WIZARD.id), name: String(WIZARD.name), ownerId: M };

async function offline(page: import('@playwright/test').Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true }));
}

test.describe('sem internet', () => {
  test('ficha continua de pé quando a anotação rápida não baixa @celular', async ({ page }) => {
    // em desenvolvimento o React também repassa à janela o erro que a guarda já pegou
    page.removeAllListeners('pageerror');
    await offline(page);
    await signIn(page, 'master', { characters: [HERO] });
    await installSupabase(page, 'master');
    await page.route(/QuickNote/, (r) => r.abort('internetdisconnected'));
    await page.goto(`/ficha/${HERO.id}`);
    await expect(page.getByText(HERO.name).first()).toBeVisible();
    // marca na janela: se a página recarregar, a marca some
    await page.evaluate(() => ((window as unknown as { __fv: number }).__fv = 1));
    await page.waitForTimeout(1500);
    await expect(page.getByText(HERO.name).first()).toBeVisible();
    await expect(page.locator('.fv-crash')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __fv?: number }).__fv), 'não recarrega a página').toBe(1);
  });

  test('página que não baixou mostra "Sem internet" e não recarrega', async ({ page }) => {
    // o erro de import esperado não conta como falha do teste
    page.removeAllListeners('pageerror');
    await offline(page);
    await signIn(page, 'master', { characters: [HERO] });
    await installSupabase(page, 'master');
    await page.route(/src\/pages\/Settings/, (r) => r.abort('internetdisconnected'));
    await page.goto('/config');
    const crash = page.locator('.fv-crash');
    await expect(crash).toBeVisible();
    await expect(crash.getByRole('heading')).toHaveText('Sem internet');
    await expect(crash).toContainText('Suas fichas estão salvas');
    await page.evaluate(() => ((window as unknown as { __fv: number }).__fv = 1));
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as { __fv?: number }).__fv), 'não recarrega a página').toBe(1);
  });
});
