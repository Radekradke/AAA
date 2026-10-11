import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// ladino 11, Ladrão: Ação Ardilosa, Esquiva Sobrenatural, Evasão, Talento Confiável
const HERO = {
  ...WIZARD, id: 'lad11', name: 'Vex', raceId: 'human', subraceId: null, classId: 'rogue', level: 11,
  classLevels: [{ classId: 'rogue', level: 11 }], subclassId: 'thief',
  baseAbilities: { str: 10, dex: 16, con: 14, int: 12, wis: 12, cha: 10 },
  skillProfs: ['stealth', 'acrobatics', 'perception', 'sleightOfHand'], skillExpertise: [],
  choices: {}, knownSpells: [], preparedSpells: [], hpCurrent: 40, levelHistory: [],
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, moveUsed: 0 },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const hp = async (page: Page) => Number((await page.locator('.fv-hp-num').first().innerText()).match(/\d+/)?.[0]);

test.describe('ladino: Ação Ardilosa, defesas e Talento Confiável', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/lad11');
  });

  test('Disparada dobra o deslocamento e gasta a ação bônus', async ({ page }) => {
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Ladino' });
    await panel.getByRole('button', { name: /^Disparada/ }).click();
    await expect(page.getByText(/de 18 m \(Disparada\)/)).toBeVisible();
    await expect(panel.getByRole('button', { name: /^Desengajar/ })).toBeDisabled();
  });

  test('Esquiva Sobrenatural corta o dano pela metade e gasta a reação; Evasão zera quem passou', async ({ page }) => {
    await tab(page, 'Combate');
    const amount = page.getByLabel('Valor de dano ou cura');
    await amount.fill('21');
    await page.getByRole('button', { name: /Esquiva Sobrenatural: metade/ }).click();
    await page.getByRole('button', { name: 'Aplicar dano' }).click();
    await expect.poll(() => hp(page)).toBe(40 - 10);
    await expect(page.getByRole('button', { name: /Esquiva Sobrenatural.*reação já usada/ })).toBeDisabled();

    await amount.fill('21');
    await page.getByRole('button', { name: /Evasão: passei na DES/ }).click();
    await page.getByRole('button', { name: 'Aplicar dano' }).click();
    await expect(page.getByText(/Evasão \(passou: nenhum dano\): 21 → 0/)).toBeVisible();
    expect(await hp(page)).toBe(30);
  });

  test('Talento Confiável: um 1 no d20 de perícia treinada conta como 10', async ({ page }) => {
    await page.evaluate(() => { Math.random = () => 0; });
    await tab(page, 'Combate');
    await page.getByRole('region', { name: 'Ladino' }).getByRole('button', { name: /^Esconder/ }).click();
    await expect(page.locator('body')).toContainText('Talento Confiável (d20 1 → 10)');
  });
});
