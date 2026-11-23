import { test, expect } from './fixtures/test';
import type { Locator, Page } from '@playwright/test';
import { C, installSupabase, signIn, WIZARD } from './fixtures/supabase';
import { chooseFullRules } from './fixtures/creator';

/**
 * B-008: janelas feitas à mão que declaram aria-modal precisam prender o
 * foco (Tab e Shift+Tab não saem), fechar com Esc e devolver o foco.
 */
async function tabStaysInside(page: Page, dialog: Locator, presses = 14) {
  for (let n = 0; n < presses; n++) {
    await page.keyboard.press(n % 4 === 3 ? 'Shift+Tab' : 'Tab');
    await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
}

test.describe('foco preso nas janelas (B-008)', () => {
  test('tutorial: Tab fica dentro, Esc fecha e o foco volta ao botão', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/');
    const abrir = page.getByRole('button', { name: /Tutorial/ });
    await abrir.focus();
    await page.keyboard.press('Enter');
    const tutorial = page.getByRole('dialog', { name: 'Sua ficha que faz as contas' });
    await expect(tutorial).toBeVisible();
    await tabStaysInside(page, tutorial);
    await page.keyboard.press('Escape');
    await expect(tutorial).toHaveCount(0);
    await expect(abrir).toBeFocused();
  });

  test('tour da ficha: Tab fica no balão e Esc encerra', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { toursSeen: {} } });
    await page.goto(`/ficha/${WIZARD.id}`);
    const tour = page.locator('.fv-tour');
    await expect(tour).toBeVisible();
    await expect(tour.getByRole('button', { name: /Próximo/ })).toBeFocused();
    await tabStaysInside(page, tour, 8);
    await page.keyboard.press('Escape');
    await expect(tour).toHaveCount(0);
  });

  test('Dons no celular: a gaveta prende o foco, fecha com Esc e devolve o foco @celular', async ({ page }) => {
    test.skip(test.info().project.name !== 'celular');
    await signIn(page, 'guest');
    await page.goto('/criar');
    await chooseFullRules(page);
    const cta = page.locator('.fv-foot-cta');
    await cta.click(); // Caminho
    await page.getByRole('button', { name: /^Bardo/ }).click();
    await cta.click(); // Dons
    const alaude = page.getByRole('group', { name: 'Instrumentos musicais' }).getByRole('button', { name: /^Alaúde/ });
    await alaude.click();
    const gaveta = page.getByRole('dialog', { name: 'Alaúde' });
    await expect(gaveta).toBeVisible();
    await tabStaysInside(page, gaveta, 8);
    await page.keyboard.press('Escape');
    await expect(gaveta).toHaveCount(0);
    await expect(alaude).toBeFocused();
  });
  test('Bastidores do mestre: biblioteca de cenas prende o foco e Esc volta ao botão', async ({ page }) => {
    await signIn(page, 'master');
    await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}/jogar`);
    await page.getByRole('tab', { name: /Cenas/ }).click();
    const abrir = page.getByRole('button', { name: 'Biblioteca de cenas' });
    await abrir.click();
    const janela = page.getByRole('dialog', { name: 'Biblioteca de cenas' });
    await expect(janela).toBeVisible();
    await tabStaysInside(page, janela, 8);
    await page.keyboard.press('Escape');
    await expect(janela).toHaveCount(0);
    await expect(abrir).toBeFocused();
  });

  test('conjurar e "acertou?": Esc fecha a janela do botão e devolve o foco', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${WIZARD.id}`);
    await page.locator('.fv-sheet-tab', { hasText: 'Magias' }).click();
    const conjurar = page.getByRole('button', { name: /Conjurar/ }).first();
    await conjurar.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(conjurar).toBeFocused();

    await page.locator('.fv-sheet-tab', { hasText: 'Jogar' }).click();
    const acerto = page.locator('[data-attack-hit]').first();
    await acerto.click();
    const pergunta = page.getByRole('dialog', { name: /acertou\?/ });
    await expect(pergunta).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pergunta).toHaveCount(0);
    await expect(acerto).toBeFocused();
  });
});
