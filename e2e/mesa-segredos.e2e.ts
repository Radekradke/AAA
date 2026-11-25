import { test, expect } from './fixtures/test';
import { C, P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

type Db = Awaited<ReturnType<typeof installSupabase>>;
const SC = '66666666-6666-4666-8666-666666666666';

/** Baú escondido ao lado do Kael (que está em 3,3), com loot. */
function seedSecret(db: Db, rules: Record<string, unknown>) {
  db.tables.scene_tokens.push({ id: 'pin1', scene_id: SC, campaign_id: C, kind: 'marker', label: 'Baú do Barão', color: '#d9a441', x: 4, y: 3, size: 1, hidden: true });
  db.tables.scene_secrets = [
    {
      id: 'sec1', campaign_id: C, scene_id: SC, token_id: 'pin1', kind: 'chest', title: 'Baú do Barão', reveal_text: 'Um baú de carvalho com o brasão do Barão.', notes: 'Mímico.',
      loot: [{ name: 'Corda de seda', qty: 1 }], coins: { gp: 40 }, rules, found_by: null, found_at: null, created_at: 1,
    },
  ];
}

test.describe('segredos do mapa', () => {
  test('mestre esconde um segredo e edita nome e loot', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    db.tables.scene_secrets = [];
    await page.goto(`/mesa/${C}/jogar`);
    const view = page.locator('.fv-map-view');
    await expect(view).toBeVisible();
    await page.getByRole('button', { name: 'Segredos (S)' }).click();
    await expect(page.getByText('Nada escondido nesta cena ainda.')).toBeVisible();
    const box = (await view.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.7);
    await expect.poll(() => db.writes.filter((w) => w === 'POST scene_secrets').length).toBe(1);
    const sheet = page.locator('.fv-secret-sheet');
    await expect(sheet).toBeVisible();
    await sheet.getByLabel('Nome do segredo').fill('Cofre do Barão');
    await sheet.getByLabel('Novo item do loot').fill('Corda de seda');
    await sheet.getByRole('button', { name: 'Pôr' }).click();
    await sheet.getByRole('radio', { name: 'Armadilha' }).click();
    await expect.poll(() => db.tables.scene_secrets[0]?.title).toBe('Cofre do Barão');
    await expect.poll(() => db.tables.scene_secrets[0]?.kind).toBe('trap');
    await expect.poll(() => JSON.stringify(db.tables.scene_secrets[0]?.loot)).toContain('Corda de seda');
    // o jogador nunca recebe a tabela; o marcador nasce escondido
    expect(db.tables.scene_tokens.find((t) => t.id === db.tables.scene_secrets[0].token_id)?.hidden).toBe(true);
  });

  test('vigia: herói perto, o mestre recebe o aviso e revela com o loot', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    seedSecret(db, { mode: 'any', near: 3, to: 'finder' });
    await page.goto(`/mesa/${C}/jogar`);
    const alert = page.locator('.fv-secret-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Kael Venturo encontrou');
    await expect(alert).toContainText('Baú do Barão');
    await alert.getByRole('button', { name: 'Revelar' }).click();
    await expect.poll(() => db.tables.scene_tokens.find((t) => t.id === 'pin1')?.hidden).toBe(false);
    await expect.poll(() => db.tables.campaign_handouts.length).toBe(1);
    const h = db.tables.campaign_handouts[0];
    expect(h.recipients).toEqual([P]);
    expect(JSON.stringify(h.loot)).toContain('Corda de seda');
    await expect.poll(() => db.tables.scene_secrets[0].found_by).toBe('Kael Venturo');
  });

  test('"Agora não" adia o aviso; sem condição nada acontece', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    seedSecret(db, { mode: 'any', near: 3 });
    await page.goto(`/mesa/${C}/jogar`);
    await page.locator('.fv-secret-alert').getByRole('button', { name: 'Agora não' }).click();
    await expect(page.locator('.fv-secret-alert')).toHaveCount(0);
    expect(db.tables.scene_tokens.find((t) => t.id === 'pin1')?.hidden).toBe(true);
  });

  test('jogador recebe a pista e pega o loot para a mochila (uma vez)', async ({ page }) => {
    await signIn(page, 'player', { characters: [{ ...WIZARD, id: 'k', name: 'Kael Venturo', ownerId: P, updatedAt: Date.now() }] });
    const db = await installSupabase(page, 'player');
    db.tables.campaign_handouts = [
      { id: 'h1', campaign_id: C, title: 'Baú: Baú do Barão', body: 'Um baú de carvalho.', image_path: null, recipients: [P], shown_at: new Date().toISOString(), created_at: new Date().toISOString(), loot: { items: [{ name: 'Corda de seda', qty: 2 }], coins: { gp: 40 } }, claimed_by: null },
    ];
    await page.goto(`/mesa/${C}/jogar`);
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Corda de seda');
    await expect(modal).toContainText('40 PO');
    await modal.getByRole('button', { name: /Pegar para/ }).click();
    await expect.poll(() => db.writes.includes('RPC claim_handout_loot')).toBe(true);
    await expect(modal).toContainText('Já está na sua mochila.');
  });
});
