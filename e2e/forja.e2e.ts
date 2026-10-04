import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);

test.describe('forja: vestível e parte do corpo', () => {
  test('olho no corpo soma CD sempre; amuleto vestível só quando vestido @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`, { state: { tab: 'inventario' } } as never);
    await page.evaluate(() => history.replaceState({ usr: { tab: 'magias' } }, ''));
    await page.reload();
    const cd = async () => Number(await page.getByText(/^CD \d+/).first().evaluate((el) => el.textContent!.match(/\d+/)![0]));
    // CD antes
    await expect(page.getByText(/^CD \d+/).first()).toBeVisible();
    const cd0 = await cd();

    // inventário → Outros → Parte do corpo, CD +1
    await page.evaluate(() => history.replaceState({ usr: { tab: 'inventario' } }, ''));
    await page.reload();
    await page.getByRole('button', { name: '+ Outros' }).first().click();
    const forja = page.getByRole('dialog', { name: 'Forjar item único' });
    await forja.getByPlaceholder('Ex.: Lâmina do Crepúsculo').fill('Olho Demoníaco');
    await forja.getByRole('radio', { name: /Parte do corpo/ }).click();
    await forja.getByText('CD de magia').locator('..').locator('input').fill('1');
    await forja.getByRole('button', { name: 'fogo', exact: true }).click();
    await forja.getByRole('button', { name: 'Forjar item' }).click();
    await expect(forja).toHaveCount(0);
    await expect(page.getByText('Corpo', { exact: true }).first()).toBeVisible();

    // amuleto vestível (começa vestido ao forjar)
    await page.getByRole('button', { name: '+ Outros' }).first().click();
    await forja.getByPlaceholder('Ex.: Lâmina do Crepúsculo').fill('Amuleto Vinculum');
    await forja.getByRole('radio', { name: /Vestível/ }).click();
    await forja.getByText('CD de magia').locator('..').locator('input').fill('1');
    await forja.getByRole('button', { name: 'Forjar item' }).click();
    await expect(page.getByText('Vestido').first()).toBeVisible();

    await page.evaluate(() => history.replaceState({ usr: { tab: 'magias' } }, ''));
    await page.reload();
    await expect.poll(cd).toBe(cd0 + 2);

    // tirar o amuleto: volta a +1 (o olho continua)
    await page.evaluate(() => history.replaceState({ usr: { tab: 'inventario' } }, ''));
    await page.reload();
    await page.getByRole('button', { name: 'Tirar' }).click();
    await page.evaluate(() => history.replaceState({ usr: { tab: 'magias' } }, ''));
    await page.reload();
    await expect.poll(cd).toBe(cd0 + 1);
  });
});
