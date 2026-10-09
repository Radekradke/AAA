import { test, expect } from './fixtures/test';
import { installSupabase, P, signIn, WIZARD } from './fixtures/supabase';

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

// PNG 2×2 (pixels vermelhos) para anexar como pista
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

test('Diário: Pistas — anexar imagem, verificar, ligar à missão e investigar entrega do mestre', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fv-handouts-wiz1', JSON.stringify([{ id: 'h1', campaignId: 'c', title: 'Carta lacrada', body: 'Encontre-me no moinho à meia-noite.', imagePath: null, recipients: null, shownAt: '2026-10-01T20:00:00Z', createdAt: '2026-10-01T20:00:00Z' }]));
  });
  const diary = { notes: [], clues: [], people: {}, quests: [{ id: 'q1', title: 'Resgatar o filho do moleiro', status: 'active', objectives: [], at: 1 }] };
  await signIn(page, 'guest', { characters: [{ ...WIZARD, diary }], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Pistas/ }).click();

  // nova pista com imagem anexada (comprimida e guardada na ficha)
  await page.getByRole('button', { name: '+ Nova pista' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nome da pista' }).fill('Símbolo da mão vermelha');
  await dialog.getByRole('textbox', { name: 'O que a pista diz' }).fill('Pintado na porta da #Torre de Vigia');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'simbolo.png', mimeType: 'image/png', buffer: PNG });
  await expect(dialog.locator('.fv-clue-figure-img img')).toHaveAttribute('src', /^data:image\/(webp|jpeg)/);
  await dialog.getByRole('combobox', { name: 'Missão ligada' }).selectOption({ label: 'Resgatar o filho do moleiro' });
  await dialog.getByRole('radio', { name: 'Confirmada' }).click();
  await dialog.getByRole('textbox', { name: 'Conclusão da pista' }).fill('Vimos os goblins entrando lá');
  await dialog.getByRole('button', { name: 'Pronto' }).click();

  const card = page.locator('.fv-clue', { hasText: 'Símbolo da mão vermelha' });
  await expect(card.locator('.fv-clue-stamp')).toHaveText('Confirmada');
  await expect(card.locator('.fv-clue-photo img')).toBeVisible();
  await expect(card).toContainText('Resgatar o filho do moleiro');

  // entrega do mestre vira pista para investigar
  await page.getByRole('button', { name: 'Investigar: Carta lacrada' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Nome da pista' })).toHaveValue('Carta lacrada');
  await expect(dialog.getByRole('textbox', { name: 'Fonte da pista' })).toHaveValue('Entregue pelo mestre');
  await dialog.getByRole('button', { name: 'Pronto' }).click();
  await expect(page.getByRole('button', { name: 'Abrir pista: Carta lacrada' })).toContainText('✓ nas pistas');
  await expect(page.getByRole('tab', { name: /Pistas/ })).toContainText('1'); // uma a verificar

  // filtro por situação
  await page.getByRole('radio', { name: /A verificar/ }).click();
  await expect(page.locator('.fv-clue')).toHaveCount(1);
  await expect(page.locator('.fv-clue')).toContainText('Carta lacrada');
  await page.getByRole('radio', { name: /Todas/ }).click();

  // a missão mostra a pista ligada
  await page.getByRole('tab', { name: /Quadro da Guilda/ }).click();
  await page.locator('.fv-quest-open', { hasText: 'Resgatar' }).click();
  await expect(page.getByRole('dialog').locator('.fv-quest-clues')).toContainText('Símbolo da mão vermelha');
  await page.getByRole('dialog').getByRole('button', { name: 'Pronto' }).click();

  // fica salvo (com a imagem)
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Pistas/ }).click();
  await expect(page.locator('.fv-clue', { hasText: 'Símbolo da mão vermelha' }).locator('.fv-clue-photo img')).toBeVisible();
});

