import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

/**
 * Criar já num nível alto: Ladino pelo início rápido, nível inicial 5,
 * "Escolher tudo por mim" na Trilha de níveis e a ficha abre no 5º com
 * Ataque Furtivo 3d6 e Esquiva Sobrenatural.
 */
test('Ladino nível 5 pela Trilha de níveis', async ({ page }) => {
  await signIn(page, 'guest', { ui: { onboarded: true, toursSeen: { creator: true, sheet: true }, dice3d: false } });
  await page.goto('/criar');
  await page.locator('.fv-concept-card').filter({ hasText: /silêncio|furtiv/i }).first().click();
  const cta = page.locator('.fv-foot-cta');
  await cta.click();
  await expect(page.getByRole('heading', { name: 'Caminho' })).toBeVisible();
  await expect(page.locator('.fv-detail h3, .fv-detail').first()).toContainText('Ladino');
  await page.getByLabel('Nível inicial').selectOption('5');

  const rail = page.getByRole('navigation', { name: 'Capítulos da criação' }).first();
  await rail.getByRole('button', { name: /Níveis/ }).click();
  await expect(page.getByRole('heading', { name: 'Trilha de níveis' })).toBeVisible();
  await expect(page.locator('.fv-trail-level')).toHaveCount(4);
  await expect(page.locator('.fv-trail-top')).toContainText('Faltam 4');
  await page.getByRole('button', { name: 'Escolher tudo por mim' }).click();
  await expect(page.locator('.fv-trail-top')).toContainText('Pronto: Ladino nível 5');
  await expect(page.locator('.fv-trail-level.is-ok')).toHaveCount(4);

  await rail.getByRole('button', { name: /Despertar/ }).click();
  await page.getByLabel(/Nome/).first().fill('Sombra');
  await cta.click();
  await expect(page).toHaveURL(/\/ficha\//);
  await expect(page.getByText(/Nível 5|NÍVEL 5/i).first()).toBeVisible();
  await page.locator('.fv-sheet-tab', { hasText: 'Combate' }).click();
  await expect(page.locator('body')).toContainText('Esquiva Sobrenatural');
  // Ataque Furtivo do 5º nível (⌈5/2⌉ = 3d6) aparece no cartão de dano da arma de acuidade
  await page.locator('[data-attack-hit]').first().locator('xpath=following::button[@aria-expanded][1]').click();
  await expect(page.getByText('Ataque Furtivo +3d6').first()).toBeVisible();
});
