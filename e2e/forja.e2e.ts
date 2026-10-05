import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);

/** Troca de aba pelos botões (sem recarregar: o salvamento no aparelho é assíncrono). */
async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: mobile, exact: true }).click();
}

test.describe('forja: vestível e parte do corpo', () => {
  test('olho no corpo soma CD sempre; amuleto vestível só quando vestido @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    const cd = async () => Number(await page.getByText(/^CD \d+/).first().evaluate((el) => el.textContent!.match(/\d+/)![0]));

    await tab(page, 'Magias', 'Magias');
    await expect(page.getByText(/^CD \d+/).first()).toBeVisible();
    const cd0 = await cd();

    // inventário → Outros → Parte do corpo, CD +1
    await tab(page, 'Inventário', 'Itens');
    await page.getByRole('button', { name: '+ Outros' }).click();
    const forja = page.getByRole('dialog', { name: 'Forjar item único' });
    await forja.getByPlaceholder('Ex.: Lâmina do Crepúsculo').fill('Olho Demoníaco');
    await forja.getByRole('radio', { name: /Parte do corpo/ }).click();
    await forja.getByText('CD de magia').locator('..').locator('input').fill('1');
    await forja.getByRole('button', { name: 'fogo', exact: true }).click();
    await forja.getByRole('button', { name: 'Forjar item' }).click();
    await expect(forja).toHaveCount(0);
    await expect(page.getByText('Corpo', { exact: true }).first()).toBeVisible();

    // amuleto vestível (começa vestido ao forjar)
    await page.getByRole('button', { name: '+ Outros' }).click();
    await forja.getByPlaceholder('Ex.: Lâmina do Crepúsculo').fill('Amuleto Vinculum');
    await forja.getByRole('radio', { name: /Vestível/ }).click();
    await forja.getByText('CD de magia').locator('..').locator('input').fill('1');
    await forja.getByRole('button', { name: 'Forjar item' }).click();
    await expect(page.getByText('Vestido').first()).toBeVisible();

    await tab(page, 'Magias', 'Magias');
    await expect.poll(cd).toBe(cd0 + 2);

    // tirar o amuleto: volta a +1 (o olho continua)
    await tab(page, 'Inventário', 'Itens');
    await page.getByRole('button', { name: 'Tirar' }).click();
    await tab(page, 'Magias', 'Magias');
    await expect.poll(cd).toBe(cd0 + 1);
  });
});