test('Diário: Pessoas, busca em todo o diário e ligações entre itens', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fv-npcs-wiz1', JSON.stringify([
      { id: 'n1', campaignId: 'c', name: 'Mara Pedrafria', role: 'Taverneira', summary: 'Dona da Caneca Rachada.', portrait: null, revealed: true },
      { id: 'n2', campaignId: 'c', name: 'Velho Tomás', role: 'Moleiro', summary: '', portrait: null, revealed: true },
    ]));
    localStorage.setItem('fv-heroes-wiz1', JSON.stringify([{ key: 'hero:x', kind: 'hero', name: 'Thoren Pedrafé', role: 'Anão · Clérigo 5', portrait: null }]));
  });
  const diary = {
    notes: [{ id: 'r1', text: 'Perguntar à @Mara Pedrafria sobre o selo', at: 2 }],
    quests: [{ id: 'q1', title: 'Achar o selo', status: 'active', giver: '@Mara Pedrafria', objectives: [], at: 1 }],
    clues: [{ id: 'c1', title: 'Selo partido', text: 'Achado na ponte', status: 'unverified', questId: 'q1', at: 1 }],
    people: {},
  };
  await signIn(page, 'guest', { characters: [{ ...WIZARD, diary }], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Rabiscos/ }).click();

  // a busca vale para o diário todo: mostra onde mais tem resultado
  await page.getByRole('textbox', { name: 'Buscar no diário' }).fill('selo');
  const also = page.getByRole('status').filter({ hasText: 'Também em' });
  await expect(also).toContainText('Quadro da Guilda');
  await expect(also).toContainText('Pistas');
  await also.getByRole('button', { name: /Pistas/ }).click();
  await expect(page.locator('.fv-clue')).toContainText('Selo partido');
  await page.getByRole('textbox', { name: 'Buscar no diário' }).fill('');

  // pista → missão ligada
  await page.locator('.fv-clue', { hasText: 'Selo partido' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'abrir missão →' }).click();
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Nome da missão' })).toHaveValue('Achar o selo');
  // missão → pista ligada
  await page.getByRole('dialog').locator('.fv-quest-clues').getByRole('button', { name: /Selo partido/ }).click();
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Nome da pista' })).toHaveValue('Selo partido');
  await page.getByRole('dialog').getByRole('button', { name: 'Pronto' }).click();

  // tocar numa menção abre a pessoa
  await page.getByRole('tab', { name: /Rabiscos/ }).click();
  await page.locator('.fv-note').getByRole('link', { name: 'Ver Mara Pedrafria em Pessoas' }).click();
  const person = page.getByRole('dialog');
  await expect(person).toContainText('O que o mestre revelou');
  await expect(person).toContainText('Dona da Caneca Rachada.');
  await expect(person.locator('.fv-backlinks li')).toHaveCount(2); // rabisco + missão
  await person.getByRole('radio', { name: 'Suspeito' }).click();
  await person.getByRole('textbox', { name: 'Minhas notas sobre Mara Pedrafria' }).fill('Mentiu sobre a noite do sumiço');
  await person.getByRole('button', { name: 'Pronto' }).click();

  // página Pessoas: NPCs e heróis, quem é mais citado primeiro, opinião no cartão
  await expect(page.getByRole('tab', { name: /Pessoas/ })).toHaveAttribute('aria-selected', 'true');
  const first = page.locator('.fv-person').first();
  await expect(first).toContainText('Mara Pedrafria');
  await expect(first).toContainText('Suspeito');
  await expect(first).toContainText('citado em 2');
  await expect(page.locator('.fv-person')).toHaveCount(3);
  await page.getByRole('radio', { name: /Heróis/ }).click();
  await expect(page.locator('.fv-person')).toHaveCount(1);
  await expect(page.locator('.fv-person')).toContainText('Thoren Pedrafé');
  await page.getByRole('radio', { name: /Todos/ }).click();

  // "Onde aparece" leva ao rabisco
  await page.locator('.fv-person', { hasText: 'Mara Pedrafria' }).click();
  await page.getByRole('dialog').locator('.fv-backlinks').getByRole('button', { name: /Rabisco/ }).click();
  await expect(page.getByRole('tab', { name: /Rabiscos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.fv-note.is-flash')).toContainText('Perguntar à');

  // a opinião fica salva
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Pessoas/ }).click();
  await expect(page.locator('.fv-person', { hasText: 'Mara Pedrafria' })).toContainText('Suspeito');
});

