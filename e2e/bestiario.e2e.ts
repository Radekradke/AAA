import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/test';
import { C, installSupabase, signIn } from './fixtures/supabase';

const FOTO = fileURLToPath(new URL('../public/icons/icon-512.png', import.meta.url));

test.describe('bestiário da mesa', () => {
  test('mestre vê as cartas, filtra e personaliza foto, nome e notas', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}`);

    const gal = page.locator('.fv-bgal');
    await expect(gal.getByRole('heading', { name: /Bestiário da mesa · 65/ })).toBeVisible();
    await expect(gal.locator('.fv-mcard')).toHaveCount(12); // prévia; o resto em "Mostrar todas"
    await gal.getByRole('button', { name: /Dragão/ }).first().click(); // filtro por tipo
    await expect(gal.locator('.fv-mcard')).toHaveCount(4);
    await gal.getByRole('button', { name: /^Todos$/ }).first().click();
    await gal.getByRole('searchbox', { name: 'Buscar no bestiário' }).fill('goblin');
    await gal.getByRole('button', { name: /Goblin, ND/ }).click();

    const janela = page.getByRole('dialog', { name: 'Goblin' });
    await expect(janela).toContainText('Fuga Ágil');
    await janela.getByRole('button', { name: 'Personalizar' }).click();
    const form = page.getByRole('form', { name: 'Personalizar Goblin' });
    await form.locator('input[type="file"]').setInputFiles(FOTO);
    await expect(form.locator('.fv-mport img')).toBeVisible();
    await form.getByLabel('Nome nesta mesa').fill('Batedor Garra-Negra');
    await form.getByLabel('Notas do mestre').fill('Foge com 3 PV.');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Batedor Garra-Negra personalizado para esta mesa.')).toBeVisible();

    expect(db.tables.campaign_monsters.find((r) => r.monster_ref === 'goblin')).toMatchObject({ campaign_id: C, name: 'Batedor Garra-Negra' });
    expect(String(db.tables.campaign_monsters[0].portrait)).toMatch(/^data:image\//);
    expect(db.tables.campaign_monster_notes[0]).toMatchObject({ monster_ref: 'goblin', notes: 'Foge com 3 PV.' });
    await expect(page.getByRole('dialog', { name: 'Batedor Garra-Negra' })).toContainText('Foge com 3 PV.');
    await page.keyboard.press('Escape');
    const carta = gal.getByRole('button', { name: /Batedor Garra-Negra, ND/ });
    await expect(carta).toContainText('da mesa');

    // restaurar o padrão apaga a personalização
    await carta.click();
    await page.getByRole('button', { name: 'Personalizar' }).click();
    await page.getByRole('button', { name: 'Restaurar padrão' }).click();
    await expect.poll(() => db.tables.campaign_monsters.length).toBe(0);
    await expect.poll(() => db.tables.campaign_monster_notes.length).toBe(0);
  });

  test('jogador não vê o bestiário na sala, mas vê a cara da criatura na iniciativa @celular', async ({ page }) => {
    await signIn(page, 'player');
    const db = await installSupabase(page, 'player');
    db.tables.campaign_monsters.push({ campaign_id: C, monster_ref: 'goblin', name: 'Batedor Garra-Negra', portrait: null });
    await page.goto(`/mesa/${C}`);
    await expect(page.getByText('Heróis da mesa')).toBeVisible();
    await expect(page.locator('.fv-bgal')).toHaveCount(0);
    await page.goto(`/mesa/${C}/jogar`);
    await expect(page.locator('.fv-live-row.is-foe .fv-live-face').first()).toBeVisible();
  });
});
