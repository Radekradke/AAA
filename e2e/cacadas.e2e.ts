import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { C, P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

const ID = String(WIZARD.id);
const at = (d: number) => `2026-09-${String(d).padStart(2, '0')}T20:00:00.000Z`;
const hunts = { goblin: { n: 4, first: at(1), last: at(9) }, wolf: { n: 12, first: at(2), last: at(10) } };

async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: new RegExp(mobile) }).click();
}

test.describe('bestiário de caçadas', () => {
  test('cada criatura abatida vira carta; quanto mais abates, mais o herói sabe @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [{ ...WIZARD, deeds: { counts: { kills: 16 }, unlocked: {}, hunts } }] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await tab(page, 'Retrato', 'Retrato');
    await page.getByRole('tab', { name: /Suas cartas/ }).click();
    const colecao = page.getByRole('region', { name: 'Suas cartas' });
    await expect(colecao.getByRole('heading', { name: 'Suas cartas · 3' })).toBeVisible();

    // filtro das caçadas: a mais caçada primeiro
    await colecao.getByRole('radio', { name: 'Caçadas' }).click();
    await expect(colecao.locator('.fv-cc-cap b')).toHaveText(['Lobo', 'Goblin']);

    // Goblin ×4: já sabe CA e PV; pontos fracos ainda trancados
    await colecao.getByRole('button', { name: 'Ver a carta Goblin em tela cheia' }).click();
    const carta = page.getByRole('dialog', { name: 'Carta: Goblin' });
    const lore = carta.getByRole('region', { name: 'Bestiário de caçadas: Goblin' });
    await expect(lore).toContainText('Presa conhecida');
    await expect(lore.locator('.fv-hunt-row').filter({ has: page.locator('dt', { hasText: /^CA$/ }) })).toContainText('15 (armadura de couro');
    await expect(lore).toContainText('Pontos fracos — com 5 abates');
    await expect(lore.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

    // Lobo ×12: já sabe como ele luta
    await page.keyboard.press('ArrowLeft');
    const lobo = page.getByRole('dialog', { name: 'Carta: Lobo' }).getByRole('region', { name: 'Bestiário de caçadas: Lobo' });
    await expect(lobo).toContainText('Especialidade');
    await expect(lobo.locator('.fv-hunt-row').filter({ has: page.locator('dt', { hasText: /^Mordida$/ }) })).toContainText('+4 para acertar');
    await expect(lobo).toContainText('Ficha inteira — com 25 abates');
  });

  test('na mesa, o jogador vê o que o herói já sabe do inimigo', async ({ page }) => {
    await signIn(page, 'player', { characters: [{ ...WIZARD, id: 'k', name: 'Kael Venturo', ownerId: P, updatedAt: Date.now(), deeds: { counts: {}, unlocked: {}, hunts } }] });
    await installSupabase(page, 'player');
    await page.goto(`/mesa/${C}/jogar`);
    const goblin = page.locator('.fv-live-row', { hasText: 'Goblin #1' });
    await expect(goblin.locator('.fv-live-row-stats')).toContainText('CA 15');
    await goblin.getByRole('button', { name: /×4/ }).click();
    await expect(goblin.getByRole('region', { name: 'Bestiário de caçadas: Goblin #1' })).toContainText('Presa conhecida');
  });
});
