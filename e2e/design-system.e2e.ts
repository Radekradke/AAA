import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

/** Primitivos e camadas do design system, pelo teclado, no catálogo /dev/ui. */
test.describe('design system (/dev/ui)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [] });
    await page.goto('/dev/ui');
    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
  });

  test('controle segmentado e abas andam com as setas', async ({ page }) => {
    const seg = page.getByRole('radiogroup', { name: 'Vantagem' });
    await seg.getByRole('radio', { name: 'Normal' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(seg.getByRole('radio', { name: 'Vantagem', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(seg.getByRole('radio', { name: 'Vantagem', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(seg.getByRole('radio', { name: 'Desvantagem' })).toBeFocused();

    const tabs = page.getByRole('tablist', { name: 'Abas de exemplo' });
    await tabs.getByRole('tab', { name: 'Primeira' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('aria-selected', 'true');
    // a Terceira está desligada: a seta pula para a Primeira
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Primeira' })).toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('Conteúdo da aba um');
  });

  test('campo mostra o erro ligado ao controle', async ({ page }) => {
    const nome = page.getByLabel('Nome do herói');
    await nome.fill('Ly');
    await expect(nome).toHaveAttribute('aria-invalid', 'true');
    await expect(nome).toHaveAccessibleDescription(/Use pelo menos 3 letras/);
    await nome.fill('Lyra');
    await expect(nome).not.toHaveAttribute('aria-invalid', 'true');
  });

  for (const [open, name] of [['Abrir modal', 'Modal de exemplo'], ['Abrir painel', 'Painel de exemplo']] as const) {
    test(`${name}: foco preso, Esc fecha e o foco volta @celular`, async ({ page }) => {
      const opener = page.getByRole('button', { name: open });
      await opener.click();
      const dialog = page.getByRole('dialog', { name });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      // Tab várias vezes: o foco nunca sai do diálogo
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    });
  }

  test('popover: abre preso ao botão, Esc devolve o foco, toque fora fecha', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Abrir popover' });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const pop = page.getByRole('dialog', { name: 'Rolar dano' });
    await expect(pop).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(pop).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(pop).toBeVisible();
    await page.getByRole('heading', { name: 'Design system' }).click();
    await expect(pop).toHaveCount(0);
    // o botão de dentro fecha pelo render-prop
    await trigger.click();
    await pop.getByRole('button', { name: 'Rolar' }).click();
    await expect(pop).toHaveCount(0);
  });

  test('dica aparece no foco, ligada por aria-describedby, e o Esc esconde', async ({ page }) => {
    const ca = page.getByRole('button', { name: 'CA 15' });
    await ca.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Classe de Armadura');
    await expect(ca).toHaveAccessibleDescription('Classe de Armadura');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
  });

  test('os temas oferecidos, claro e escuro, sem erro', async ({ page }) => {
    const tema = page.getByLabel('Tema');
    const values = await tema.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(values).toEqual(['astral', 'orfeu', 'artemis', 'carmesim', 'eclipse', 'rubra']);
    for (const v of values) {
      await tema.selectOption(v);
      for (const m of ['Claro', 'Escuro']) {
        await page.getByRole('radiogroup', { name: 'Modo' }).getByRole('radio', { name: m }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', v);
      }
    }
    await expect(page.locator('.fv-crash')).toHaveCount(0);
  });
});
