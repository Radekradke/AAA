import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

test.describe('contador de artes', () => {
  test('em Configurações → Avançado: total, categorias e o que falta @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [] });
    await page.goto('/config');
    const open = page.getByRole('button', { name: 'Abrir contador de artes' });
    await expect(page.getByText('Contador de artes')).toBeVisible();
    await expect(page.locator('.fv-artcount')).toHaveCount(0); // escondido até abrir
    await open.click();

    const box = page.locator('.fv-artcount');
    await expect(box).toContainText(/\d+ de \d+ artes · \d+%/);
    for (const c of ['Magias', 'Armas', 'Armaduras e escudos', 'Equipamento', 'Itens mágicos', 'Criaturas', 'Retratos das classes', 'Vozes das classes']) {
      await expect(box.getByRole('button', { name: new RegExp(`^${c}`) })).toBeVisible();
    }

    // magias: por círculo, com a lista do que falta
    await box.getByRole('button', { name: /^Magias/ }).click();
    await expect(box).toContainText('src/assets/magias');
    await expect(box.locator('.fv-artcount-groups li').first()).toContainText('Truques');
    await box.locator('.fv-artcount-missing summary').first().click();
    await expect(box.locator('.fv-artcount-missing li').first()).toBeVisible();
  });
});
