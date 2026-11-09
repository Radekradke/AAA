import { test, expect } from './fixtures/test';
import { C, P, WIZARD, installSupabase, signIn } from './fixtures/supabase';

/**
 * Discord pessoal: cola o webhook em Configurações, testa e as rolagens da
 * ficha chegam ao canal com o nome do herói e o total. O Discord é simulado.
 */
const HOOK = 'https://discord.com/api/webhooks/123456/abc_DEF-9';

test('webhook pessoal: testar envio e rolagem da ficha chegam ao canal', async ({ page }) => {
  const sent: { title: string; description: string }[] = [];
  await page.route('https://discord.com/api/webhooks/**', async (route) => {
    const body = route.request().postDataJSON() as { embeds: { title: string; description: string }[] };
    sent.push(body.embeds[0]);
    await route.fulfill({ status: 204, body: '' });
  });
  await signIn(page, 'guest', { characters: [WIZARD], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/config');
  const field = page.getByLabel('Webhook pessoal do Discord');
  await field.fill('https://exemplo.com/nao');
  await expect(page.getByText('Não parece um webhook do Discord.')).toBeVisible();
  await field.fill(HOOK);
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].title).toContain('Teste da Ficha Viva');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  // o endereço completo some da tela: só o fim aparece
  await expect(page.getByText('Webhook ligado · …_DEF-9')).toBeVisible();

  await page.goto(`/ficha/${WIZARD.id}`);
  await page.locator('.fv-init-btn').first().click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[1].title).toBe(`${String(WIZARD.name)} · Iniciativa`);
  expect(sent[1].description).toMatch(/\*\*\d+\*\*/);
});

test.describe('Discord da mesa', () => {
  test('mestre liga o webhook na sala; o endereço fica escondido e dá para remover', async ({ page }) => {
    const sent: unknown[] = [];
    await page.route('https://discord.com/api/webhooks/**', async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ status: 204, body: '' });
    });
    await signIn(page, 'master');
    const db = await installSupabase(page, 'master');
    await page.goto(`/mesa/${C}`);
    const card = page.getByRole('region', { name: 'Discord da mesa' });
    await card.getByLabel('Webhook do Discord da mesa').fill(HOOK);
    await card.getByRole('button', { name: 'Salvar' }).click();
    await expect(card.getByText('Webhook ligado · …_DEF-9')).toBeVisible();
    await expect.poll(() => db.tables.campaign_discord.map((r) => r.webhook_url)).toEqual([HOOK]);
    await card.getByRole('button', { name: 'Testar envio' }).click();
    await expect.poll(() => sent.length).toBe(1);
    await card.getByRole('button', { name: 'Remover' }).click();
    await expect.poll(() => db.tables.campaign_discord.length).toBe(0);
  });

  test('jogador não vê o Discord da mesa', async ({ page }) => {
    await signIn(page, 'player', { characters: [{ ...WIZARD, id: 'k', ownerId: P, name: 'Kael Venturo' }] });
    await installSupabase(page, 'player');
    await page.goto(`/mesa/${C}`);
    await expect(page.getByText('A Coroa de Cinzas').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Discord da mesa' })).toHaveCount(0);
  });
});
