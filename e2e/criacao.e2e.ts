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

    // Kit do Livro do Jogador: Guerreiro com cota de malha e pacote aberto
    await expect(page.getByText('Kit do Livro do Jogador')).toBeVisible();
    await expect(page.locator('.fv-kit-bag')).toContainText('Pacote de Explorador de Masmorras:');
    await page.getByRole('button', { name: 'Personalizar kit' }).click();
    // (b) couro, arco longo e 20 flechas
    await page.getByRole('radiogroup', { name: 'Armadura' }).getByRole('radio', { name: /Couro, arco longo/ }).click();
    await expect(page.locator('.fv-kit-list')).toContainText('Arco Longo');
    await expect(page.getByText('Kit personalizado')).toBeVisible();
    // regra do livro: trocar o kit pelo ouro da classe (Guerreiro 5d4 × 10, média 125)
    await page.getByRole('button', { name: /Trocar o kit por ouro/ }).click();
    await expect(page.locator('.fv-kit-gold-n')).toContainText('125 po');
    await expect(page.locator('.fv-kit-bag')).toContainText('Do antecedente (Soldado)');
    // volta ao kit que estava escolhido (o personalizado, com arco longo)
    await page.getByRole('button', { name: 'Voltar ao kit' }).click();
    await expect(page.getByText('Kit personalizado')).toBeVisible();
    await expect(page.locator('.fv-kit-list')).toContainText('Arco Longo');
    await expect(page.getByRole('button', { name: 'Fechar personalização' })).toBeVisible(); // a personalização continua aberta
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
