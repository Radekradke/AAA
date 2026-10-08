import { test, expect } from './fixtures/test';
import { installSupabase, signIn } from './fixtures/supabase';

// aparelho "novo": nunca viu o tutorial nem os tours
const NOVO = { onboarded: false, toursSeen: {} };
const tutorial = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Sua ficha que faz as contas' });

test.describe('tutorial', () => {
  test('"Não mostrar mais" desliga o tutorial e Configurações religa @celular', async ({ page }) => {
    await signIn(page, 'guest', { ui: NOVO });
    await page.goto('/');
    await expect(tutorial(page)).toBeVisible();
    await page.getByRole('button', { name: 'Não mostrar mais' }).click();
    await expect(tutorial(page)).toHaveCount(0);
    await expect(page.getByText('Tutorial e tours desligados.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: /Heróis/ })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(tutorial(page)).toHaveCount(0);

    // continua pelo menu
    await page.getByRole('button', { name: /Tutorial/ }).click();
    await expect(tutorial(page)).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/config');
    const chave = page.getByRole('switch', { name: 'Tutorial e tours automáticos' });
    await expect(chave).toHaveAttribute('aria-checked', 'false');
    await chave.click();
    await expect(chave).toHaveAttribute('aria-checked', 'true');
  });

  test('conta que já viu o tutorial em outro aparelho não vê de novo', async ({ page }) => {
    await signIn(page, 'player', { ui: NOVO });
    const db = await installSupabase(page, 'player');
    db.meta.fv_onboarding = { done: true, tours: { sheet: true } };
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Heróis/ })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(tutorial(page)).toHaveCount(0);
    // o aparelho aprendeu com a conta
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fv-ui')!).state)).toMatchObject({ onboarded: true, toursSeen: { sheet: true } });
  });

  test('conta nova vê o tutorial uma vez e a conta lembra', async ({ page }) => {
    await signIn(page, 'player', { ui: NOVO });
    const db = await installSupabase(page, 'player');
    await page.goto('/');
    await expect(tutorial(page)).toBeVisible();
    await page.getByRole('button', { name: 'Pular tutorial' }).click();
    await expect.poll(() => db.meta.fv_onboarding).toMatchObject({ done: true, off: false });
    expect(db.writes).toContain('PUT auth.user');
  });

  test('desligar em Configurações vale para a conta', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    await page.goto('/config');
    await page.getByRole('switch', { name: 'Tutorial e tours automáticos' }).click();
    await expect.poll(() => db.meta.fv_onboarding).toMatchObject({ off: true });
  });
});
