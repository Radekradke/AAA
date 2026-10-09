import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

test('Diário: rabiscos, crônica com @menções e #lugares, e Anotar de outra aba', async ({ page }) => {
  // NPC e herói do grupo que a ficha já conhece (cópia offline)
  await page.addInitScript(() => {
    localStorage.setItem('fv-npcs-wiz1', JSON.stringify([{ id: 'n1', campaignId: 'c', name: 'Mara Pedrafria', role: 'Taverneira', summary: '', portrait: null, revealed: true }]));
    localStorage.setItem('fv-heroes-wiz1', JSON.stringify([{ key: 'hero:x', kind: 'hero', name: 'Thoren Pedrafé', role: 'Anão · Clérigo 5', portrait: null }]));
  });
  await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await expect(page.getByText('Lyra Sombraluz').first()).toBeVisible();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();

  // Rabisco com @ (autocompletar) e Enter para salvar
  const box = page.getByRole('textbox', { name: 'Novo rabisco' });
  await box.fill('Perguntar à @Mar');
  await page.getByRole('option', { name: /Mara Pedrafria/ }).click();
  await box.pressSequentially('sobre o #Porto Sombrio');
  await box.press('Enter');
  const note = page.locator('.fv-note').first();
  await expect(note.locator('.fv-npc-mention')).toContainText('Mara Pedrafria');
  await expect(note.locator('.fv-place-chip')).toContainText('Porto Sombrio');

  // Crônica: sessão nova, texto livre, resumo de quem apareceu
  await page.getByRole('tab', { name: /Crônica/ }).click();
  await page.getByRole('button', { name: /Nova sessão/ }).click();
  await page.getByRole('textbox', { name: 'Título da sessão' }).fill('A emboscada na ponte');
  await page.getByRole('textbox', { name: 'O que aconteceu na sessão' }).fill('@Thoren Pedrafé curou o grupo na #Torre de Vigia.');
  const side = page.getByRole('complementary', { name: 'Nesta sessão' });
  await expect(side).toContainText('Thoren Pedrafé');
  await expect(side).toContainText('Torre de Vigia');
  await page.getByRole('radio', { name: 'Ler' }).click();
  await expect(page.locator('.fv-chron-read .fv-npc-mention.is-hero')).toContainText('Thoren Pedrafé');
  await page.getByRole('button', { name: /Todas as sessões/ }).click();
  await expect(page.locator('.fv-chron-card')).toContainText('A emboscada na ponte');

  // Anotar de qualquer aba: vai para os Rabiscos
  await page.locator('.fv-sheet-tab', { hasText: 'Combate' }).click();
  await page.getByRole('button', { name: /Anotar/ }).click();
  await page.getByRole('textbox', { name: 'Anotação rápida' }).fill('Goblin com cicatriz fugiu para o norte');
  await page.keyboard.press('Enter');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Rabiscos/ }).click();
  await expect(page.locator('.fv-note')).toHaveCount(2);
  await expect(page.locator('.fv-note').first()).toContainText('Goblin com cicatriz');

  // tudo fica salvo na ficha
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await expect(page.locator('.fv-note')).toHaveCount(2);
});

test('Diário: Quadro da Guilda — missão nova, objetivos e mudar de coluna', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fv-npcs-wiz1', JSON.stringify([{ id: 'n1', campaignId: 'c', name: 'Mara Pedrafria', role: 'Taverneira', summary: '', portrait: null, revealed: true }]));
  });
  await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Quadro da Guilda/ }).click();

  // nova missão em Ativas: abre o detalhe
  await page.getByRole('button', { name: 'Nova missão em Ativas' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nome da missão' }).fill('Resgatar o filho do moleiro');
  const giver = dialog.getByRole('textbox', { name: 'Quem pediu' });
  await giver.fill('@Mar');
  await page.getByRole('option', { name: /Mara Pedrafria/ }).click();
  await dialog.getByRole('textbox', { name: 'Recompensa' }).fill('200 po');
  const obj = dialog.getByRole('textbox', { name: 'Novo objetivo' });
  await obj.fill('Achar a trilha na #Mata Escura');
  await obj.press('Enter');
  await obj.fill('Trazer o garoto de volta');
  await obj.press('Enter');
  await dialog.getByRole('checkbox').first().check();
  await expect(dialog).toContainText('1 de 2');
  await dialog.getByRole('button', { name: 'Pronto' }).click();

  const card = page.locator('.fv-board-col.is-active .fv-quest');
  await expect(card).toContainText('Resgatar o filho do moleiro');
  await expect(card).toContainText('pedida por Mara Pedrafria');
  await expect(card).toContainText('200 po');
  await expect(card).toContainText('1/2');
  await expect(page.getByRole('tab', { name: /Quadro da Guilda/ })).toContainText('1');

  // ▶ move para Concluídas
  await card.getByRole('button', { name: 'Mover para Concluídas' }).click();
  await expect(page.locator('.fv-board-col.is-done .fv-quest')).toContainText('Resgatar o filho do moleiro');
  await expect(page.locator('.fv-board-col.is-active .fv-quest')).toHaveCount(0);

  // a busca do diário acha pelo objetivo
  await page.getByRole('textbox', { name: 'Buscar no diário' }).fill('garoto');
  await expect(page.locator('.fv-quest')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Buscar no diário' }).fill('dragão');
  await expect(page.locator('.fv-quest')).toHaveCount(0);

  // fica salvo
  await page.getByRole('textbox', { name: 'Buscar no diário' }).fill('');
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await expect(page.locator('.fv-board-col.is-done .fv-quest')).toContainText('Resgatar o filho do moleiro');
});

test('Diário: Quadro da Guilda no celular mostra uma coluna por vez @celular', async ({ page }) => {
  test.skip(test.info().project.name !== 'celular');
  await signIn(page, 'guest', { characters: [WIZARD], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await page.locator('.fv-mobile-nav').getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: 'Diário' }).click();
  await page.getByRole('tab', { name: /Quadro da Guilda/ }).click();
  await expect(page.locator('.fv-board-col')).toHaveCount(1);
  await page.getByRole('tab', { name: /Rumores/ }).click();
  await page.getByRole('button', { name: 'Nova missão em Rumores' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Nome da missão' }).fill('Boato do dragão');
  await page.getByRole('dialog').getByRole('button', { name: 'Pronto' }).click();
  await expect(page.locator('.fv-board-col.is-rumor .fv-quest')).toContainText('Boato do dragão');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
