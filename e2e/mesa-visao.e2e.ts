import { test, expect } from './fixtures/test';
import { C, installSupabase, signIn } from './fixtures/supabase';

/** Cena do mapa na fixture, com a névoa trocada. */
function setFog(db: { tables: Record<string, Record<string, unknown>[]> }, fog: Record<string, unknown>) {
  const scene = db.tables.campaign_scenes[0];
  scene.grid = { ...(scene.grid as Record<string, unknown>), fog };
}

test.describe('mapa: paredes, portas e visão dinâmica', () => {
  test('mestre desenha uma parede e liga a visão dinâmica', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}/jogar`);
    const view = page.locator('.fv-map-view');
    await expect(view).toBeVisible();
    await page.getByRole('button', { name: 'Paredes (W)' }).click();
    const box = (await view.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.25);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('.fv-map-walls line')).toHaveCount(1);
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog?: { walls?: unknown[] } }).fog?.walls?.length ?? 0).toBe(1);

    await page.getByRole('button', { name: /Visão dinâmica: desligada/ }).click();
    await expect(page.getByRole('button', { name: /Visão dinâmica: ligada/ })).toBeVisible();
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog?: { vision?: boolean; on?: boolean } }).fog).toMatchObject({ on: true, vision: true });
  });

  test('jogador: a parede esconde o goblin; com a porta aberta ele aparece', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    // Kael em (3,3), goblin em (6,3): parede em x = 5 com uma porta na linha do goblin
    db.tables.scene_tokens.find((t) => t.id === 't2')!.x = 6;
    const walls = [
      { x1: 5, y1: 0, x2: 5, y2: 3 },
      { x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: false },
      { x1: 5, y1: 4, x2: 5, y2: 30 },
    ];
    setFog(db, { on: true, reveal: [], walls, vision: true });
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-map-view')).toBeVisible();
    await expect(page.locator('.fv-token', { hasText: 'Kael Venturo' })).toBeVisible();
    await expect(page.locator('.fv-token', { hasText: 'Goblin #1' })).toHaveCount(0);
    // o jogador não vê o traçado das paredes
    await expect(page.locator('.fv-map-walls')).toHaveCount(0);

    walls[1].open = true;
    setFog(db, { on: true, reveal: [], walls, vision: true });
    await page.reload();
    await expect(page.locator('.fv-token', { hasText: 'Goblin #1' })).toBeVisible();
  });

  test('mestre abre e fecha a porta com um toque', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    setFog(db, { on: true, reveal: [], walls: [{ x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: false }], vision: true });
    await page.goto(`/mesa/${C}/jogar`);
    await page.getByRole('button', { name: 'Abrir a porta' }).click();
    await expect(page.getByRole('button', { name: 'Fechar a porta' })).toBeVisible();
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog: { walls: { open?: boolean }[] } }).fog.walls[0].open).toBe(true);
    // pelo teclado também
    await page.getByRole('button', { name: 'Fechar a porta' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Abrir a porta' })).toBeVisible();
  });
});
