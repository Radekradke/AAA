import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);
/** Fixa o dado: 0.999 → 20 natural; 0 → 1 natural. */
const dice = (page: Page, v: number) => page.evaluate((x) => { Math.random = () => x; }, v);

test.describe('crítico cinematográfico', () => {
  test('20 natural mostra o herói em tela cheia; 1 natural, o tropeço @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`, { state: { tab: 'combate' } } as never);
    const combate = page.locator('.fv-sheet-tab', { hasText: 'Combate' });
    if (await combate.isVisible()) await combate.click();
    else await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Combate', exact: true }).click();

    await dice(page, 0.999);
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    const cine = page.locator('.fv-cine');
    await expect(cine).toHaveClass(/is-crit/);
    await expect(cine).toHaveCSS('opacity', '1'); // visível de verdade (com "reduzir movimento" também)
    await expect(cine).toContainText('Crítico!');
    await expect(cine).toContainText(NAME);
    await expect(cine.locator('img')).toBeVisible();
    await cine.click(); // toque fecha
    await expect(cine).toHaveCount(0);

    await dice(page, 0);
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    await expect(cine).toHaveClass(/is-fumble/);
    await expect(cine).toContainText('Tropeço!');
    await page.keyboard.press('Escape');
    await expect(cine).toHaveCount(0);
  });

  test('teste contra a morte: monitor com batimentos, contadores e o 20 que levanta @celular', async ({ page }) => {
    const dying = { ...WIZARD, hpCurrent: 0, combat: { ...(WIZARD.combat as object), deathSaves: { success: 1, fail: 1 }, conditions: ['Inconsciente'] } };
    await signIn(page, 'guest', { characters: [dying], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText('CAINDO — Testes contra a Morte')).toBeVisible();

    await dice(page, 0.2); // 5 natural: falha
    await page.getByRole('button', { name: 'Rolar teste' }).click();
    const cine = page.locator('.fv-cine');
    await expect(cine).toHaveClass(/is-death/);
    await expect(cine).toHaveClass(/is-fail/);
    await expect(cine).toHaveCSS('opacity', '1');
    await expect(cine).toContainText('Escorrega…');
    await expect(cine).toContainText(NAME);
    await expect(cine.locator('.fv-cine-pips .is-ok i.is-on')).toHaveCount(1);
    await expect(cine.locator('.fv-cine-pips .is-bad i.is-on')).toHaveCount(2);
    await cine.click();

    await dice(page, 0.999); // 20 natural: levanta com 1 PV (sem o crítico comum por cima)
    await page.getByRole('button', { name: 'Rolar teste' }).click();
    await expect(cine).toHaveClass(/is-revive/);
    await expect(cine).toContainText('De volta!');
    await expect(cine).not.toContainText('Crítico!');
    await page.keyboard.press('Escape');
    await expect(page.getByText('CAINDO — Testes contra a Morte')).toHaveCount(0);
  });

  test('desligado em Configurações não aparece', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
    await page.goto('/config');
    const chave = page.getByRole('switch', { name: 'Crítico cinematográfico' });
    await expect(chave).toHaveAttribute('aria-checked', 'true');
    await chave.click();
    await page.goto(`/ficha/${ID}`);
    await page.locator('.fv-sheet-tab', { hasText: 'Combate' }).click();
    await dice(page, 0.999);
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('.fv-cine')).toHaveCount(0);
  });
});