test('Diário privado: a ficha sobe sem o diário (mestre e link não leem) e o diário vai para a tabela só do dono', async ({ page }) => {
  const db = await installSupabase(page, 'player');
  const secret = { notes: [{ id: 'r1', text: 'Desconfio do capitão da guarda', at: 1 }], quests: [], clues: [], people: {} };
  // ficha antiga já na nuvem com o diário DENTRO do snapshot (gravada antes da mudança), na mesma versão do aparelho
  const old = { ...WIZARD, id: 'wiz-old', name: 'Velha', ownerId: P, diary: secret, updatedAt: 4000, syncBase: 4000, lastSyncedAt: 4000, syncStatus: 'synced' };
  db.tables.sheets.push({ id: 'wiz-old', user_id: P, snapshot: old, updated_at: 4000 });
  // ficha nova, ainda não sincronizada
  const fresh = { ...WIZARD, id: 'wiz-new', name: 'Nova', ownerId: P, diary: secret, journal: [{ id: 'j1', title: 'A ponte', date: 'hoje', session: 1, body: 'Traídos na ponte', at: 1 }], updatedAt: 5000, syncStatus: 'pending' };
  await signIn(page, 'player', { characters: [old, fresh] });
  await page.goto('/personagens');

  const diaryOf = (id: string) => db.tables.sheet_diaries?.find((r) => r.sheet_id === id);
  await expect.poll(() => !!diaryOf('wiz-new') && !!diaryOf('wiz-old'), { timeout: 15_000 }).toBe(true);

  for (const id of ['wiz-new', 'wiz-old']) {
    const snap = JSON.stringify(db.tables.sheets.find((r) => r.id === id)!.snapshot);
    expect(snap).not.toContain('Desconfio do capitão');
    expect(snap).not.toContain('Traídos na ponte');
    expect(JSON.stringify(diaryOf(id)!.data)).toContain('Desconfio do capitão');
  }
  expect(db.tables.sheets.find((r) => r.id === 'wiz-old')!.updated_at).toBe(4000); // limpar não muda a versão
  expect(diaryOf('wiz-new')!.updated_at).toBe(5000);
  expect(JSON.stringify(diaryOf('wiz-new')!.data)).toContain('Traídos na ponte');

  // e no aparelho o diário continua lá
  await page.goto('/ficha/wiz-new');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Rabiscos/ }).click();
  await expect(page.locator('.fv-note')).toContainText('Desconfio do capitão');
});

test('Diário: imagem antiga de pista (dentro da ficha) sai da ficha e continua aparecendo', async ({ page }) => {
  const inline = `data:image/png;base64,${PNG.toString('base64')}`;
  const diary = { notes: [], quests: [], people: {}, clues: [{ id: 'c1', title: 'Mapa antigo', text: '', status: 'unverified', image: inline, at: 1 }] };
  await signIn(page, 'guest', { characters: [{ ...WIZARD, diary }], ui: { dice3d: false } });
  await page.goto('/ficha/wiz1');
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Pistas/ }).click();
  await expect(page.locator('.fv-clue', { hasText: 'Mapa antigo' }).locator('.fv-clue-photo img')).toHaveAttribute('src', /^data:image\/png/);

  // a ficha salva no aparelho não carrega mais a imagem (só o id dela)
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<string>((res) => {
          const req = indexedDB.open('ficha-viva', 1);
          req.onsuccess = () => {
            const get = req.result.transaction('kv', 'readonly').objectStore('kv').get('fv-characters');
            get.onsuccess = () => res(String(get.result ?? ''));
          };
        }),
    );
  await expect.poll(async () => (await saved()).includes('"imageId"'), { timeout: 10_000 }).toBe(true);
  expect(await saved()).not.toContain('base64');

  await page.reload();
  await page.locator('.fv-sheet-tab', { hasText: 'Diário' }).click();
  await page.getByRole('tab', { name: /Pistas/ }).click();
  await expect(page.locator('.fv-clue', { hasText: 'Mapa antigo' }).locator('.fv-clue-photo img')).toHaveAttribute('src', /^data:image\/png/);
});
