import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

test('cria por conceito, troca o retrato e mantém acesso às regras', async ({ page }) => {
  await signIn(page, 'guest', { ui: { onboarded: true, toursSeen: { creator: true } } });
  await page.goto('/config');
  await expect(page.getByRole('switch', { name: 'Palco das origens' })).toHaveCount(0);
  await page.goto('/criar');
  await page.getByRole('button', { name: 'Quero usar magia' }).click();
  await page.locator('.fv-foot-cta').click();
  await expect(page.getByRole('heading', { name: 'Caminho' })).toBeVisible();
  const portrait = page.locator('.fv-forge-hero img[alt="Retrato do herói"]');
  const before = await portrait.getAttribute('src');
  await page.getByRole('radio', { name: 'Feminina', exact: true }).click();
  await expect(portrait).not.toHaveAttribute('src', before!);
  await page.locator('.fv-action-guide summary').click();
  await expect(page.locator('.fv-action-guide')).toContainText('Conjurar um truque');
});
