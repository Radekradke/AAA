import { test, expect } from './fixtures/test';
import { C, INVITE_CODE, M, SHARE_TOKEN, WIZARD, installSupabase, signIn } from './fixtures/supabase';

test.describe('mesa (campanha)', () => {
  test('mestre vê o código curto e o QR do convite', async ({ page }) => {
    await signIn(page, 'master');
    await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}`);
    await expect(page.locator('.fv-invite-code')).toHaveText(`${INVITE_CODE.slice(0, 4)}-${INVITE_CODE.slice(4)}`);
    await page.getByRole('button', { name: 'Mostrar QR' }).click();
    await expect(page.locator('svg.fv-qr')).toBeVisible();
  });

  test('jogador entra digitando o código @celular', async ({ page }) => {
    await signIn(page, 'player');
    await installSupabase(page, 'player');
    await page.goto('/mesas');
    const campo = page.locator('#fv-joincode-input');
    await campo.fill(INVITE_CODE.toLowerCase());
    await expect(campo).toHaveValue(`${INVITE_CODE.slice(0, 4)}-${INVITE_CODE.slice(4)}`);
    await page.getByRole('button', { name: 'Entrar na mesa' }).click();
    await expect(page).toHaveURL(new RegExp(`/mesa/${C}`));
  });

  test('console do mestre: mapa em tela cheia e volta', async ({ page }) => {
    await signIn(page, 'master');
    await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}/jogar`);
    const palco = page.locator('.fv-stage');
    await expect(page.locator('.fv-map-view')).toBeVisible();
    await page.locator('.fv-map-fullbtn').click();
    await expect(palco).toHaveClass(/is-full/);
    // em tela cheia a iniciativa some: o mestre passa a vez pelo palco
    await expect(page.locator('.fv-stage-next')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palco).not.toHaveClass(/is-full/);
    await page.keyboard.press('f');
    await expect(palco).toHaveClass(/is-full/);
  });

  test('jogador: mapa em tela cheia sem os controles do mestre', async ({ page }) => {
    await signIn(page, 'player');
    await installSupabase(page, 'player');
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-map-view')).toBeVisible();
    await page.locator('.fv-map-fullbtn').click();
    await expect(page.locator('.fv-stage')).toHaveClass(/is-full/);
    await expect(page.locator('.fv-stage-next')).toHaveCount(0);
  });
});

test.describe('ficha compartilhada por link', () => {
  test('abre sem conta, só leitura', async ({ page }) => {
    await installSupabase(page, 'player');
    await page.goto(`/f/${SHARE_TOKEN}`);
    await expect(page.locator('.fv-ills h1')).toHaveText('Kael Venturo');
    await expect(page.getByText('só leitura')).toBeVisible();
  });

  test('link revogado ou errado avisa', async ({ page }) => {
    await installSupabase(page, 'player');
    await page.goto('/f/linkQueNaoExiste123456789');
    await expect(page.getByRole('heading', { name: 'Link sem ficha' })).toBeVisible();
  });

  test('dono cria o link pela ficha', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    await page.goto('/ficha/k');
    await page.getByRole('button', { name: 'Compartilhar a ficha (link, PDF ou JSON)' }).click();
    await page.getByRole('button', { name: /Por link/ }).click();
    await page.getByRole('button', { name: 'Criar link e copiar' }).click();
    await expect(page.locator('.fv-share-list li')).toHaveCount(1);
    expect(db.writes).toContain('POST sheet_shares');
    const token = String(db.tables.sheet_shares[0].token);
    expect(token).toMatch(/^[A-Za-z0-9]{24}$/);
  });
});

test.describe('NPCs a partir dos heróis do mestre', () => {
  test('mestre importa um herói da conta como NPC oculto, com ficha ligada', async ({ page }) => {
    await signIn(page, 'master', { characters: [{ ...WIZARD, id: 'lyra', ownerId: M }] });
    const db = await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}`);
    await page.getByRole('button', { name: 'Importar dos meus heróis' }).click();
    const janela = page.getByRole('dialog', { name: 'Importar dos meus heróis' });
    await janela.getByRole('checkbox', { name: /Lyra Sombraluz/ }).check();
    await janela.getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('1 NPC importado.')).toBeVisible();

    const npc = db.tables.campaign_npcs.find((n) => n.name === 'Lyra Sombraluz');
    expect(npc).toMatchObject({ campaign_id: C, revealed: false });
    expect(String(npc!.role)).toMatch(/·/);
    expect(String(npc!.portrait)).toMatch(/^data:image\//);
    const secret = db.tables.campaign_npc_secrets.find((s) => s.npc_id === npc!.id);
    expect(secret?.stats).toMatchObject({ sheetId: 'lyra', level: WIZARD.level });
    await expect(page.locator('.fv-npc-card', { hasText: 'Lyra Sombraluz' })).toContainText('oculto dos jogadores');

    // de novo: aparece marcado como "já é NPC nesta mesa"
    await page.getByRole('button', { name: 'Importar dos meus heróis' }).click();
    await expect(page.getByRole('dialog', { name: 'Importar dos meus heróis' })).toContainText('já é NPC nesta mesa');
  });
});
