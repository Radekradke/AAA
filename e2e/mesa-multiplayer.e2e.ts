import { test, expect } from './fixtures/test';
import type { Browser, Locator, Page } from '@playwright/test';
import { C, installSupabase, signIn } from './fixtures/supabase';
import type { MockDb } from './fixtures/supabase';

/**
 * MULTIPLAYER DE VERDADE: mestre e jogador em duas janelas, dividindo o
 * mesmo banco e o mesmo Realtime (o mock repassa postgres_changes e
 * broadcast entre as janelas, como o Supabase). Nada de recarregar a página:
 * o que um faz aparece na tela do outro pelo tempo real incremental.
 */

/** Paredes da cena do mapa (linhas de scene_walls). */
function seedWalls(db: MockDb, walls: Record<string, unknown>[]) {
  const scene = db.tables.campaign_scenes[0];
  db.tables.scene_walls = walls.map((w, i) => ({ id: `w${i}`, scene_id: scene.id, campaign_id: scene.campaign_id, open: false, locked: false, ...w }));
}

/** Abre a mesa ao vivo para o mestre (página do teste) e para um jogador (outra janela). */
async function table(page: Page, browser: Browser, prep?: (db: MockDb) => void) {
  await signIn(page, 'master');
  const db = await installSupabase(page, 'master');
  prep?.(db);
  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  const errors: string[] = [];
  player.on('pageerror', (e) => errors.push(e.message));
  await signIn(player, 'player');
  const playerDb = await installSupabase(player, 'player', { shared: db });
  await page.goto(`/mesa/${C}/jogar`);
  await player.goto(`/mesa/${C}/jogar`);
  await expect(page.locator('.fv-map-view')).toBeVisible();
  await expect(player.locator('.fv-map-view')).toBeVisible();
  // o aviso "seu turno" pode cobrir o mapa do jogador a qualquer momento
  await player.addStyleTag({ content: '.fv-turn-banner { display: none !important; }' });
  /** Internet do jogador cai/volta (navegador e chamadas ao banco). */
  const playerOffline = async (off: boolean) => {
    playerDb.offline = off;
    await ctx.setOffline(off);
  };
  return { db, player, errors, playerOffline, close: () => ctx.close() };
}

/** Caixa depois que o mapa terminou de se enquadrar (duas leituras iguais). */
async function stableBox(loc: Locator) {
  let last = '';
  for (let i = 0; i < 40; i++) {
    const b = await loc.boundingBox();
    const key = JSON.stringify(b);
    if (b && key === last) return b;
    last = key;
    await loc.page().waitForTimeout(100);
  }
  return (await loc.boundingBox())!;
}

