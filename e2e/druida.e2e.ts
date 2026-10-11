import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const base = (id: string, level: number, subclassId: string, slots: Record<number, { max: number; used: number }>) => ({
  ...WIZARD, id, name: 'Seren', raceId: 'human', subraceId: null, classId: 'druid', level, subclassId,
  classLevels: [{ classId: 'druid', level }], baseAbilities: { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 8 },
  choices: {}, knownSpells: [], preparedSpells: [], hpCurrent: 40, levelHistory: [], inventory: [],
  equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: slots },
});
const MOON = base('dr6', 6, 'moon', { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 3, used: 0 } });
const LAND = base('dr5', 5, 'land', { 1: { max: 4, used: 2 }, 2: { max: 3, used: 1 }, 3: { max: 2, used: 1 } });

async function open(page: Page, hero: { id: string }) {
  await signIn(page, 'guest', { characters: [hero], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto(`/ficha/${hero.id}`);
  await page.evaluate(() => { Math.random = () => 0.5; });
  await page.locator('.fv-sheet-tab', { hasText: 'Combate' }).click();
}

test.describe('druida na mesa', () => {
  test('Círculo da Lua: vira Urso-pardo (ação bônus), ataca com os números da fera e volta', async ({ page }) => {
    await open(page, MOON);
    const panel = page.getByRole('region', { name: 'Druida' });
    await expect(panel).toContainText('Forma Selvagem 2/2');
    await expect(panel).toContainText('ND até 2');
    await panel.getByLabel('Fera da Forma Selvagem').selectOption('brownBear');
    await panel.getByRole('button', { name: /^Transformar/ }).click();
    await expect(panel).toContainText('Forma Selvagem 1/2');
    await expect(panel.getByLabel('PV da forma')).toContainText('34/34');
    await expect(panel).toContainText('mágico (Golpes Primais)');
    await panel.getByRole('button', { name: 'Ataque: Urso-pardo · Mordida' }).click();
    await expect(page.getByText(/Ataque · Urso-pardo · Mordida/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Novo turno' }).click();
    await panel.getByRole('button', { name: /^Voltar à forma normal/ }).click();
    await expect(panel.getByLabel('PV da forma')).toHaveCount(0);
    await expect(panel.getByLabel('Fera da Forma Selvagem')).toBeVisible();
  });

  test('Círculo da Terra: Recuperação Natural devolve espaços até metade do nível', async ({ page }) => {
    await open(page, LAND);
    const panel = page.getByRole('region', { name: 'Druida' });
    await panel.getByRole('button', { name: 'Mais um espaço de 3º' }).click();
    await panel.getByRole('button', { name: /^Recuperar espaços/ }).click();
    await expect(page.getByText('Recuperação Natural: espaços de volta.')).toBeVisible();
    await expect(panel.getByRole('button', { name: /^Recuperar espaços/ })).toHaveCount(0);
  });
});
