import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// bruxo 20 do Corruptor, com os 4 espaços de pacto gastos
const HERO = {
  ...WIZARD, id: 'wl20', name: 'Morrigan', raceId: 'human', subraceId: null, classId: 'warlock', level: 20,
  classLevels: [{ classId: 'warlock', level: 20 }], subclassId: 'fiend',
  baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
  choices: { 'warlock.pact': ['chain'] }, knownSpells: [], preparedSpells: [], hpCurrent: 60, levelHistory: [],
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: { 5: { max: 4, used: 4 } } },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}

test.describe('bruxo: pacto e patrono', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/wl20');
    await page.evaluate(() => { Math.random = () => 0.5; });
    await tab(page, 'Combate');
  });

  test('Mestre Místico devolve os espaços de pacto; Bênção do Tinhoso dá PV temporários', async ({ page }) => {
    const panel = page.getByRole('region', { name: 'Bruxo' });
    await expect(panel).toContainText('Magia de Pacto 0/4');
    await panel.getByRole('button', { name: /^Mestre Místico/ }).click();
    await expect(panel).toContainText('Magia de Pacto 4/4');
    await expect(panel.getByRole('button', { name: /^Mestre Místico/ })).toBeDisabled();
    await panel.getByRole('button', { name: /^Bênção do Tinhoso/ }).click();
    await expect(page.getByText('Bênção do Tinhoso: 23 PV temporários.')).toBeVisible();
  });

  test('Resiliência Infernal: o tipo escolhido vira resistência na ficha', async ({ page }) => {
    await page.getByLabel('Tipo de dano da Resiliência Infernal').selectOption('fogo');
    await tab(page, 'Ficha');
    await expect(page.locator('body')).toContainText(/fogo \(não mágico/);
  });
});
