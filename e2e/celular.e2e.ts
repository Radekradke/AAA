import { test, expect } from './fixtures/test';
import { C, P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

const ID = String(WIZARD.id);

test.describe('celular (jogador)', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test('cabeçalho da ficha compacto: defesa cabe sem cortar; barra do topo ganha fundo ao rolar', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Ficha', exact: true }).click();
    const stats = page.locator('.fv-header-stat');
    await expect(stats).toHaveCount(5);
    for (const box of await stats.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect))) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(360);
    }
    // nível: botões de dedo
    const lvl = await page.getByRole('button', { name: /Subir de nível/ }).boundingBox();
    expect(lvl!.height).toBeGreaterThanOrEqual(34);
    // o cabeçalho não passa de ~1/3 da tela
    const head = await page.locator('.fv-sheet-head').boundingBox();
    expect(head!.height).toBeLessThan(260);

    const bar = page.locator('.fv-topbar');
    await expect(bar).not.toHaveClass(/is-scrolled/);
    await page.locator('.fv-screen-scroll').evaluate((el) => el.scrollBy(0, 400));
    await expect(bar).toHaveClass(/is-scrolled/);
  });

  test('mesa ao vivo: turno e herói (PV e CA) antes do mapa', async ({ page }) => {
    await signIn(page, 'player', { characters: [{ ...WIZARD, id: 'k', name: 'Kael Venturo', ownerId: P, updatedAt: Date.now(), hpCurrent: 6 }] });
    await installSupabase(page, 'player');
    await page.goto(`/mesa/${C}/jogar`);
    const me = page.locator('.fv-live-me');
    await expect(me.getByRole('meter', { name: 'Pontos de vida' })).toHaveAttribute('aria-valuenow', '6');
    await expect(me.locator('.fv-live-ac')).toContainText('12');
    await expect(me.getByRole('link', { name: /Abrir ficha/ })).toBeVisible();
    const y = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
    const board = await y('.fv-live-board');
    const hero = await y('.fv-live-me');
    const stage = await y('.fv-stage');
    expect(board).toBeLessThan(hero);
    expect(hero).toBeLessThan(stage);
  });

  test('configurações: tela acesa na mesa ao vivo liga e desliga', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto('/config');
    const sw = page.getByRole('switch', { name: 'Tela acesa na mesa ao vivo' });
    await sw.scrollIntoViewIfNeeded();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  test('atalho do app: /continuar abre a última ficha', async ({ page }) => {
    await signIn(page, 'guest', { characters: [{ ...WIZARD, ownerId: 'guest' }] });
    await page.goto('/continuar');
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}$`));
  });
});
