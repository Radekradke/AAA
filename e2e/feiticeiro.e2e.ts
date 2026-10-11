import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const base = (id: string, level: number, subclassId: string, choices: Record<string, string[]>, slots: Record<number, { max: number; used: number }>) => ({
  ...WIZARD, id, name: 'Vesper', raceId: 'human', subraceId: null, classId: 'sorcerer', level, subclassId,
  classLevels: [{ classId: 'sorcerer', level }], baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
  choices, knownSpells: [], preparedSpells: [], hpCurrent: 40, levelHistory: [], inventory: [],
  equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: slots },
});
// Dracônica (Dragão Vermelho) 6, com 2 espaços de 1º gastos
const DRACONIC = base('so6', 6, 'draconic', { 'sorcerer.dragonAncestor': ['red'], 'sorcerer.metamagic': ['quickened', 'twinned'] }, { 1: { max: 4, used: 2 }, 2: { max: 3, used: 0 }, 3: { max: 3, used: 0 } });
// Magia Selvagem 14
const WILD = base('so14', 14, 'wild', { 'sorcerer.metamagic': ['quickened', 'subtle', 'careful'] }, {});

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
async function open(page: Page, hero: { id: string }) {
  await signIn(page, 'guest', { characters: [hero], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto(`/ficha/${hero.id}`);
  await page.evaluate(() => { Math.random = () => 0.5; });
  await tab(page, 'Combate');
}

test.describe('feiticeiro na mesa', () => {
  test('Fonte de Magia nos dois sentidos, Metamagia gasta pontos e Afinidade Elemental vira resistência', async ({ page }) => {
    await open(page, DRACONIC);
    const panel = page.getByRole('region', { name: 'Feiticeiro' });
    await expect(panel).toContainText('Pontos de Feitiçaria 6/6');

    // 2 pontos → espaço de 1º gasto de volta
    await panel.getByRole('button', { name: /^Pontos → espaço/ }).click();
    await expect(panel).toContainText('Pontos de Feitiçaria 4/6');
    await expect(panel.getByLabel('Círculo da Fonte de Magia')).toContainText('1º círculo (3/4)');

    // espaço de 1º → +1 ponto (ação bônus: novo turno antes)
    await page.getByRole('button', { name: 'Novo turno' }).click();
    await panel.getByRole('button', { name: /^Espaço → pontos/ }).click();
    await expect(panel).toContainText('Pontos de Feitiçaria 5/6');

    await panel.getByRole('button', { name: /^Magia Acelerada/ }).click();
    await expect(panel).toContainText('Pontos de Feitiçaria 3/6');

    await panel.getByRole('button', { name: /^Afinidade Elemental/ }).click();
    await expect(panel).toContainText('Pontos de Feitiçaria 2/6');
    await expect(panel.getByRole('button', { name: /^Resistência a fogo/ })).toBeVisible();
    await tab(page, 'Ficha');
    await expect(page.locator('body')).toContainText('Afinidade Elemental');
  });

  test('Magia Selvagem: Marés do Caos gasta o uso e o Surto (Caos Controlado) rola duas vezes e devolve as Marés', async ({ page }) => {
    await open(page, WILD);
    const panel = page.getByRole('region', { name: 'Feiticeiro' });
    const tides = panel.getByRole('button', { name: /^Marés do Caos/ });
    await tides.click();
    await expect(tides).toBeDisabled();
    await panel.getByRole('button', { name: /^Rolar Surto/ }).click();
    await expect(page.getByText(/Surto de Magia Selvagem escolha um — 51: Um escudo espectral/)).toBeVisible();
    await expect(tides).toBeEnabled();
  });
});
