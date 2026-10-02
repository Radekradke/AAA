import { test, expect } from './fixtures/test';
import { P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

const ID = String(WIZARD.id);

async function openHistory(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Mais opções' }).click();
  await page.getByRole('menuitem', { name: 'Histórico e versões' }).click();
  return page.getByRole('dialog');
}

test.describe('histórico da ficha', () => {
  test('guarda a versão de antes de mexer e restaura', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    await page.locator('.fv-sheet-tab', { hasText: 'Mesa' }).click();
    const pv = String(WIZARD.hpCurrent);

    // primeira edição da sessão: a versão anterior vai para o histórico sozinha
    await page.getByRole('button', { name: '−5' }).first().click();

    let dialog = await openHistory(page);
    const entry = dialog.locator('.fv-hist-list > li').first();
    await expect(entry).toContainText('Início de sessão');
    await expect(entry.locator('.fv-hist-diff')).toContainText(`→ ${pv}/`);
    await entry.getByRole('button', { name: 'Restaurar esta versão' }).click();
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(dialog).toBeHidden();

    // a ficha voltou e a versão de antes de restaurar ficou guardada
    dialog = await openHistory(page);
    await expect(dialog.locator('.fv-hist-now')).toContainText(`PV ${pv}/`);
    await expect(dialog.locator('.fv-hist-list > li').first()).toContainText('Antes de restaurar');
  });

  test('guardar versão à mão', async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
    await page.goto(`/ficha/${ID}`);
    const dialog = await openHistory(page);
    await expect(dialog).toContainText('Ainda não há versões');
    await dialog.getByRole('button', { name: 'Guardar versão agora' }).click();
    const entry = dialog.locator('.fv-hist-list > li').first();
    await expect(entry).toContainText('Guardada à mão');
    await expect(entry).toContainText('Igual à ficha atual');
    await expect(entry.getByRole('button', { name: 'Restaurar esta versão' })).toBeDisabled();
  });
});

test.describe('conflito de sincronização', () => {
  test('mostra as duas versões e a descartada vai para o histórico', async ({ page }) => {
    // este aparelho: editou offline (PV 5); nuvem: outro aparelho também mexeu (PV 18)
    const local = { ...WIZARD, id: 'k', name: 'Kael Venturo', ownerId: P, hpCurrent: 5, updatedAt: 1500, syncBase: 1000, lastSyncedAt: 1000, syncStatus: 'pending' };
    await signIn(page, 'player', { characters: [local] });
    const db = await installSupabase(page, 'player');
    Object.assign(db.tables.sheets[0], { updated_at: 1200, snapshot: { ...local, hpCurrent: 18, updatedAt: 1200 } });

    await page.goto('/ficha/k');
    const badge = page.getByRole('button', { name: /Estado de salvamento: Conflito/ });
    await badge.click();
    const card = page.getByRole('region', { name: 'Conflito: Kael Venturo' });
    await expect(card).toContainText('Neste aparelho');
    await expect(card.locator('.fv-conflict-diff')).toContainText('PV 5/');
    expect(db.writes.filter((w) => w.includes('sheets') && !w.includes('sheet_shares'))).toEqual([]); // nada foi sobrescrito
    await card.getByRole('button', { name: 'Usar a da nuvem' }).click();
    await expect(page.getByRole('dialog')).toContainText('Tudo resolvido');
    await page.keyboard.press('Escape');

    const dialog = await openHistory(page);
    await expect(dialog.locator('.fv-hist-now')).toContainText('PV 18/');
    const entry = dialog.locator('.fv-hist-list > li.is-conflict').first();
    await expect(entry).toContainText('Versão deste aparelho, descartada num conflito');
    await expect(entry).toContainText('PV 5/');
  });
});
