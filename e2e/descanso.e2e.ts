import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

test('Descanso: gastar Dado de Vida rola e cura sozinho', async ({ page }) => {
  await signIn(page, 'guest', { characters: [{ ...WIZARD, hpCurrent: 3, combat: { ...(WIZARD.combat as object), hitDiceRemaining: 5 } }], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await expect(page.getByText('Lyra Sombraluz').first()).toBeVisible();
  const top = page.locator('.fv-sheet-tab', { hasText: 'Descanso' });
  if (await top.isVisible()) await top.click();
  else {
    const nav = page.getByRole('navigation', { name: 'Abas da ficha' });
    await nav.getByRole('button', { name: 'Mais' }).click();
    await page.getByRole('menuitem', { name: /Descanso/ }).click();
  }
  const box = page.locator('.fv-rest-dice');
  await expect(box).toContainText('5/5');
  await box.getByRole('button', { name: 'Gastar 1 dado' }).click();
  await expect(box).toContainText('4/5');
  // d6 + CON: com CON ≥ 0 a vida sobe de 3
  await expect(page.locator('.fv-rest-dice + div')).not.toContainText('PV 3/');
});
