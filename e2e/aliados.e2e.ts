import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const ARTE = fileURLToPath(new URL('../public/icons/icon-512.png', import.meta.url));
/** Fixa o dado: 0.999 → 20 natural. */
const dice = (page: Page, v: number) => page.evaluate((x) => { Math.random = () => x; }, v);

async function openRetrato(page: Page) {
  await page.goto(`/ficha/${ID}`);
  await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
  const aba = page.locator('.fv-sheet-tab', { hasText: 'Retrato' });
  if (await aba.isVisible()) await aba.click();
  else {
    await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Mais' }).click();
    await page.getByRole('menuitem', { name: /Retrato/ }).click();
  }
  return page.getByRole('region', { name: 'Companheiros do herói' });
}

test('montaria com carta própria: adicionar, rolar ataque, PV e dispensar @celular', async ({ page }) => {
  await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
  const aliados = await openRetrato(page);
  await expect(aliados).toContainText('Montaria, familiar ou fera fiel');

  await aliados.getByRole('button', { name: 'Adicionar' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo companheiro' });
  await expect(editor.getByRole('radio', { name: 'Montaria' })).toHaveAttribute('aria-checked', 'true');
  await editor.getByLabel('Nome').fill('Trovão');
  await editor.getByLabel('Criatura de base').selectOption('warhorse');
  await expect(editor).toContainText('CA 11 · 19 PV · 18 m');
  await editor.getByRole('button', { name: 'Adicionar' }).click();

  // a ficha da montaria abre direto: carta + números da base
  const ficha = page.getByRole('dialog', { name: 'Trovão' });
  await expect(ficha).toContainText('Montaria · Cavalo de Guerra · Grande · ND 1/2');
  await expect(ficha.locator('.fv-ally-card .fv-ally-emblem')).toBeVisible();
  await expect(ficha.getByLabel('19 de 19 PV')).toBeVisible();
  await ficha.getByRole('button', { name: 'Menos 1 PV de Trovão' }).click();
  await expect(ficha.getByLabel('18 de 19 PV')).toBeVisible();

  // 20 natural da montaria: rola, mas não vira "crítico do herói" em tela cheia
  await dice(page, 0.999);
  await ficha.getByRole('button', { name: 'Atacar com Cascos: +6' }).click();
  await expect(page.locator('.fv-cine')).toHaveCount(0);
  await ficha.getByRole('button', { name: 'Dano de Cascos: 2d6+4' }).click();

  await page.keyboard.press('Escape');
  await expect(ficha).toHaveCount(0);
  const mini = aliados.getByRole('button', { name: 'Abrir a carta de Trovão (Montaria)' });
  await expect(mini).toBeVisible();

  // dispensar (com confirmação)
  await mini.click();
  await ficha.getByRole('button', { name: 'Dispensar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Dispensar' }).click();
  await expect(ficha).toHaveCount(0);
  await expect(mini).toHaveCount(0);
});

test('familiar livre (sem base): números à mão', async ({ page }) => {
  await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
  const aliados = await openRetrato(page);
  await aliados.getByRole('button', { name: 'Adicionar' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo companheiro' });
  await editor.getByRole('radio', { name: 'Familiar' }).click();
  await editor.getByLabel('Nome').fill('Faísca');
  await editor.getByLabel('Criatura de base').selectOption('');
  await editor.getByLabel('CA', { exact: true }).fill('13');
  await editor.getByLabel('PV máx.').fill('4');
  await editor.getByLabel('Deslocamento').fill('3 m, voo 12 m');
  await editor.getByLabel('Anotações').fill('Espírito de fogo em forma de salamandra.');
  // retrato já na criação
  await editor.locator('.fv-forge-art input[type="file"]').setInputFiles(ARTE);
  await expect(editor.locator('.fv-ally-editor-art img')).toBeVisible();
  await editor.getByRole('button', { name: 'Adicionar' }).click();

  const ficha = page.getByRole('dialog', { name: 'Faísca' });
  await expect(ficha).toContainText('Familiar · criatura livre');
  await expect(ficha.locator('.fv-ally-card img')).toBeVisible();
  await expect(ficha.getByLabel('4 de 4 PV')).toBeVisible();
  await expect(ficha).toContainText('3 m, voo 12 m');
  await expect(ficha).toContainText('Espírito de fogo');
  await ficha.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar Faísca' }).getByLabel('CA', { exact: true })).toHaveValue('13');
});
