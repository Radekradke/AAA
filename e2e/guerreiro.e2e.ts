import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// guerreiro 10, Mestre de Batalha (Derrubada + Ataque Preciso)
const HERO = {
  ...WIZARD, id: 'gw10', name: 'Ser Aldo', raceId: 'human', subraceId: null, classId: 'fighter', level: 10,
  classLevels: [{ classId: 'fighter', level: 10 }], subclassId: 'battlemaster',
  baseAbilities: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
  choices: { 'fighter.fightingStyle': ['defense'], 'fighter.maneuver': ['trip', 'precision', 'parry'] },
  knownSpells: [], preparedSpells: [], hpCurrent: 20, levelHistory: [],
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0 },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const hp = async (page: Page) => Number((await page.locator('.fv-hp-num').first().innerText()).match(/\d+/)?.[0]);

test.describe('guerreiro: Fôlego, Surto, Indomável e manobras', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/gw10');
    await page.evaluate(() => { Math.random = () => 0.5; });
  });

  test('Retomar o Fôlego cura 1d10 + nível; Surto de Ação gasta o uso; Indomável rola de novo a última salvaguarda', async ({ page }) => {
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Guerreiro' });
    await panel.getByRole('button', { name: /Retomar o Fôlego/ }).click();
    await expect.poll(() => hp(page)).toBe(20 + 6 + 10);
    await expect(panel.getByRole('button', { name: /Retomar o Fôlego/ })).toBeDisabled();

    await panel.getByRole('button', { name: /Surto de Ação/ }).click();
    await expect(page.getByText('Surto de Ação: você tem mais uma ação neste turno.')).toBeVisible();
    await expect(panel.getByRole('button', { name: /Surto de Ação/ })).toContainText('0/1');

    // Indomável: precisa de uma salvaguarda antes
    await expect(panel.getByRole('button', { name: /Indomável/ })).toContainText('faça uma salvaguarda primeiro');
    await tab(page, 'Ficha');
    await page.getByText(/^RESIST /).first().click();
    await tab(page, 'Combate');
    await expect(panel.getByRole('button', { name: /Indomável/ })).toContainText('rolar de novo: Resist. de Força');
    await panel.getByRole('button', { name: /Indomável/ }).click();
    await expect(panel.getByRole('button', { name: /Indomável/ })).toContainText('0/1');
  });

  test('manobra no dano gasta 1 dado de superioridade e avisa a CD', async ({ page }) => {
    await tab(page, 'Combate');
    await page.getByRole('button', { name: /CONCUSSÃO|CORTANTE|PERFURANTE/ }).first().click();
    const dlg = page.getByRole('dialog', { name: /Dano de/ });
    await expect(dlg).toContainText('Manobra · gasta 1 dado de superioridade (+1d10) · CD 15 · 5/5 dados');
    await dlg.getByRole('button', { name: /Ataque de Derrubada \+1d10/ }).click();
    await dlg.getByRole('button', { name: /Rolar dano/ }).click();
    await expect(page.getByText(/Ataque de Derrubada: salvaguarda de FOR CD 15 ou o alvo \(Grande ou menor\) cai/)).toBeVisible();
    await page.getByRole('button', { name: /CONCUSSÃO|CORTANTE|PERFURANTE/ }).first().click();
    await expect(page.getByRole('dialog', { name: /Dano de/ })).toContainText('4/5 dados');
  });
});
