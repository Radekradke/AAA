import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

test.describe('versão do app no menu', () => {
  test('mostra a versão e diz se está atualizada ou se saiu outra @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [] });
    let live = 'outra-versao';
    await page.route('**/version.json*', (r) => r.fulfill({ json: { version: live, builtAt: '2026-10-10T12:00:00Z' } }));

    await page.goto('/');
    const box = page.locator('.fv-app-version');
    await expect(box).toContainText('Versão');
    // já saiu outra: oferece atualizar
    await expect(box.getByRole('button', { name: 'Nova versão disponível · atualizar' })).toBeVisible();

    // a versão no ar é a mesma deste app: atualizada
    live = ((await box.locator('[title^="Commit "]').getAttribute('title')) ?? '').replace('Commit ', '');
    await page.reload();
    await expect(box).toContainText('✓ atualizada');
    await expect(box.getByRole('button')).toHaveCount(0);
  });
});
