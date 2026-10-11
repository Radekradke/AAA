import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const base = (id: string, classId: string, level: number, subclassId: string, extra: Record<string, unknown>) => ({
  ...WIZARD, id, raceId: 'human', subraceId: null, classId, level, subclassId,
  classLevels: [{ classId, level }], choices: {}, levelHistory: [], inventory: [],
  equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: {} },
  ...extra,
});
// clériga da Vida 10, ferida, com Curar Ferimentos preparada
const CLERIC = base('cl10', 'cleric', 10, 'life', {
  name: 'Irmã Odila', baseAbilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
  knownSpells: ['sp-curar'], preparedSpells: ['sp-curar'], hpCurrent: 20,
});
// bardo do Conhecimento 14
const BARD = base('bd14', 'bard', 14, 'lore', {
  name: 'Lírio', baseAbilities: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
  knownSpells: [], preparedSpells: [], hpCurrent: 60,
});

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
async function open(page: Page, hero: { id: string }) {
  await signIn(page, 'guest', { characters: [hero], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto(`/ficha/${hero.id}`);
  await page.evaluate(() => { Math.random = () => 0.5; });
}

test.describe('clérigo e bardo na mesa', () => {
  test('Clérigo da Vida: Canalizar gasta o uso, Preservar a Vida cura até a metade, Discípulo da Vida soma na cura', async ({ page }) => {
    await open(page, CLERIC);
    // Curar Ferimentos 1º: 1d8 (5) + SAB 3 + Discípulo da Vida (2 + 1) = 11
    const row = page.locator('.fv-mesa-spell').filter({ has: page.getByText('Curar Ferimentos', { exact: true }) }).first();
    await row.getByRole('button', { name: /Conjurar/ }).click();
    await row.getByRole('menuitem', { name: /^1º círculo/ }).click();
    const note = page.locator('.fv-castnote', { hasText: 'Curar Ferimentos' });
    await expect(note).toContainText('Cura rolada: 11 PV');
    await expect(note).toContainText('Curandeiro Abençoado');

    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Clérigo' });
    await expect(panel).toContainText('Canalizar Divindade 2/2');
    await expect(panel).toContainText('Destruir Mortos-Vivos: ND 1');
    // o Curar Ferimentos gastou a ação deste turno
    await page.getByRole('button', { name: 'Novo turno' }).click();
    await panel.getByRole('button', { name: /^Preservar a Vida/ }).click();
    await expect(panel).toContainText('Canalizar Divindade 1/2');
    await expect(page.getByText(/Preservar a Vida: 50 PV/)).toBeVisible();

    // Intervenção Divina: d100 = 51 > 10, sem resposta
    await page.getByRole('button', { name: 'Novo turno' }).click();
    await panel.getByRole('button', { name: /^Intervenção Divina/ }).click();
    await expect(page.getByText(/Intervenção Divina: 51 > 10/)).toBeVisible();
    await expect(panel.getByRole('button', { name: /^Intervenção Divina/ })).toBeDisabled();
  });

  test('Bardo do Conhecimento: dar Inspiração gasta o dado; Palavras Cortantes rola d10', async ({ page }) => {
    await open(page, BARD);
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Bardo' });
    await expect(panel).toContainText('Inspiração de Bardo 3/3');
    await expect(panel).toContainText('1d10 · volta no descanso curto');
    await panel.getByRole('button', { name: /^Dar Inspiração/ }).click();
    await expect(panel).toContainText('Inspiração de Bardo 2/3');
    await panel.getByRole('button', { name: /^Palavras Cortantes/ }).click();
    await expect(page.getByText('Palavras Cortantes: −6 na jogada da criatura.')).toBeVisible();
    await expect(panel).toContainText('Inspiração de Bardo 1/3');
    await expect(panel.getByRole('button', { name: /^Canção de Descanso/ })).toContainText('1d10');
  });
});
