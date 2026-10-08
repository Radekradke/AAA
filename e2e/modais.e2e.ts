import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

const THEMES = ['astral', 'frio', 'brasa', 'verdejante', 'carmesim', 'ouro', 'eclipse', 'rubra'];

test.describe('modais', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
  });

  test('criando raça: clicar fora não fecha (o ✕ pisca); o ✕ fecha @celular', async ({ page }) => {
    await page.goto('/criar');
    await page.getByRole('button', { name: /Criar raça/ }).click();
    const modal = page.getByRole('dialog', { name: 'Nova raça homebrew' });
    await modal.getByPlaceholder(/Nome/).fill('Povo da Névoa');
    await page.mouse.click(5, 5); // fundo escuro, fora do modal
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Fechar' })).toHaveClass(/is-nudge/);
    await expect(modal.getByPlaceholder(/Nome/)).toHaveValue('Povo da Névoa');
    await modal.getByRole('button', { name: 'Fechar' }).click();
    await expect(modal).toHaveCount(0);
  });

  test('modal só de escolha (sem formulário) ainda fecha ao clicar fora', async ({ page }) => {
    await page.goto(`/ficha/${WIZARD.id}`);
    await page.locator('.fv-sh-share').click();
    const modal = page.getByRole('dialog', { name: 'Compartilhar a ficha' });
    await expect(modal).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(modal).toHaveCount(0);
  });

  test('corrente de compartilhar visível em todos os temas, claro e escuro', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/ficha/${WIZARD.id}`);
    const fails: string[] = [];
    for (const t of THEMES) for (const m of ['light', 'dark']) {
      await page.evaluate(([t, m]) => { const o = JSON.parse(localStorage.getItem('fv-ui')!); o.state.theme = t; o.state.modes = { [t]: m }; localStorage.setItem('fv-ui', JSON.stringify(o)); }, [t, m]);
      await page.reload();
      const ratio = await page.locator('.fv-sh-share').evaluate((el) => {
        const cs = getComputedStyle(el);
        const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
        const lum = ([r, g, b]: number[]) => { const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const a = lum(rgb(cs.color)), c = lum(rgb(cs.backgroundColor));
        return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
      });
      if (ratio < 3) fails.push(`${t}/${m}: ${ratio.toFixed(2)}`); // ícone: mínimo 3:1 (WCAG 1.4.11)
    }
    expect(fails).toEqual([]);
  });
});
