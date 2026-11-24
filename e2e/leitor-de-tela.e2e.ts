import { test, expect } from './fixtures/test';
import { WIZARD, signIn } from './fixtures/supabase';

/** Leitor de tela (5.2): estrutura, nomes que dizem o que o botão faz e o PV anunciado. */
test.describe('leitor de tela na ficha', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${WIZARD.id}`);
    await page.locator('.fv-sheet-tab', { hasText: 'Jogar' }).click();
  });

  test('região principal, nome do herói no h1 e seções em h2', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: String(WIZARD.name) })).toBeVisible();
    for (const s of ['Pontos de Vida', 'Ataques', 'Condições', 'Salvaguardas', 'Magia']) {
      await expect(main.getByRole('heading', { level: 2, name: s })).toBeVisible();
    }
    await page.locator('.fv-sheet-tab', { hasText: 'Combate' }).click();
    await expect(main.getByRole('heading', { level: 2, name: 'Economia de Turno' })).toBeVisible();
  });

  test('botões curtos têm nome completo; o PV atual é lido e anunciado ao mudar', async ({ page }) => {
    const pv = page.locator('p[aria-live="polite"]', { hasText: 'Pontos de vida' });
    await expect(pv).toHaveText(`Pontos de vida: ${WIZARD.hpCurrent} de 16`);
    await page.getByRole('button', { name: 'Sofrer 1 de dano' }).click();
    await expect(pv).toHaveText(`Pontos de vida: ${Number(WIZARD.hpCurrent) - 1} de 16`);
    await expect(page.getByRole('button', { name: 'Curar 5 PV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Teste de Força -1' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Salvaguarda de Inteligência \+\d, proficiente$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ACERTO com Bordão/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conjurar Sono' })).toBeVisible();
  });

  test('a explicação da dica chega ao leitor como descrição do botão', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Classe de Armadura \d+$/ })).toHaveAccessibleDescription(/^Classe de Armadura: .*Sem armadura/);
  });

  test('ficha: a placa do atributo não tem botão dentro de botão', async ({ page }) => {
    await page.locator('.fv-sheet-tab', { hasText: 'Ficha' }).first().click();
    const nested = await page.evaluate(() => document.querySelectorAll('button button, [role="button"] button, button [role="button"], [role="button"] [role="button"]').length);
    expect(nested).toBe(0);
    await expect(page.getByRole('button', { name: /^Teste de Força -1, valor 8$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Salvaguarda de Força -1$/ })).toBeVisible();
  });
});
