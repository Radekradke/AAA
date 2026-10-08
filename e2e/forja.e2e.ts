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

  test('magia concedida: busca digitando, legível no tema escuro @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(String(WIZARD.name)).first()).toBeVisible();
    await tab(page, 'Inventário', 'Itens');
    await page.getByRole('button', { name: '+ Outros' }).click();
    const forja = page.getByRole('dialog', { name: 'Forjar item único' });
    await forja.getByPlaceholder('Ex.: Lâmina do Crepúsculo').fill('Coração de Brasa');
    await forja.getByRole('radio', { name: /Parte do corpo/ }).click();

    const busca = forja.getByRole('combobox', { name: 'Magia' });
    await busca.fill('bola fogo');
    const lista = forja.getByRole('listbox', { name: 'Magias' });
    await expect(lista.getByRole('option')).toHaveCount(2); // Bola de Fogo e Bola de Fogo Controlável
    const opcao = lista.getByRole('option').filter({ has: page.locator('b', { hasText: /^Bola de Fogo$/ }) });
    await expect(opcao).toBeVisible();
    // texto e fundo da lista com cores diferentes (antes: tudo da mesma cor)
    const [fg, bg] = await opcao.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el.parentElement!).backgroundColor]);
    expect(fg).not.toBe(bg);

    // Esc fecha só a lista, não a forja
    await busca.press('Escape');
    await expect(lista).toHaveCount(0);
    await expect(forja).toBeVisible();

    // teclado: digitar, setas e Enter
    await busca.fill('3 bola');
    await busca.press('ArrowDown');
    await busca.press('ArrowUp');
    await busca.press('Enter');
    await expect(busca).toHaveValue('Bola de Fogo');
    await expect(forja).toContainText('3º círculo · Evocação');

    // os outros seletores (Recarga) usam a paleta do tema, não preto fixo
    const recarga = forja.locator('select').filter({ hasText: 'À vontade' });
    const [optFg, optBg] = await recarga.locator('option').first().evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(optFg).not.toBe(optBg);
    expect(optFg).not.toBe('rgb(17, 17, 17)');

    await forja.getByRole('button', { name: 'Forjar item' }).click();
    await expect(forja).toHaveCount(0);
    await tab(page, 'Magias', 'Magias');
    await expect(page.getByText('Bola de Fogo').first()).toBeVisible();
  });
});
