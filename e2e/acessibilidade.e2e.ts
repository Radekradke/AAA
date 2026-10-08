import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/test';
import { C, WIZARD, installSupabase, signIn } from './fixtures/supabase';
import type { Page } from '@playwright/test';

/** Regras WCAG 2.1 A/AA; contraste tem auditoria própria (todas as cores dos 16 modos). */
async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules(['color-contrast']).analyze();
  return r.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

test.describe('acessibilidade (axe, WCAG 2.1 AA)', () => {
  const telas: [string, 'guest' | 'master', string][] = [
    ['início', 'guest', '/'],
    ['heróis', 'guest', '/personagens'],
    ['criação', 'guest', '/criar'],
    ['ficha', 'guest', `/ficha/${WIZARD.id}`],
    ['imprimir', 'guest', `/ficha/${WIZARD.id}/imprimir`],
    ['configurações', 'guest', '/config'],
    ['mesas', 'master', '/mesas'],
    ['sala da campanha', 'master', `/mesa/${C}`],
    ['console do mestre', 'master', `/mesa/${C}/jogar`],
  ];
  for (const [nome, who, path] of telas) {
    test(nome, async ({ page }) => {
      await signIn(page, who, { characters: [WIZARD] });
      if (who !== 'guest') await installSupabase(page, who);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await axe(page)).toEqual([]);
    });
  }

  test('todas as abas da ficha', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${WIZARD.id}`);
    for (const aba of ['Mesa', 'Combate', 'Inventário', 'Magias', 'Retrato', 'Evoluir', 'Descanso', 'Diário', 'Dados']) {
      await page.locator('.fv-sheet-tab', { hasText: aba }).click();
      await expect(page.locator('.fv-sheet-tab', { hasText: aba })).toHaveAttribute('aria-current', 'page');
      expect(await axe(page), `aba ${aba}`).toEqual([]);
    }
  });
});

test.describe('teclado', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${WIZARD.id}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
  });

  test('pular para o conteúdo é o primeiro Tab', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#fv-conteudo')).toBeFocused();
  });

  test('menu: setas andam, Esc fecha e devolve o foco', async ({ page }) => {
    const more = page.getByRole('button', { name: 'Mais opções' });
    await more.focus();
    await page.keyboard.press('Enter');
    const items = page.getByRole('menuitem');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(more).toBeFocused();
  });

  test('modal: foco entra, fica preso no Tab e volta ao fechar', async ({ page }) => {
    const more = page.getByRole('button', { name: 'Mais opções' });
    await more.click();
    await page.getByRole('menuitem', { name: 'Histórico e versões' }).click();
    const dialog = page.getByRole('dialog', { name: 'Histórico da ficha' });
    await expect(dialog).toBeFocused();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
  });

  test('confirmação por cima do modal: Esc fecha só a de cima', async ({ page }) => {
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('menuitem', { name: 'Histórico e versões' }).click();
    const dialog = page.getByRole('dialog', { name: 'Histórico da ficha' });
    await dialog.getByRole('button', { name: 'Guardar versão agora' }).click();
    // a versão guardada é igual à atual: muda a ficha para poder restaurar
    await page.keyboard.press('Escape');
    await page.locator('.fv-sheet-tab', { hasText: 'Mesa' }).click();
    await page.getByRole('button', { name: '−1' }).first().click();
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('menuitem', { name: 'Histórico e versões' }).click();
    const restore = dialog.getByRole('button', { name: 'Restaurar esta versão' }).first();
    await restore.click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(restore).toBeFocused();
  });
});
