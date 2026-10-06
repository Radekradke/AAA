import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);
const ARTE = fileURLToPath(new URL('../public/icons/icon-512.png', import.meta.url));

async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: new RegExp(mobile) }).click();
}

const HERO = {
  ...WIZARD,
  deeds: { counts: { kills: 1, dragons: 1 }, unlocked: { 'kill-1': '2026-08-01T20:00:00.000Z', 'dragon-1': '2026-09-01T20:00:00.000Z' } },
  scars: [{ id: 's1', text: 'Garra do dragão no ombro', date: '2026-09-01T21:00:00.000Z', session: 'Sessão 7', by: 'mestre' }],
  sessions: [{ id: 'x1', name: 'Sessão 7', at: '2026-09-01T19:00:00.000Z' }],
};

test.describe('carta do herói: raridade, secretos, títulos e jornada', () => {
  test('título escolhido aparece na carta e no cabeçalho; secretos ficam ocultos; jornada conta a história @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    await tab(page, 'Retrato', 'Retrato');
    const vitrine = page.getByRole('region', { name: 'Retrato do herói' });

    // feitos: raridade visível; secretos como "???"
    await expect(vitrine.locator('.fv-deeds li.is-earned.is-epico')).toContainText('Matador de dragões');
    await expect(vitrine.locator('.fv-deeds li', { hasText: '???' })).toHaveCount(5);
    await expect(vitrine.getByText('Davi contra Golias')).toHaveCount(0);

    // título: escolhe e aparece na carta e no cabeçalho
    await vitrine.getByRole('radio', { name: 'Flagelo dos Dragões' }).click();
    await expect(vitrine.locator('.fv-vitrine-caption')).toContainText('Flagelo dos Dragões');
    await expect(page.locator('.fv-sh-title')).toHaveText('Flagelo dos Dragões');
    await vitrine.getByRole('radio', { name: 'Sem título' }).click();
    await expect(page.locator('.fv-sh-title')).toHaveCount(0);

    // jornada
    const jornada = vitrine.getByRole('list', { name: 'Linha da jornada' });
    await expect(jornada).toContainText('Começa a jornada');
    await expect(jornada).toContainText('Matador de dragões');
    await expect(jornada).toContainText('Garra do dragão no ombro');
    await expect(jornada).toContainText('Sessão 7');
  });

  test('arte do item: miniatura, carta ao lado dos detalhes e relíquia no Retrato', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    await tab(page, 'Inventário', 'Itens');

    const thumb = page.locator('.fv-item-thumb').first();
    await thumb.locator('input[type="file"]').setInputFiles(ARTE);
    await expect(thumb.locator('img')).toBeVisible();

    // passar o mouse no card: detalhes com a carta da arte
    await thumb.hover();
    const tip = page.locator('.fv-lore-tooltip.has-art');
    await expect(tip.locator('.fv-itemcard img')).toBeVisible();
    await page.mouse.move(0, 0);

    await tab(page, 'Retrato', 'Retrato');
    await expect(page.getByRole('region', { name: 'Retrato do herói' }).locator('.fv-relics li')).toContainText(['Bordão']);

    // submenu "Suas cartas": herói + o item com foto (itens sem foto não viram carta)
    await page.getByRole('tab', { name: /Suas cartas/ }).click();
    const colecao = page.getByRole('region', { name: 'Suas cartas' });
    await expect(colecao.getByRole('heading', { name: 'Suas cartas · 2' })).toBeVisible();
    await colecao.getByRole('button', { name: `Ver a carta ${NAME} em tela cheia` }).click();
    await expect(page.getByRole('dialog', { name: `Carta: ${NAME}` })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog', { name: 'Carta: Bordão' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: /^Retrato/ }).click();
    await expect(page.getByRole('region', { name: 'Retrato do herói' })).toBeVisible();
  });
});