test.describe('multiplayer: mestre e jogador na mesma mesa', () => {
  test('o jogador abre a porta e o mestre vê na hora', async ({ page, browser }) => {
    const t = await table(page, browser, (db) => seedWalls(db, [{ x1: 4, y1: 3, x2: 4, y2: 4, door: true }]));
    await expect(page.getByRole('button', { name: 'Abrir a porta' })).toBeVisible();
    await t.player.getByRole('button', { name: 'Abrir a porta' }).click();
    await expect(page.getByRole('button', { name: 'Fechar a porta' })).toBeVisible();
    expect(t.db.writes.filter((w) => w === 'RPC toggle_door')).toHaveLength(1);
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('o mestre revela o espião escondido e ele aparece para o jogador', async ({ page, browser }) => {
    const t = await table(page, browser);
    await expect(t.player.locator('.fv-token', { hasText: 'Espião do Barão' })).toHaveCount(0);
    await page.locator('.fv-token', { hasText: 'Espião do Barão' }).click();
    await page.locator('.fv-tokenbar').getByRole('button', { name: 'Revelar' }).click();
    await expect(t.player.locator('.fv-token', { hasText: 'Espião do Barão' })).toBeVisible();
    // e esconde de novo: some da tela do jogador
    await page.locator('.fv-tokenbar').getByRole('button', { name: 'Esconder' }).click();
    await expect(t.player.locator('.fv-token', { hasText: 'Espião do Barão' })).toHaveCount(0);
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('o jogador move o herói e o mestre vê o peão no lugar novo', async ({ page, browser }) => {
    const t = await table(page, browser);
    const kaelM = page.locator('.fv-token', { hasText: 'Kael Venturo' });
    const before = await stableBox(kaelM);
    const kaelP = t.player.locator('.fv-token', { hasText: 'Kael Venturo' });
    const b = await stableBox(kaelP);
    await t.player.mouse.move(b.x + b.width / 2, b.y + b.width / 2);
    await t.player.mouse.down();
    await t.player.mouse.move(b.x + b.width * 2.5, b.y + b.width / 2, { steps: 6 });
    await t.player.mouse.up();
    await expect.poll(() => t.db.tables.scene_tokens.find((x) => x.id === 't1')?.x).toBe(5);
    await expect.poll(async () => Math.round(((await kaelM.boundingBox())!.x - before.x) / before.width)).toBe(2);
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('o mestre desenha uma parede e a visão do jogador fecha', async ({ page, browser }) => {
    const t = await table(page, browser, (db) => {
      db.tables.scene_tokens.find((x) => x.id === 't2')!.x = 6;
      const scene = db.tables.campaign_scenes[0];
      scene.grid = { ...(scene.grid as object), fog: { on: true, reveal: [], vision: true } };
      db.tables.scene_walls = [];
    });
    await expect(t.player.locator('.fv-token', { hasText: 'Goblin #1' })).toBeVisible();
    await page.getByRole('button', { name: 'Paredes e portas (W)' }).click();
    // parede vertical entre o Kael (3,3) e o goblin (6,3), de cima a baixo do mapa
    const view = page.locator('.fv-map-view');
    const kael = await stableBox(page.locator('.fv-token', { hasText: 'Kael Venturo' }));
    const cell = kael.width;
    const x = kael.x + cell * 2;
    const vb = (await view.boundingBox())!;
    await page.mouse.move(x, vb.y + vb.height - 70);
    await page.mouse.down();
    await page.mouse.move(x, kael.y - cell * 3, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => t.db.tables.scene_walls.length).toBe(1);
    await expect(t.player.locator('.fv-token', { hasText: 'Goblin #1' })).toHaveCount(0);
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('o ping do jogador aparece para o mestre (broadcast)', async ({ page, browser }) => {
    const t = await table(page, browser);
    const vb = await stableBox(t.player.locator('.fv-map-view'));
    await t.player.mouse.dblclick(vb.x + vb.width * 0.6, vb.y + vb.height * 0.6);
    await expect(page.locator('.fv-map-ping')).toBeVisible();
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('o mestre vê quem está na mesa, e o herói de quem saiu fica apagado', async ({ page, browser }) => {
    const t = await table(page, browser);
    const kael = page.locator('.fv-token', { hasText: 'Kael Venturo' });
    await expect(page.locator('.fv-mw-head .fv-live-online li')).toHaveCount(2);
    await expect(kael).not.toHaveClass(/is-away/);
    // o jogador sai da mesa (volta para as fichas)
    await t.player.goto('/');
    await expect(page.locator('.fv-mw-head .fv-live-online li')).toHaveCount(1);
    await expect(kael).toHaveClass(/is-away/);
    await expect(kael).toHaveAttribute('aria-label', /fora da mesa/);
    // e volta: o herói acende de novo
    await t.player.goto(`/mesa/${C}/jogar`);
    await expect(kael).not.toHaveClass(/is-away/);
    await t.close();
  });

  test('a internet do jogador cai e volta: a mesa avisa e põe o que mudou em dia', async ({ page, browser }) => {
    const t = await table(page, browser);
    const status = t.player.locator('.fv-live-head [role="status"]');
    await expect(status).toHaveText('Ao vivo');
    const goblin = t.player.locator('.fv-token', { hasText: 'Goblin #1' });
    const before = await stableBox(goblin);
    // a conexão do jogador cai…
    for (const sock of t.db.hub.sockets.filter((x) => x.me !== t.db.me)) sock.close();
    // …e, enquanto ele está fora, o goblin anda (o evento não chega a ele)
    t.db.tables.scene_tokens.find((x) => x.id === 't2')!.x = 5;
    await expect(status).toHaveText(/Reconectando|Conectando/);
    // o realtime-js reconecta sozinho; ao voltar, a mesa relê o palco
    await expect(status).toHaveText('Ao vivo', { timeout: 15_000 });
    await expect.poll(async () => Math.round((before.x - (await goblin.boundingBox())!.x) / before.width)).toBe(3);
    expect(t.errors).toEqual([]);
    await t.close();
  });

  test('sem internet o jogador move o herói: a jogada espera na fila e sai quando a rede volta', async ({ page, browser }) => {
    const t = await table(page, browser);
    const status = t.player.locator('.fv-live-head [role="status"]');
    await expect(status).toHaveText('Ao vivo');
    const kaelP = t.player.locator('.fv-token', { hasText: 'Kael Venturo' });
    const b = await stableBox(kaelP);
    await t.playerOffline(true);
    await expect(status).toContainText('Sem conexão');
    await t.player.mouse.move(b.x + b.width / 2, b.y + b.width / 2);
    await t.player.mouse.down();
    await t.player.mouse.move(b.x + b.width * 2.5, b.y + b.width / 2, { steps: 6 });
    await t.player.mouse.up();
    // a tela do jogador já mostra o herói no lugar novo; o banco ainda não
    await expect(status).toContainText('1 jogada na fila');
    expect(t.db.tables.scene_tokens.find((x) => x.id === 't1')?.x).toBe(3);
    await expect(t.player.locator('.fv-live-error')).toHaveCount(0);
    await t.playerOffline(false);
    await expect.poll(() => t.db.tables.scene_tokens.find((x) => x.id === 't1')?.x, { timeout: 20_000 }).toBe(5);
    await expect(status).toHaveText('Ao vivo', { timeout: 15_000 });
    const kaelM = page.locator('.fv-token', { hasText: 'Kael Venturo' });
    await expect.poll(async () => Math.round(((await kaelM.boundingBox())!.x - b.x) / b.width), { timeout: 10_000 }).not.toBe(0);
    expect(t.errors).toEqual([]);
    await t.close();
  });
});
