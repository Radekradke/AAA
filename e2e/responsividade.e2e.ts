import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { WIZARD, signIn } from './fixtures/supabase';

/**
 * A ficha precisa continuar jogável do celular pequeno ao monitor largo,
 * em pé e deitado: nada de rolagem lateral, conteúdo da ficha visível na
 * primeira tela (o cabeçalho não pode engolir tudo) e o botão de avançar
 * da criação sempre à vista.
 */
const ID = String(WIZARD.id);
const SIZES = [
  { name: 'celular pequeno', w: 320, h: 568, touch: true },
  { name: 'celular deitado', w: 844, h: 390, touch: true },
  { name: 'celular pequeno deitado', w: 667, h: 375, touch: true },
  { name: 'tablet em pé', w: 768, h: 1024, touch: true },
  { name: 'monitor largo', w: 2560, h: 1080, touch: false },
];

async function openTab(page: Page, label: string) {
  const inv = label === 'Itens' ? page.locator('.fv-sheet-tab', { hasText: 'Inventário' }) : null;
  if (inv && (await inv.isVisible())) return inv.click();
  const top = page.locator('.fv-sheet-tab', { hasText: label });
  if (await top.isVisible()) return top.click();
  const nav = page.getByRole('navigation', { name: 'Abas da ficha' });
  const direct = nav.getByRole('button', { name: label, exact: true });
  if (await direct.count()) return direct.click();
  await nav.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: new RegExp(label) }).click();
}

const overflow = (page: Page) =>
  page.evaluate(() => {
    const sc = document.querySelector('.fv-screen-scroll') as HTMLElement | null;
    const doc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return Math.max(doc, sc ? sc.scrollWidth - sc.clientWidth : 0);
  });

for (const s of SIZES) {
  test.describe(`responsividade: ${s.name} (${s.w}×${s.h})`, () => {
    test.use({ viewport: { width: s.w, height: s.h }, isMobile: s.touch && s.w < 1000, hasTouch: s.touch });

    test('ficha: sem rolagem lateral em nenhuma aba e conteúdo visível na primeira tela', async ({ page }) => {
      await signIn(page, 'guest', { characters: [WIZARD] });
      await page.goto(`/ficha/${ID}`);
      await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
      for (const t of ['Ficha', 'Combate', 'Itens', 'Magias', 'Retrato', 'Mesa']) {
        await openTab(page, t);
        await page.locator('.fv-screen-scroll').evaluate((el) => el.scrollTo(0, 0));
        expect(await overflow(page), `rolagem lateral na aba ${t}`).toBeLessThanOrEqual(1);
      }
      // o primeiro bloco depois do cabeçalho/abas começa antes de 60% da altura
      await openTab(page, 'Ficha');
      await page.locator('.fv-screen-scroll').evaluate((el) => el.scrollTo(0, 0));
      const top = await page.evaluate(() => {
        const panels = [...document.querySelectorAll('.fv-screen-scroll .fv-panel')].filter((p) => !p.classList.contains('fv-sheet-head') && !p.closest('.fv-sheet-tabs'));
        return panels[0]?.getBoundingClientRect().top ?? Infinity;
      });
      expect(top).toBeLessThan(s.h * 0.6);
    });

    test('criação: o botão de avançar fica à vista', async ({ page }) => {
      await signIn(page, 'guest', { characters: [WIZARD] });
      await page.goto('/criar');
      const next = page.getByRole('button', { name: /Avançar/ });
      await expect(next).toBeInViewport();
      expect(await overflow(page)).toBeLessThanOrEqual(1);
    });
  });
}
