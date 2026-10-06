import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const dice = (page: Page, v: number) => page.evaluate((x) => { Math.random = () => x; }, v);

async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: new RegExp(mobile) }).click();
}

test.describe('dados conquistados', () => {
  test('o herói escolhe o dado ganho num feito e rola com ele @celular', async ({ page }) => {
    const hero = { ...WIZARD, deeds: { counts: { kills: 1, dragons: 1 }, unlocked: {} } };
    await signIn(page, 'guest', { characters: [hero], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await tab(page, 'Retrato', 'Retrato');

    const dados = page.getByRole('radiogroup', { name: 'Dado do herói' });
    // nível 5 → Bordão do Errante; golpe final num dragão → Escamas de Dragão
    await expect(dados.getByRole('radio')).toHaveText(['20Do tema', '20Bordão do Errante', '20Escamas de Dragão']);
    await page.getByText('Dados por conquistar · 8').click();
    await expect(page.locator('.fv-dicepick-locked')).toContainText('Tire 20 natural num teste contra a morte.');
    await dados.getByRole('radio', { name: /Escamas de Dragão/ }).click();
    await expect(dados.getByRole('radio', { name: /Escamas de Dragão/ })).toHaveAttribute('aria-checked', 'true');

    // a rolagem da ficha usa o dado conquistado (2D: corpo vermelho-dragão)
    const combate = page.locator('.fv-sheet-tab', { hasText: 'Combate' });
    if (await combate.isVisible()) await combate.click();
    else await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Combate', exact: true }).click();
    await dice(page, 0.5);
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    await expect(page.locator('.fv-die2d')).toHaveCSS('background-image', /rgb\(210, 58, 34\)/);
  });
});
