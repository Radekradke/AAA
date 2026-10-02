import { test, expect } from './fixtures/test';
import { C, installSupabase, signIn } from './fixtures/supabase';

test('mestre exporta a crônica da sessão', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signIn(page, 'master');
  const db = await installSupabase(page, 'master');
  const at = (s: number) => new Date(Date.now() - 60_000 + s * 1000).toISOString();
  const base = { session_id: db.tables.sessions[0].id, campaign_id: C, actor_id: 'm', target_id: null };
  db.tables.session_events.push(
    { ...base, id: 'e2', type: 'combat_started', payload: { name: 'Emboscada na Estrada Real' }, visibility: 'public', created_at: at(1) },
    { ...base, id: 'e3', type: 'round_started', payload: { round: 1 }, visibility: 'public', created_at: at(2) },
    { ...base, id: 'e4', type: 'attack', payload: { by: 'Goblin #1', target: 'Kael Venturo', ac: 17, action: 'Cimitarra', roll: 19, hit: true, crit: false, damage: 6, type: 'cortante', hpBefore: 31, hpAfter: 25, round: 1 }, visibility: 'public', created_at: at(3) },
    { ...base, id: 'e5', type: 'attack', payload: { by: 'Espião do Barão', target: 'Kael Venturo', hit: true, crit: true, damage: 9 }, visibility: 'master', created_at: at(4) },
  );
  await page.goto(`/mesa/${C}/jogar`);
  const exportar = page.getByRole('button', { name: 'Exportar crônica' });
  if (!(await exportar.isVisible())) await page.getByRole('tab', { name: /Sessão/ }).click();
  await exportar.click();

  const dialog = page.getByRole('dialog', { name: 'Exportar crônica da sessão' });
  const pre = dialog.getByLabel('Prévia da crônica');
  await expect(pre).toContainText('# Sessão 4 — A Estrada Real');
  await expect(pre).toContainText('## ⚔ Emboscada na Estrada Real');
  await expect(pre).toContainText('Goblin #1 → Kael Venturo (CA 17) · Cimitarra 19: acertou — 6 cortante (PV 31→25)');
  await expect(pre).not.toContainText('Espião');
  await dialog.getByLabel('O que só o mestre vê').check();
  await expect(pre).toContainText('Espião do Barão → Kael Venturo: CRÍTICO! — 9 _(só o mestre)_');

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Baixar .md' }).click();
  expect((await download).suggestedFilename()).toBe('cronica-sessao-4-a-estrada-real.md');
});
