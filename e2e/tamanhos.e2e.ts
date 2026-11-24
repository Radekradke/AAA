import { test, expect } from './fixtures/test';
import { WIZARD, signIn } from './fixtures/supabase';
import type { Page } from '@playwright/test';

/**
 * Tamanhos (5.3): na menor tela comum (320 px), nenhum tema cria rolagem
 * lateral; no toque, nenhum alvo fica abaixo de 24 px (WCAG 2.5.8 AA),
 * contando a área invisível que o mobile.css acrescenta.
 */
const THEMES = ['astral', 'orfeu', 'carmesim', 'eclipse', 'rubra'];
const TABS = ['Jogar', 'Ficha', 'Combate', 'Itens', 'Magias'];

async function openTab(page: Page, tab: string) {
  await page.locator('.fv-mobile-nav button', { hasText: tab }).first().click();
  await expect(page.locator('.fv-mobile-nav button[aria-current="page"]', { hasText: tab })).toBeVisible();
}

async function sideScroll(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.getElementById('fv-conteudo');
    return {
      page: doc.scrollWidth - doc.clientWidth,
      main: main && getComputedStyle(main).overflowX !== 'hidden' ? main.scrollWidth - main.clientWidth : 0,
    };
  });
}

async function tinyTargets(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], input:not([type=hidden]), select, [role=button], [role=switch]'))) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
      let w = r.width;
      let h = r.height;
      const after = getComputedStyle(el, '::after');
      if (after.content !== 'none' && after.position === 'absolute') {
        w = Math.max(w, parseFloat(after.width) || 0);
        h = Math.max(h, parseFloat(after.height) || 0);
      }
      // campo dentro de um <label> maior: tocar no rótulo foca o campo
      const label = el.closest('label');
      if (label) {
        const lr = label.getBoundingClientRect();
        w = Math.max(w, lr.width);
        h = Math.max(h, lr.height);
      }
      if (Math.min(w, h) < 24) out.push(`${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)} ${Math.round(w)}×${Math.round(h)}`);
    }
    return out;
  });
}

test.describe('tamanhos de tela @celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'só no celular');

  for (const theme of THEMES) {
    test(`320 px sem rolagem lateral (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await signIn(page, 'guest', { characters: [WIZARD], ui: { theme, onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
      for (const path of ['/', '/personagens', '/config']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(await sideScroll(page), `${path}`).toEqual({ page: 0, main: 0 });
      }
      await page.goto(`/ficha/${WIZARD.id}`);
      for (const tab of TABS) {
        await openTab(page, tab);
        const s = await sideScroll(page);
        expect(s.page <= 1 && s.main <= 1, `aba ${tab}: ${JSON.stringify(s)}`).toBe(true);
      }
    });
  }

  test('nenhum alvo de toque abaixo de 24 px na ficha', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${WIZARD.id}`);
    for (const tab of TABS) {
      await openTab(page, tab);
      expect(await tinyTargets(page), `aba ${tab}`).toEqual([]);
    }
  });
});
