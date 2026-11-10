import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

/** Herói rápido: nível 3 jogável na hora, "Sortear de novo" troca, e a ficha abre pronta. */
test('Herói rápido: escolhe nível e classe, sorteia de novo e abre a ficha @celular', async ({ page }) => {
  await signIn(page, 'guest', { characters: [], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/');
  await page.getByRole('button', { name: /Herói rápido/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Herói rápido' });
  await expect(dialog.getByLabel('Nível do herói')).toHaveValue('3');
  await dialog.getByLabel('Classe do herói').selectOption('wizard');
  const card = dialog.getByRole('article', { name: 'Herói sorteado' });
  await expect(card).toContainText('Mago');
  await expect(card).toContainText('nível 3');
  await expect(card).toContainText('Magias de destaque');
  const first = await card.locator('h3').textContent();
  // outro sorteio: o nome muda (a classe escolhida fica)
  for (let i = 0; i < 5 && (await card.locator('h3').textContent()) === first; i++) await dialog.getByRole('button', { name: 'Sortear de novo' }).click();
  await expect(card.locator('h3')).not.toHaveText(first!);
  await expect(card).toContainText('Mago');
  const name = await card.locator('h3').textContent();
  await dialog.getByRole('button', { name: 'Criar herói' }).click();
  await expect(page).toHaveURL(/\/ficha\//);
  await expect(page.getByText(name!).first()).toBeVisible();
  await expect(page.getByText(/Mago 3/).first()).toBeVisible();
});
