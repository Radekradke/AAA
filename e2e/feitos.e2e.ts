import { test, expect } from './fixtures/test';
import { C, P, installSupabase, signIn } from './fixtures/supabase';

test('golpe final: dano de truque aplicado a partir da rolagem do jogador vira feito na carta dele', async ({ page }) => {
  await signIn(page, 'master');
  const db = await installSupabase(page, 'master');
  const S = db.tables.sessions[0].id;
  db.tables.session_events.push({
    id: 'r1', session_id: S, campaign_id: C, actor_id: P, target_id: null, visibility: 'public', created_at: new Date().toISOString(),
    type: 'roll', payload: { who: 'Kael Venturo', label: 'Dano · Raio de Fogo', total: 9, expr: '2d10', rolls: [4, 5], crit: false, fail: false, damage: true, sheetId: 'k', cantrip: true },
  });
  await page.goto(`/mesa/${C}/jogar`);
  const aplicar = page.getByRole('button', { name: 'aplicar ▸' });
  if (!(await aplicar.isVisible())) await page.getByRole('tab', { name: /Sessão/ }).click();
  await aplicar.click();
  await page.getByRole('group', { name: 'Aplicar dano em' }).getByRole('button', { name: 'Goblin #1' }).click();

  await expect
    .poll(() => db.tables.session_events.find((e) => e.type === 'hero_deed')?.payload)
    .toMatchObject({ sheetId: 'k', name: 'Kael Venturo', creature: 'Goblin #1', kinds: ['kills', 'cantripKills'] }); // dano de truque: feito secreto
  // autor conhecido: não pergunta "quem derrubou?"
  await expect(page.getByRole('dialog', { name: /Golpe final em/ })).toHaveCount(0);
});

test('golpe final sem autor: o mestre escolhe quem derrubou; cicatriz pelo painel do herói', async ({ page }) => {
  await signIn(page, 'master');
  const db = await installSupabase(page, 'master');
  await page.goto(`/mesa/${C}/jogar`);
  await page.getByRole('button', { name: /Goblin #1/ }).first().click();
  await page.getByLabel('Dano ou cura').fill('-7');
  await page.getByLabel('Dano ou cura').press('Enter');

  const prompt = page.getByRole('dialog', { name: 'Golpe final em Goblin #1' });
  await prompt.getByRole('button', { name: 'Kael Venturo' }).click();
  await expect(prompt).toHaveCount(0);
  await expect.poll(() => db.tables.session_events.find((e) => e.type === 'hero_deed')?.payload).toMatchObject({ sheetId: 'k', creature: 'Goblin #1', kinds: ['kills'] });

  await page.getByRole('button', { name: /Kael Venturo/ }).first().click();
  await page.getByPlaceholder('Ex.: garra do dragão vermelho no ombro').fill('Corte de cimitarra na bochecha');
  await page.getByRole('button', { name: 'Gravar' }).click();
  await expect
    .poll(() => db.tables.session_events.find((e) => e.type === 'hero_scar')?.payload)
    .toMatchObject({ sheetId: 'k', name: 'Kael Venturo', text: 'Corte de cimitarra na bochecha', session: 'Sessão 4 — A Estrada Real' });
});
