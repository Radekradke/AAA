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
    await page.getByRole('button', { name: 'Paredes e portas (W)' }).click();
    const box = (await view.boundingBox())!;
    // abaixo da folha da ferramenta (que fica no alto, junto da doca)
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('.fv-map-walls line')).toHaveCount(1);
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog?: { walls?: unknown[] } }).fog?.walls?.length ?? 0).toBe(1);

    const visao = page.getByRole('switch', { name: 'Visão dinâmica' });
    await expect(visao).toHaveAttribute('aria-checked', 'false');
    await visao.click();
    await expect(visao).toHaveAttribute('aria-checked', 'true');
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

  test('jogador: a parede barra o peão', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    setFog(db, { on: true, reveal: [], walls: [{ x1: 5, y1: 0, x2: 5, y2: 30 }], vision: true });
    await page.goto(`/mesa/${C}/jogar`);
    const kael = page.locator('.fv-token', { hasText: 'Kael Venturo' });
    await expect(kael).toBeVisible();
    // o aviso "seu turno" pode surgir a qualquer momento por cima do peão
    await page.addStyleTag({ content: '.fv-turn-banner { display: none !important; }' });
    const b = (await kael.boundingBox())!;
    const before = db.writes.filter((w) => w.includes('scene_tokens')).length;
    await page.mouse.move(b.x + b.width / 2, b.y + b.width / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 3.5, b.y + b.width / 2, { steps: 8 });
    await expect(page.getByText('uma parede no caminho')).toBeVisible();
    await page.mouse.up();
    await expect(page.getByText('Uma parede bloqueia o caminho')).toBeVisible();
    expect(db.writes.filter((w) => w.includes('scene_tokens')).length).toBe(before);
  });

  test('cena no escuro: a tocha revela o goblin, e o que já foi visto fica lembrado', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    const scene = db.tables.campaign_scenes[0];
    scene.image_path = null;
    scene.grid = { size: 70, ox: 0, oy: 0, show: true, cols: 44, rows: 8 };
    // 37 casas (55 m) do Kael: além até da Visão do Diabo (36 m) que ele tem
    db.tables.scene_tokens.find((t) => t.id === 't2')!.x = 40;
    setFog(db, { on: true, reveal: [], vision: true, dark: true });
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-token', { hasText: 'Kael Venturo' })).toBeVisible();
    await expect(page.locator('.fv-token', { hasText: 'Goblin #1' })).toHaveCount(0);

    setFog(db, { on: true, reveal: [], vision: true, dark: true, lights: { t2: 12 } });
    await page.reload();
    await expect(page.locator('.fv-token', { hasText: 'Goblin #1' })).toBeVisible();
    const remembered = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]').length, `fv-explored-${scene.id}`);
    expect(remembered).toBeGreaterThan(0);
  });
});

test.describe('mapa: portas e luz do jogador, arrasto sem espiar', () => {
  test('jogador abre a porta ao lado; trancada e longe não', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    // Kael em (3,3): porta 0 ao lado (x = 4), porta 1 trancada ao lado, porta 2 longe
    const walls = [
      { x1: 4, y1: 3, x2: 4, y2: 4, door: true, open: false },
      { x1: 3, y1: 2, x2: 4, y2: 2, door: true, open: false, locked: true },
      { x1: 7, y1: 3, x2: 7, y2: 4, door: true, open: false },
    ];
    setFog(db, { on: true, reveal: [{ x: 0, y: 0, w: 20, h: 20 }], walls });
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-turn-banner')).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole('button', { name: 'Abrir a porta' }).click();
    await expect.poll(() => walls[0].open).toBe(true);
    await expect(page.getByRole('button', { name: 'Fechar a porta' })).toBeVisible();
    // marcadas como indisponíveis: o toque não faz nada
    await page.getByRole('button', { name: 'Porta trancada' }).click({ force: true });
    await page.getByRole('button', { name: 'Chegue perto da porta para abrir' }).click({ force: true });
    expect([walls[1].open, walls[2].open]).toEqual([false, false]);
    expect(db.writes.filter((w) => w === 'RPC toggle_door')).toHaveLength(1);
  });

  test('mestre tranca a porta pela ferramenta de portas', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    setFog(db, { on: true, reveal: [], walls: [{ x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: true }] });
    await page.goto(`/mesa/${C}/jogar`);
    await page.getByRole('button', { name: 'Paredes e portas (W)' }).click();
    await page.locator('.fv-map-seg').getByRole('button', { name: /Porta/ }).click();
    await page.getByRole('button', { name: 'Trancar a porta' }).click();
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog: { walls: { locked?: boolean; open?: boolean }[] } }).fog.walls[0]).toMatchObject({ locked: true, open: false });
  });

  test('jogador acende a tocha do herói no escuro', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    setFog(db, { on: true, reveal: [], vision: true, dark: true });
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-turn-banner')).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole('button', { name: /Luz do herói: Sem luz/ }).click();
    await page.getByRole('group', { name: 'Luz do herói' }).getByRole('button', { name: /Tocha/ }).click();
    await expect.poll(() => (db.tables.campaign_scenes[0].grid as { fog: { lights?: Record<string, number> } }).fog.lights?.t1).toBe(12);
    await expect(page.getByRole('button', { name: /Luz do herói: Tocha/ })).toBeVisible();
  });

  test('arrastar através da parede não deixa espiar o outro lado', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    db.tables.scene_tokens.find((t) => t.id === 't2')!.x = 6;
    setFog(db, { on: true, reveal: [], vision: true, walls: [{ x1: 5, y1: 0, x2: 5, y2: 30 }] });
    await page.goto(`/mesa/${C}/jogar`);
    const kael = page.locator('.fv-token', { hasText: 'Kael Venturo' });
    await expect(kael).toBeVisible();
    // o aviso "seu turno" pode surgir a qualquer momento por cima do peão
    await page.addStyleTag({ content: '.fv-turn-banner { display: none !important; }' });
    const b = (await kael.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.width / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 3.5, b.y + b.width / 2, { steps: 8 });
    // no meio do arrasto, do outro lado da parede: o goblin continua escondido
    await expect(page.getByText('uma parede no caminho')).toBeVisible();
    await expect(page.locator('.fv-token', { hasText: 'Goblin #1' })).toHaveCount(0);
    await page.mouse.up();
    const remembered = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('fv-explored-')).map((k) => JSON.parse(localStorage.getItem(k)!) as string[]).flat());
    expect(remembered).not.toContain('6,3');
  });
});
