import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);

/**
 * DADO FÍSICO: o jogador rola na mesa e digita o que tirou; a ficha soma os
 * bônus e segue as regras (vantagem, crítico, teste contra a morte).
 */
async function openCombat(page: Page) {
  const tab = page.locator('.fv-sheet-tab', { hasText: 'Combate' });
  if (await tab.isVisible()) return tab.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Combate', exact: true }).click();
}

/** Liga o dado físico pelo seletor de vantagem (e escolhe o modo, se pedido). */
async function physical(page: Page, mode?: 'Vantagem' | 'Desvantagem' | 'Normal') {
  await page.getByRole('button', { name: /Modo de rolagem/ }).click();
  const sw = page.getByRole('switch', { name: 'Dado físico' });
  if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  if (mode) await page.getByRole('radio', { name: new RegExp(mode) }).click();
  else await page.keyboard.press('Escape');
}

const prompt = (page: Page) => page.getByRole('dialog', { name: /dado físico|Rolar de novo/ });
const panel = (page: Page) => page.locator('.fv-roll-panel');

test.describe('dado físico', () => {
  test('ataque: toca o número do d20, a ficha soma o bônus e segue para o dano @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await openCombat(page);
    await physical(page);
    await expect(page.getByRole('button', { name: /Modo de rolagem: Normal, dado físico/ })).toBeVisible();

    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    const p = prompt(page);
    await expect(p).toContainText('1d20');
    await p.getByRole('group', { name: /Teclado do d20/ }).getByRole('button', { name: '13', exact: true }).click();
    await expect(p).toHaveCount(0);
    // o painel mostra o 13 que saiu na mesa e o total com o bônus da ficha
    await expect(panel(page)).toContainText('[13]');
    await expect(panel(page)).toContainText('dado físico');
    const detail = await panel(page).innerText();
    const bonus = Number(/1d20 ([+-]\d+)/.exec(detail)?.[1] ?? 0);
    await expect(panel(page)).toContainText(String(13 + bonus));

    // acertou → o dano também vem da mesa
    await page.getByRole('button', { name: 'Fechar resultado' }).click();
    await page.getByRole('button', { name: /Acertou — dano/ }).click();
    // o Bordão é versátil: escolhe as opções do dano antes de rolar
    await page.getByRole('dialog', { name: /Dano de/ }).getByRole('button', { name: /^Rolar dano/ }).click();
    const dmgPrompt = prompt(page);
    await expect(dmgPrompt).toBeVisible();
    await dmgPrompt.locator('input').first().fill('4');
    await dmgPrompt.getByRole('button', { name: /^Somar/ }).click();
    await expect(dmgPrompt).toHaveCount(0);
    await expect(panel(page)).toContainText('dado físico');
  });

  test('vantagem: digita os dois d20 e vale o maior; desistir não rola nada', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await openCombat(page);
    await physical(page, 'Vantagem');

    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    const p = prompt(page);
    await expect(p).toContainText('vantagem: role dois d20, vale o maior');
    const pad = p.getByRole('group', { name: /Teclado do 2d20/ });
    await pad.getByRole('button', { name: '4', exact: true }).click();
    await expect(p).toBeVisible(); // falta o segundo d20
    await pad.getByRole('button', { name: '16', exact: true }).click();
    await expect(p).toHaveCount(0);
    await expect(panel(page)).toContainText('[4, 16]');

    // abre de novo e desiste: nada de rolagem nova
    await page.getByRole('button', { name: 'Fechar resultado' }).click();
    await page.getByRole('button', { name: 'Errou', exact: true }).click();
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    await expect(prompt(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(prompt(page)).toHaveCount(0);
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /acertou\?/ })).toHaveCount(0);
  });

  test('no PC dá para digitar o número e apertar Enter; "Rolar no app" sorteia só desta vez', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await openCombat(page);
    await physical(page);

    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    const input = prompt(page).locator('input').first();
    await expect(input).toBeFocused();
    await input.fill('17');
    await input.press('Enter');
    await expect(panel(page)).toContainText('[17]');
    await page.getByRole('button', { name: 'Fechar resultado' }).click();
    await page.getByRole('button', { name: 'Errou', exact: true }).click();

    await page.evaluate(() => { Math.random = () => 0.5; });
    await page.getByRole('button', { name: /ACERTO/ }).first().click();
    await prompt(page).getByRole('button', { name: 'Rolar no app' }).click();
    await expect(panel(page)).toContainText('[11]');
    await expect(panel(page)).not.toContainText('dado físico');
  });

  test('teste contra a morte: o 20 da mesa levanta o herói @celular', async ({ page }) => {
    const dying = { ...WIZARD, hpCurrent: 0, combat: { ...(WIZARD.combat as object), deathSaves: { success: 0, fail: 2 }, conditions: ['Inconsciente'] } };
    await signIn(page, 'guest', { characters: [dying], ui: { dice3d: false, physicalDice: true } });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText('CAINDO — Testes contra a Morte')).toBeVisible();
    await page.getByRole('button', { name: 'Rolar teste' }).click();
    await prompt(page).getByRole('group', { name: /Teclado do d20/ }).getByRole('button', { name: '20', exact: true }).click();
    const cine = page.locator('.fv-cine');
    await expect(cine).toBeVisible();
    await cine.click();
    await expect(page.getByText('CAINDO — Testes contra a Morte')).toHaveCount(0);
  });
});
