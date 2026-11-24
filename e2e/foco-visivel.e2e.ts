import { test, expect } from './fixtures/test';
import { WIZARD, signIn } from './fixtures/supabase';
import type { Locator, Page } from '@playwright/test';

/**
 * Foco visível no teclado (5.1): peças cujo estilo do tema escondia o anel.
 * O foco entra pelo teclado (Tab antes) para valer o :focus-visible.
 */
async function keyboardFocus(page: Page, target: Locator) {
  await page.keyboard.press('Tab');
  await target.focus();
  await expect(target).toBeFocused();
}

async function outline(el: Locator) {
  return el.evaluate((e) => {
    const s = getComputedStyle(e);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
}

test('Véu Astral: o anel de foco aparece nos selos da ficha (a órbita tracejada não esconde)', async ({ page }) => {
  await signIn(page, 'guest', { characters: [WIZARD], ui: { theme: 'astral', onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto(`/ficha/${WIZARD.id}`);
  const chip = page.getByRole('button', { name: /^Rolar Iniciativa/ }).first();
  const before = await outline(chip);
  expect(before.style).toBe('dashed'); // a órbita, sem foco
  await keyboardFocus(page, chip);
  expect(await outline(chip)).toEqual({ style: 'solid', width: 2 });
});

test('Seus heróis: o card ganha anel quando o botão dele recebe o foco', async ({ page }) => {
  await signIn(page, 'guest', { characters: [WIZARD], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/personagens');
  const main = page.locator('.fv-hero-card-main').first();
  const card = page.locator('.fv-hero-card').first();
  expect((await outline(card)).style).toBe('none');
  await keyboardFocus(page, main);
  expect(await outline(card)).toEqual({ style: 'solid', width: 2 });
});

/**
 * Varredura: Tab por toda a aba Jogar (a mais usada na mesa), em cada tema.
 * Cada parada precisa mudar algo visível (anel, sombra, borda, fundo…) no
 * próprio elemento ou num dos 3 de cima (o anel do card de herói fica no card).
 */
for (const theme of ['astral', 'carmesim', 'eclipse', 'rubra']) {
  test(`todas as paradas do Tab na aba Jogar mostram o foco (${theme})`, async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { theme, onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${WIZARD.id}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
    const semAnel: string[] = [];
    let paradas = 0;
    for (let i = 0; i < 250; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const w = window as unknown as { __prev?: { el: Element; id: string; on: string } | null; __seen?: Set<Element> };
        const one = (s: CSSStyleDeclaration) => [s.outlineStyle, s.outlineWidth, s.boxShadow, s.borderColor, s.backgroundColor, s.textDecorationLine, s.color, s.transform].join('/');
        const sig = (e: Element) => {
          let out = '';
          for (let k = 0, x: Element | null = e; k < 4 && x && x !== document.body; k++, x = x.parentElement) out += one(getComputedStyle(x)) + '|';
          return out;
        };
        let prev: { id: string; ring: boolean } | null = null;
        if (w.__prev?.el.isConnected) prev = { id: w.__prev.id, ring: sig(w.__prev.el) !== w.__prev.on };
        const el = document.activeElement;
        if (!el || el === document.body) {
          w.__prev = null;
          return { prev, again: false, body: true };
        }
        w.__seen ??= new Set();
        const again = w.__seen.has(el);
        w.__seen.add(el);
        const id = `${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
        w.__prev = { el, id, on: sig(el) };
        return { prev, again, body: false };
      });
      if (r.prev && !r.prev.ring) semAnel.push(r.prev.id);
      if (r.again) break;
      if (!r.body) paradas++;
    }
    expect(paradas, 'a varredura passou pela aba').toBeGreaterThan(40);
    expect(semAnel, 'paradas do Tab sem foco visível').toEqual([]);
  });
}
