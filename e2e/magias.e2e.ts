import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { WIZARD, signIn } from './fixtures/supabase';

/**
 * Conjurar de verdade, na aba Jogar: efeito automático (Escudo: +5 CA), dano
 * na hora (Bola de Fogo: 8d6) e dano que vem depois (Nuvem de Adagas: não
 * rola ao conjurar; o efeito ativo traz o botão de rolar 4d4).
 */
const MAGO = {
  ...WIZARD,
  knownSpells: [...(WIZARD.knownSpells as string[]), 'sp-bolafogo', 'phb-cloud-daggers'],
  preparedSpells: [...(WIZARD.preparedSpells as string[]), 'sp-bolafogo', 'phb-cloud-daggers'],
};

async function cast(page: Page, name: string, circle?: string) {
  const row = page.locator('.fv-mesa-spell', { hasText: name });
  await row.getByRole('button', { name: /Conjurar/ }).click();
  // com um círculo só possível, a ficha conjura direto (sem menu)
  if (circle) await row.getByRole('menuitem', { name: new RegExp(`^${circle}`) }).click();
}

test.describe('magias na mesa', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [MAGO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${WIZARD.id}`);
    await expect(page.locator('.fv-mesa-spell').first()).toBeVisible();
  });

  test('Escudo: a CA sobe +5 sozinha e o efeito aparece', async ({ page }) => {
    const ca = page.locator('.fv-stat-chip', { hasText: 'CA' }).locator('.fv-stat-chip-val');
    const before = Number(await ca.textContent());
    await cast(page, 'Escudo', '1º círculo');
    await expect(ca).toHaveText(String(before + 5));
    await expect(page.locator('.fv-spell-effect', { hasText: 'Escudo' })).toBeVisible();
  });

  test('Bola de Fogo: rola 8d6 ao conjurar', async ({ page }) => {
    await cast(page, 'Bola de Fogo');
    await expect(page.locator('.fv-castnote', { hasText: 'Bola de Fogo' })).toBeVisible();
    await expect(page.getByText(/Bola de Fogo · fogo/).first()).toBeVisible();
  });

  test('Nuvem de Adagas: não rola ao conjurar; o efeito traz o botão de rolar 4d4', async ({ page }) => {
    await cast(page, 'Nuvem de Adagas', '2º círculo');
    const note = page.locator('.fv-castnote', { hasText: 'Nuvem de Adagas' });
    await expect(note).toContainText('quando alguém entra');
    await expect(page.getByText(/Nuvem de Adagas · cortante/)).toHaveCount(0);
    const effect = page.locator('.fv-spell-effect', { hasText: 'Nuvem de Adagas' });
    await expect(effect).toBeVisible();
    await effect.getByRole('button', { name: /Rolar 4d4/ }).click();
    await expect(page.getByText(/Nuvem de Adagas · cortante/).first()).toBeVisible();
  });
});
