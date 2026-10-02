import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

test.describe('criação de herói', () => {
  test('do zero até a ficha, com as escolhas obrigatórias', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/criar');
    const cta = page.locator('.fv-foot-cta');

    // Origem → Caminho → Passado (padrões: Humano, Guerreiro, Soldado)
    await expect(page.getByRole('button', { name: /Humano/ })).toHaveAttribute('aria-pressed', 'true');
    await cta.click();
    await cta.click();

    // Passado: o antecedente pede 1 idioma à escolha
    const idiomas = page.getByRole('group', { name: 'Idiomas à escolha' });
    await idiomas.locator('button[aria-pressed="false"]').first().click();
    await cta.click(); // Atributos
    await cta.click(); // Perícias

    // Perícias: Guerreiro escolhe 2
    const livres = page.locator('.fv-skill:not(.is-on)');
    await livres.first().click();
    await livres.first().click();
    await cta.click(); // Equipamento
    await cta.click(); // Despertar

    // Sem nome o botão fica travado e diz o que falta
    await expect(cta).toBeDisabled();
    await expect(cta).toHaveAttribute('title', /nome/i);
    await page.getByLabel('Nome', { exact: true }).fill('Brenna Teste');
    await expect(cta).toBeEnabled();
    await cta.click();

    await expect(page).toHaveURL(/\/ficha\/[^/]+$/);
    await expect(page.getByText('Brenna Teste').first()).toBeVisible();

    // continua lá depois de recarregar (salvo no aparelho)
    await page.waitForTimeout(1200); // autosave com debounce de 900 ms
    await page.reload();
    await expect(page.getByText('Brenna Teste').first()).toBeVisible();
  });
});
