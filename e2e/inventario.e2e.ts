import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const ring = (uid: string, itemId: string, name: string, attunement: boolean, extra: Record<string, unknown> = {}) => ({
  uid, itemId, name, category: 'ring', note: '', rarity: 'raro', weight: 0, quantity: 1, favorite: false, attuned: false, attunement, worn: false, location: 'mochila', ...extra,
});
const HERO = {
  ...WIZARD,
  inventory: [
    ...(WIZARD.inventory as unknown[]),
    ring('r1', 'm-ring-prot', 'Anel de Proteção', true, { acBonus: 1, magic: { saves: 1 } }),
    ring('r2', 'm-ring-swimming', 'Anel da Natação', false),
    ring('r3', 'm-ring-waterwalking', 'Anel de Andar na Água', false),
  ],
};

async function openItems(page: Page) {
  const inv = page.locator('.fv-sheet-tab', { hasText: 'Inventário' });
  if (await inv.isVisible()) return inv.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Itens', exact: true }).click();
}
const card = (page: Page, name: string) => page.locator(`.fv-inv-card[data-item="${name}"]`);
const ac = (page: Page) => page.locator('.fv-header-stat').first().locator('.fv-header-stat-val');

test.describe('inventário: anéis e sintonia', () => {
  test('veste anel, sintoniza e a CA sobe; o terceiro anel é recusado @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await openItems(page);
    await expect(ac(page)).toHaveText('12');
    const box = (name: RegExp) => page.getByRole('button', { name });

    // vestir sem sintonia: avisa e não muda a CA
    await box(/^Mochila:/).click();
    await card(page, 'Anel de Proteção').getByRole('button', { name: 'Vestir' }).click();
    await expect(page.getByText(/só funciona sintonizado/)).toBeVisible();
    await expect(ac(page)).toHaveText('12');

    // sintonizar: +1 de CA
    await page.getByRole('button', { name: /Anel de Proteção.*sem sintonia/ }).click();
    await expect(ac(page)).toHaveText('13');

    // segundo anel: cabe; terceiro: recusado com o motivo
    await card(page, 'Anel da Natação').getByRole('button', { name: 'Vestir' }).click();
    // o card já avisa antes de tentar; tentando, a mochila diz o motivo
    await expect(card(page, 'Anel de Andar na Água')).toContainText('Já está usando 2 anéis');
    await card(page, 'Anel de Andar na Água').getByRole('button', { name: 'Vestir' }).click();
    await expect(page.locator('[aria-live="polite"]', { hasText: 'Já está usando 2 anéis' })).toBeVisible();
    await expect(card(page, 'Anel de Andar na Água')).toBeVisible(); // continua na mochila

    // em Equipado: os dois vestidos; tirar o de Proteção devolve a CA
    await box(/^Equipado:/).click();
    await expect(card(page, 'Anel de Proteção').getByText('Vestido')).toBeVisible();
    await expect(card(page, 'Anel da Natação').getByText('Vestido')).toBeVisible();
    await card(page, 'Anel de Proteção').getByRole('button', { name: 'Tirar' }).click();
    await expect(ac(page)).toHaveText('12');
  });
});

test.describe('inventário: pacotes', () => {
  test('pacote do catálogo entra aberto, soma à tocha e o Desfazer volta @celular', async ({ page }) => {
    // a ficha de teste já tem 1 tocha
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await openItems(page);
    await page.getByRole('button', { name: /^Mochila:/ }).click();
    await expect(card(page, 'Tocha')).not.toContainText(/x\d/);

    await page.getByRole('button', { name: '+ Adicionar' }).click();
    const picker = page.getByRole('dialog');
    await picker.getByPlaceholder(/Buscar entre/).fill('Pacote de Explorador');
    await picker.getByRole('button', { name: /^Pacote de Explorador\b/ }).first().click();
    await expect(picker.getByRole('status')).toHaveText(/Pacote de Explorador foi aberto na mochila/);
    await picker.getByRole('button', { name: 'Fechar' }).click();

    // os itens de dentro existem; o pacote fechado, não
    await expect(card(page, 'Tocha')).toContainText('x11');
    await expect(card(page, 'Saco de Dormir')).toBeVisible();
    await expect(card(page, 'Pacote de Explorador')).toHaveCount(0);

    // Desfazer: volta a 1 tocha e sem saco de dormir
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(card(page, 'Tocha')).not.toContainText(/x\d/);
    await expect(card(page, 'Saco de Dormir')).toHaveCount(0);
  });

  test('pacote fechado de ficha antiga ganha "Abrir pacote"', async ({ page }) => {
    const pack = { uid: 'p1', itemId: 'g-pack-dungeoneer', name: 'Pacote de Explorador de Masmorras', category: 'gear', note: '', rarity: 'comum', weight: 30.5, quantity: 1, favorite: false, attuned: false, location: 'mochila' };
    await signIn(page, 'guest', { characters: [{ ...WIZARD, inventory: [...(WIZARD.inventory as unknown[]), pack] }] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await openItems(page);
    await page.getByRole('button', { name: /^Mochila:/ }).click();
    await card(page, 'Pacote de Explorador de Masmorras').getByRole('button', { name: 'Abrir pacote' }).click();
    await expect(card(page, 'Pacote de Explorador de Masmorras')).toHaveCount(0);
    await expect(card(page, 'Pé de Cabra')).toBeVisible();
    await expect(page.getByText(/Pacote de Explorador de Masmorras aberto: 9 itens na Mochila/)).toBeVisible();
  });
});
