import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const mage = (id: string, level: number, subclassId: string, extra: Record<string, unknown> = {}) => ({
  ...WIZARD, id, level, subclassId, classLevels: [{ classId: 'wizard', level }], levelHistory: [], hpCurrent: 40,
  knownSpells: [...(WIZARD.knownSpells as string[]), 'sp-bolafogo'],
  preparedSpells: [...(WIZARD.preparedSpells as string[]), 'sp-bolafogo'],
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: { 1: { max: 4, used: 3 } } },
  ...extra,
});
const EVOKER = mage('wz14', 14, 'evocation');
const DIVINER = mage('wz2', 2, 'divination');
const ABJURER = mage('wz6', 6, 'abjuration');

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
async function open(page: Page, hero: { id: string }) {
  await signIn(page, 'guest', { characters: [hero], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto(`/ficha/${hero.id}`);
  await page.evaluate(() => { Math.random = () => 0.5; });
}

test.describe('mago na mesa', () => {
  test('Evocador: Recuperação Arcana devolve espaços; Sobrecarga deixa a Bola de Fogo no máximo (+INT da Evocação Poderosa)', async ({ page }) => {
    await open(page, EVOKER);
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Mago' });
    await expect(panel).toContainText('Recuperação Arcana 1/1');
    await panel.getByRole('button', { name: 'Mais um espaço de 1º' }).click();
    await panel.getByRole('button', { name: 'Mais um espaço de 1º' }).click();
    await panel.getByRole('button', { name: /^Recuperar espaços/ }).click();
    await expect(page.getByText('Recuperação Arcana: 2× 1º de volta.')).toBeVisible();
    await expect(panel).toContainText('Recuperação Arcana 0/1');

    await panel.getByRole('button', { name: /^Sobrecarga/ }).click();
    await expect(panel.getByRole('button', { name: /^Sobrecarga ligada/ })).toBeVisible();
    await tab(page, 'Jogar');
    const row = page.locator('.fv-mesa-spell', { hasText: 'Bola de Fogo' });
    await row.getByRole('button', { name: /Conjurar/ }).click();
    await row.getByRole('menuitem', { name: /^3º círculo/ }).click();
    // 8d6 no máximo (48) + INT 2
    await expect(page.locator('.fv-castnote', { hasText: 'Bola de Fogo' })).toContainText('50 de dano fogo');
  });

  test('Adivinhador: Portento rola 2 d20 e cada um some ao ser usado', async ({ page }) => {
    await open(page, DIVINER);
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Mago' });
    await panel.getByRole('button', { name: /^Rolar Portento/ }).click();
    await expect(panel.getByRole('button', { name: /^Portento 11/ })).toHaveCount(2);
    await panel.getByRole('button', { name: /^Portento 11/ }).first().click();
    await expect(panel.getByRole('button', { name: /^Portento 11/ })).toHaveCount(1);
  });

  test('Abjurador: Escudo Arcano ergue a Barreira Arcana (2 × nível + INT)', async ({ page }) => {
    await open(page, ABJURER);
    const row = page.locator('.fv-mesa-spell', { hasText: 'Escudo Arcano' });
    await row.getByRole('button', { name: /Conjurar/ }).click();
    const one = row.getByRole('menuitem', { name: /^1º círculo/ });
    if (await one.isVisible()) await one.click();
    await tab(page, 'Combate');
    await expect(page.getByRole('region', { name: 'Mago' }).getByRole('button', { name: /^Barreira Arcana 14\/14/ })).toBeVisible();
  });
});
