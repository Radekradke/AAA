import { test, expect } from './fixtures/test';
import { installSupabase, signIn, WIZARD } from './fixtures/supabase';
import type { Page } from '@playwright/test';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);

test.describe('busca geral', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
  });

  test('não aparece no menu principal; nas outras telas, sim', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Heróis/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toHaveCount(0);
    await page.goto('/config');
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toBeVisible();
  });

  test('regra abre o resumo ali mesmo; herói leva à ficha; aba leva à aba', async ({ page }) => {
    await page.goto('/personagens');
    await expect(page.getByText(NAME).first()).toBeVisible();
    await page.keyboard.press('Control+k');
    const busca = page.getByRole('dialog', { name: 'Buscar' });
    const campo = busca.getByRole('combobox');
    await campo.fill('bola de fogo');
    await expect(busca.getByRole('option').first()).toContainText('Bola de Fogo');
    await campo.press('Enter');
    await expect(busca.getByRole('heading', { name: 'Bola de Fogo' })).toBeVisible();
    await expect(busca).toContainText('Conjuração');
    await page.keyboard.press('Escape'); // volta à lista
    await expect(busca.getByRole('combobox')).toHaveValue('bola de fogo');
    await page.keyboard.press('Escape'); // fecha
    await expect(busca).toHaveCount(0);

    // sem acento e em minúsculas: acha o herói e abre a ficha
    await page.keyboard.press('/');
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').fill(NAME.split(' ')[0].toLowerCase());
    await page.getByRole('option', { name: new RegExp(NAME) }).click();
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}$`));

    // dentro da ficha, as abas também aparecem
    await expect(page.locator('.fv-sheet-tab', { hasText: 'Mesa' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Buscar (Ctrl+K)' })).toHaveCount(1); // a tela anterior já saiu
    await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').fill('magias');
    await expect(page.getByRole('group', { name: 'Abas desta ficha' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Buscar' }).getByRole('combobox').press('Enter');
    await expect(page.locator('.fv-sheet-tab', { hasText: 'Magias' })).toHaveAttribute('aria-current', 'page');
  });

  test('item com arte: miniatura na lista e a carta ao lado das informações @celular', async ({ page }) => {
    await page.goto('/personagens');
    await expect(page.getByText(NAME).first()).toBeVisible();
    await page.keyboard.press('Control+k');
    const busca = page.getByRole('dialog', { name: 'Buscar' });
    await busca.getByRole('combobox').fill('anel de protecao');
    const opt = busca.getByRole('option', { name: /Anel de Proteção/ });
    await expect(opt.locator('img.fv-search-thumb')).toBeVisible();
    await opt.click();
    await expect(busca.getByRole('heading', { name: 'Anel de Proteção' })).toBeVisible();
    const card = busca.locator('.fv-search-itemdetail .fv-itemcard img');
    await expect(card).toBeVisible();
    await expect.poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(busca).toContainText('Raridade');
    await page.screenshot({ path: test.info().outputPath('busca-item.png') });
  });

  test('jogador: criatura nunca caçada não mostra a ficha @celular', async ({ page }) => {
    const busca = await openGoblin(page);
    await expect(busca.getByRole('heading', { name: 'Goblin' })).toBeVisible();
    await expect(busca).toContainText('A ficha completa fica com o mestre');
    await expect(busca.getByRole('region', { name: 'Bestiário de caçadas: Goblin' })).toContainText('Nunca abatida');
    await expect(busca).not.toContainText('Cimitarra');
    await expect(busca).not.toContainText('armadura de couro');
  });
});

/** Abre a busca, procura "goblin" e entra no resumo da criatura. */
async function openGoblin(page: Page) {
  await page.goto('/personagens');
  await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
  const busca = page.getByRole('dialog', { name: 'Buscar' });
  await busca.getByRole('combobox').fill('goblin');
  await busca.getByRole('option', { name: /Goblin/ }).first().click();
  return busca;
}

test.describe('busca geral: criaturas pelo bestiário de caçadas', () => {
  test('jogador vê só o que os heróis já caçaram', async ({ page }) => {
    const hunts = { goblin: { n: 10, first: '2026-09-01T20:00:00.000Z', last: '2026-09-09T20:00:00.000Z' } };
    await signIn(page, 'guest', { characters: [{ ...WIZARD, deeds: { counts: {}, unlocked: {}, hunts } }] });
    const busca = await openGoblin(page);
    await expect(busca).toContainText('10 abates');
    const lore = busca.getByRole('region', { name: 'Bestiário de caçadas: Goblin' });
    await expect(lore).toContainText('Especialidade');
    await expect(lore).toContainText('Cimitarra');
    await expect(lore).toContainText('Ficha inteira — com 25 abates');
  });

  test('mestre vê a ficha completa', async ({ page }) => {
    await signIn(page, 'master');
    await installSupabase(page, 'master');
    const busca = await openGoblin(page);
    await expect(busca.getByText('Cimitarra').first()).toBeVisible();
    await expect(busca).not.toContainText('A ficha completa fica com o mestre');
  });
});
