import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

async function openLibrary(page: Page) {
  const tab = page.locator('.fv-sheet-tab', { hasText: 'Magias' });
  if (await tab.isVisible()) await tab.click();
  else await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Magias', exact: true }).click();
  await page.getByRole('button', { name: /^\+ (Aprender|Preparar)$/ }).click();
  return page.getByRole('dialog');
}

test.describe('aprender magias: filtros', () => {
  test('abas, círculo, painel de filtros com etiquetas removíveis e busca @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${WIZARD.id}`);
    const dlg = await openLibrary(page);
    const views = dlg.getByRole('group', { name: 'Mostrar' });

    // abre em "Disponíveis", com contagem em cada aba
    await expect(views.getByRole('button', { name: /Disponíveis \d+/ })).toHaveAttribute('aria-pressed', 'true');
    // a lista vem separada por círculo
    await expect(dlg.locator('.fv-lib-group-head', { hasText: 'Truques' })).toBeVisible();

    // "Escolhidas" mostra só o que o herói já tem
    await views.getByRole('button', { name: /Escolhidas/ }).click();
    const chosen = await dlg.locator('.fv-lib-row').count();
    expect(chosen).toBeGreaterThan(0);
    await expect(dlg.getByRole('button', { name: /^Remover / })).toHaveCount(chosen);
    await views.getByRole('button', { name: /Todas/ }).click();

    // círculo: só truques, sem cabeçalho de grupo
    await dlg.getByRole('group', { name: 'Círculo' }).getByRole('button', { name: 'Truques' }).click();
    await expect(dlg.locator('.fv-lib-group-head')).toHaveCount(0);
    await dlg.getByRole('group', { name: 'Círculo' }).getByRole('button', { name: 'Todos' }).click();

    // painel de filtros fechado por padrão; Evocação vira etiqueta removível
    await expect(dlg.locator('#fv-lib-panel')).toHaveCount(0);
    await dlg.getByRole('button', { name: /Filtros/ }).click();
    await dlg.getByRole('group', { name: 'Escola' }).getByRole('button', { name: 'Evocação' }).click();
    await expect(dlg.getByRole('button', { name: /Filtros/ })).toContainText('1');
    await expect(dlg.locator('.fv-lib-row').first()).toContainText('Evocação');
    await dlg.getByRole('button', { name: 'Tirar filtro Evocação' }).click();
    await expect(dlg.locator('.fv-lib-active')).toHaveCount(0);

    // busca sem resultado oferece limpar
    await dlg.getByRole('searchbox', { name: 'Buscar magia' }).fill('zzzz');
    await expect(dlg.locator('.fv-lib-empty')).toContainText('Nenhuma magia');
    await dlg.locator('.fv-lib-empty').getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(dlg.getByRole('searchbox', { name: 'Buscar magia' })).toHaveValue('');
    await expect(dlg.locator('.fv-lib-row').first()).toBeVisible();

    // a barra de filtros nunca rola de lado (nada cortado)
    const overflow = await dlg.locator('.fv-lib-bar').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
