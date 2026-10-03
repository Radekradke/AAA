import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';
const THEMES = ['astral', 'frio', 'brasa', 'verdejante', 'carmesim', 'ouro', 'eclipse', 'rubra'];
test('aba Retrato: contraste AA nos 16 modos (8 temas × claro/escuro)', async ({ page }) => {
  test.setTimeout(300_000);
  await signIn(page, 'guest', { characters: [{ ...WIZARD, concept: 'Arquivista', notes: 'História: algo.' }] });
  await page.goto(`/ficha/${WIZARD.id}`);
  const fails: string[] = [];
  for (const t of THEMES) for (const m of ['light', 'dark']) {
    await page.evaluate(([t, m]) => { const o = JSON.parse(localStorage.getItem('fv-ui')!); o.state.theme = t; o.state.modes = { [t]: m }; localStorage.setItem('fv-ui', JSON.stringify(o)); }, [t, m]);
    await page.reload();
    await page.locator('.fv-sheet-tab', { hasText: 'Retrato' }).click();
    await page.waitForTimeout(600);
    const r = await new AxeBuilder({ page }).include('.fv-vitrine').withRules(['color-contrast']).analyze();
    for (const v of r.violations) for (const n of v.nodes) fails.push(`${t}/${m}: ${n.target.join(' ')} ${n.any[0]?.message?.slice(0, 90)}`);
  }
  expect(fails).toEqual([]);
});
