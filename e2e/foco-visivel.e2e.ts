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
