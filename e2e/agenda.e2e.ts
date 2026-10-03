import { test, expect } from './fixtures/test';
import { C, EV, P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

const KAEL = { ...WIZARD, id: 'k', ownerId: P, name: 'Kael Venturo' };

test.describe('agenda da campanha', () => {
  test('jogador vê a próxima sessão e confirma presença @celular', async ({ page }) => {
    await signIn(page, 'player', { characters: [KAEL] });
    const db = await installSupabase(page, 'player');
    await page.goto(`/mesa/${C}`);

    const agenda = page.locator('.fv-agenda');
    await expect(agenda.getByText('Sessão 5 — O Baile de Máscaras')).toBeVisible();
    await expect(agenda.locator('.fv-agenda-tag')).toHaveText('em 3 dias');
    await expect(agenda.getByText('Casa do Léo')).toBeVisible();
    await expect(agenda.locator('.fv-agenda-who li')).toHaveText(['Rui — Vou']);
    // jogador não marca nem cancela
    await expect(agenda.getByRole('button', { name: /Marcar/ })).toHaveCount(0);
    await expect(agenda.getByRole('button', { name: 'Cancelar sessão' })).toHaveCount(0);

    const vou = agenda.getByRole('button', { name: /^Vou/ });
    await vou.click();
    await expect(vou).toHaveAttribute('aria-pressed', 'true');
    await expect(agenda.locator('.fv-agenda-who li')).toHaveCount(2);
    expect(db.tables.campaign_rsvps.find((r) => r.user_id === P)).toMatchObject({ event_id: EV, status: 'yes', display_name: 'André', hero_name: 'Kael Venturo' });

    // trocar a resposta atualiza a mesma linha (sem duplicar)
    await agenda.getByRole('button', { name: /^Talvez/ }).click();
    await expect(agenda.getByRole('button', { name: /^Talvez/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(vou).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => db.tables.campaign_rsvps.filter((r) => r.user_id === P).map((r) => r.status)).toEqual(['maybe']);
  });

  test('mestre marca a sessão seguinte e cancela', async ({ page }) => {
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}`);

    const agenda = page.locator('.fv-agenda');
    await agenda.getByRole('button', { name: '+ Marcar outra' }).click();
    const form = page.getByRole('form', { name: 'Marcar sessão' });
    // sugere uma semana depois da última, na mesma hora
    await expect(form.locator('input[type="datetime-local"]')).toHaveValue(/T19:30$/);
    await form.getByLabel('Título (opcional)').fill('Sessão 6');
    await form.getByLabel('Onde (opcional)').fill('Discord');
    await form.getByRole('button', { name: 'Marcar sessão' }).click();
    await expect(page.getByText('Sessão marcada — a mesa já vê a data.')).toBeVisible();
    const novo = db.tables.campaign_events.find((e) => e.title === 'Sessão 6');
    expect(novo).toMatchObject({ campaign_id: C, place: 'Discord', duration_min: 240 });
    expect(new Date(String(novo!.starts_at)).getTime() - new Date(String(db.tables.campaign_events[0].starts_at)).getTime()).toBe(7 * 86_400_000);

    await agenda.getByRole('button', { name: 'Cancelar sessão' }).click();
    await page.getByRole('button', { name: 'Cancelar sessão' }).last().click();
    await expect.poll(() => db.tables.campaign_events.find((e) => e.id === EV)?.canceled).toBe(true);
  });

  test('a tela inicial mostra a próxima sessão e leva à sala', async ({ page }) => {
    await signIn(page, 'player');
    await installSupabase(page, 'player');
    await page.goto('/');
    const item = page.getByRole('button', { name: /Próxima sessão em 3 dias/ });
    await expect(item).toContainText('A Coroa de Cinzas');
    await expect(item).toContainText('19h30 · confirme');
    await item.click();
    await expect(page).toHaveURL(new RegExp(`/mesa/${C}$`));
  });
});
