import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

/**
 * Temas oferecidos: Véu Astral, Corte Carmesim, Eclipse e Guilda Rubra.
 * Os outros quatro continuam no código, só escondidos (THEME_ORDER em
 * src/data/themes.ts). Quem tinha um deles salvo abre no Véu Astral.
 */
test.describe('temas oferecidos', () => {
  test('quem tinha um tema escondido salvo abre no Véu Astral, sem piscar a cor errada', async ({ page }) => {
    await signIn(page, 'guest', { characters: [], ui: { theme: 'frio', onboarded: true } });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'astral');
    await expect(page.locator('link[data-css="theme-frio"]')).toHaveCount(0);
    // a tela de abertura também já tinha pintado com as cores do Véu Astral
    const bootBg = await page.evaluate(() => document.documentElement.style.getPropertyValue('--boot-bg'));
    expect(bootBg.toLowerCase()).toBe('#0e0a24');
  });

  test('Configurações mostra só os 4 temas, e escolher um troca na hora', async ({ page }) => {
    await signIn(page, 'guest', { characters: [] });
    await page.goto('/config');
    const temas = page.getByRole('radiogroup', { name: 'Tema visual' }).getByRole('radio');
    await expect(temas).toHaveCount(4);
    await expect(temas).toContainText(['Véu Astral', 'Corte Carmesim', 'Eclipse', 'Guilda Rubra']);
    await temas.filter({ hasText: 'Corte Carmesim' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'carmesim');
  });
});
