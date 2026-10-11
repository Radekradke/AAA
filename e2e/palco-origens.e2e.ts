import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

test.describe('Palco das origens (Configurações → Avançado)', () => {
  test('liga na Configurações e troca a etapa Origem; o card do herói só volta no Caminho', async ({ page }) => {
    await signIn(page, 'guest', { ui: { onboarded: true, toursSeen: { creator: true } } });
    await page.goto('/config');
    await page.getByRole('switch', { name: 'Palco das origens' }).click();
    await expect(page.getByRole('switch', { name: 'Palco das origens' })).toHaveAttribute('aria-checked', 'true');

    await page.goto('/criar');
    const roster = page.getByRole('navigation', { name: 'Linhagens' });
    await roster.getByRole('button', { name: 'Elfo', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Linhagem: Elfo' })).toContainText('Sublinhagem');
    await expect(page.locator('.fv-forge-hero')).toBeHidden();
    await page.getByRole('button', { name: /Drow/ }).click();
    await expect(page.getByRole('region', { name: 'Linhagem: Elfo' })).toContainText('Visão no escuro: 36 m');

    await page.locator('.fv-foot-cta').click();
    await expect(page.getByRole('heading', { name: 'Caminho' })).toBeVisible();
    await expect(page.locator('.fv-forge')).not.toHaveClass(/is-stage/);
  });
});
