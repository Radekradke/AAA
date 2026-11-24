import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';
import type { Locator, Page } from '@playwright/test';

/**
 * Roteiro manual (docs/TESTES-MANUAIS.md) feito por robô, como uma pessoa
 * faria: §1–5 (nível 1 → 4 pela aba Evoluir), §11–14 (descanso, Jogar,
 * morte, condições), §17–20 (janelas, moedas, perícias, ferramentas) e §24
 * (turno). Resultados da 6.2: docs/RODADA-MANUAL.md.
 */
test.describe.configure({ mode: 'serial' });

async function quickHero(page: Page, classId: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /Herói rápido/ }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Herói rápido' });
  await dlg.getByLabel('Classe do herói').selectOption(classId);
  await dlg.getByLabel('Nível do herói').selectOption('1');
  await dlg.getByRole('button', { name: 'Criar herói' }).click();
  await expect(page).toHaveURL(/\/ficha\//);
}

const tab = (page: Page, name: string) => page.locator('.fv-sheet-tab', { hasText: name }).first().click();

async function hpMax(page: Page) {
  await tab(page, 'Jogar');
  return Number((await page.locator('.fv-mesa-hpmax').innerText()).replace(/\D/g, ''));
}

async function conMod(page: Page) {
  await tab(page, 'Jogar');
  const label = (await page.getByRole('button', { name: /^Teste de Constituição/ }).getAttribute('aria-label')) ?? '';
  return Number(/([+-]\d+)$/.exec(label)?.[1]);
}

async function insideViewport(page: Page, el: Locator) {
  const r = await el.boundingBox();
  const vp = page.viewportSize()!;
  return !!r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vp.width + 1 && r.y + r.height <= vp.height + 1;
}

test('§1–5: Guerreiro do nível 1 ao 4 pela aba Evoluir (média, subclasse obrigatória, ASI de CON retroativo)', async ({ page }) => {
  await signIn(page, 'guest', { characters: [] });
  await quickHero(page, 'fighter');
  const hp1 = await hpMax(page);
  const con = await conMod(page);
  expect(hp1, '§1 PV nível 1 = 10 (d10) + CON').toBe(10 + con);

  await tab(page, 'Evoluir');
  await page.getByRole('button', { name: /^Média \(6\)/ }).click();
  await page.getByRole('button', { name: /Confirmar Evolução para o Nível 2/ }).click();
  const hp2 = await hpMax(page);
  expect(hp2, '§2 nível 2 por média: +6 + CON').toBe(hp1 + 6 + con);
  await tab(page, 'Evoluir');
  await expect(page.getByText(/Surto de Ação/).first()).toBeVisible();

  await page.getByRole('button', { name: /^Média \(6\)/ }).click();
  const confirm3 = page.getByRole('button', { name: /Confirmar Evolução para o Nível 3/ });
  await expect(confirm3, '§3 sem subclasse, bloqueado').toBeDisabled();
  await expect(page.getByText(/Escolha a subclasse/).first()).toBeVisible();
  await page.getByRole('button', { name: /^Campeão/ }).first().click();
  await confirm3.click();
  const hp3 = await hpMax(page);

  await tab(page, 'Evoluir');
  await page.getByRole('button', { name: /^Média \(6\)/ }).click();
  await expect(page.getByText(/Aumento de Atributo ou Talento/).first()).toBeVisible();
  await page.getByRole('button', { name: '+2 em um atributo' }).click();
  await page.locator('button').filter({ hasText: /^CON/ }).first().click();
  await page.getByRole('button', { name: /Confirmar Evolução para o Nível 4/ }).click();
  const con4 = await conMod(page);
  expect(con4, '§5 +2 CON sobe o modificador').toBe(con + 1);
  // +6 do nível 4, + CON novo, + 1 por nível anterior (3)
  expect(await hpMax(page), '§5 PV retroativo').toBe(hp3 + 6 + con4 + 3);
});

test('§11–14, §17–19, §24: Jogar, janelas, turno, condição, morte e descanso longo', async ({ page }) => {
  await signIn(page, 'guest', { characters: [] });
  await quickHero(page, 'fighter');
  const main = page.getByRole('main');

  // §12 a aba Jogar tem tudo à mão
  await tab(page, 'Jogar');
  for (const el of [
    main.getByRole('button', { name: /^Classe de Armadura \d+$/ }),
    main.getByRole('button', { name: /^Rolar Iniciativa/ }).first(),
    main.getByRole('button', { name: /^Deslocamento/ }),
    main.getByRole('button', { name: /^Bônus de Proficiência/ }),
    main.getByRole('button', { name: /^Percepção Passiva/ }),
    main.getByRole('heading', { name: 'Salvaguardas' }),
    main.getByRole('heading', { name: 'Perícias Treinadas' }),
    main.getByRole('heading', { name: 'Ataques' }),
    main.getByRole('heading', { name: 'Condições' }),
    main.getByRole('button', { name: 'Ganhar 5 PV temporários' }),
  ]) await expect(el).toBeVisible();

  // §19 perícias e §17 janela dentro da tela, Esc fecha
  await tab(page, 'Ficha');
  await page.getByRole('button', { name: /Ver todas as 18 perícias/ }).click();
  const skills = page.getByRole('dialog').last();
  await expect(skills).toContainText('Furtividade');
  await expect(skills).toContainText('Persuasão');
  expect(await insideViewport(page, skills)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // §18 moedas
  await tab(page, 'Inventário');
  await page.getByRole('button', { name: /Gerenciar/ }).first().click();
  const coins = page.getByRole('dialog').last();
  for (const k of ['PL', 'PO', 'PE', 'PP', 'PC']) await expect(coins).toContainText(k);
  expect(await insideViewport(page, coins)).toBe(true);
  await page.keyboard.press('Escape');

  // §24 turno
  await tab(page, 'Jogar');
  const action = main.getByRole('button', { name: 'Ação', exact: true }).first();
  await action.click();
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  await main.getByRole('button', { name: 'Novo turno' }).first().click();
  await expect(action).toHaveAttribute('aria-pressed', 'false');

  // §14 condição
  const cond = main.getByRole('combobox', { name: 'Adicionar condição' });
  const poisoned = await cond.locator('option', { hasText: 'Envenenado' }).getAttribute('value');
  await cond.selectOption(poisoned!);
  await expect(main.getByText('Envenenado').first()).toBeVisible();

  // §13 cair a 0 PV
  const now = Number((await page.locator('.fv-mesa-hpnum').innerText()).split('/')[0].trim());
  for (let i = 0; i <= Math.ceil(now / 5); i++) await main.getByRole('button', { name: 'Sofrer 5 de dano' }).click();
  await expect(main.getByText(/CAINDO/)).toBeVisible();

  // §11 com 0 PV não há descanso longo; com 1 PV, o descanso cura tudo e limpa a condição
  await tab(page, 'Descanso');
  await expect(page.getByRole('button', { name: /Descanso Longo/ }).first()).toBeDisabled();
  await tab(page, 'Jogar');
  await main.getByRole('button', { name: 'Curar 1 PV' }).click();
  await tab(page, 'Descanso');
  await page.getByRole('button', { name: /Descanso Longo/ }).first().click();
  await page.getByRole('button', { name: 'Confirmar descanso' }).click();
  await tab(page, 'Jogar');
  const [cur, max] = (await page.locator('.fv-mesa-hpnum').innerText()).split('/').map((x) => Number(x.replace(/\D/g, '')));
  expect(cur, '§11 PV cheio').toBe(max);
  await expect(main.getByText(/CAINDO/)).toHaveCount(0);
  await expect(main.getByText('Nenhuma condição ativa — como deve ser.')).toBeVisible();
});

test('§20: Ladino com Ferramentas de Ladrão, Expertise e ferramenta extra', async ({ page }) => {
  await signIn(page, 'guest', { characters: [] });
  await quickHero(page, 'rogue');
  await tab(page, 'Ficha');
  await expect(page.getByText(/Ferramentas de Ladrão/).first()).toBeVisible();
  const roll = page.getByRole('button', { name: /^Rolar Ferramentas de Ladrão/ });
  const before = Number(/([+-]\d+)$/.exec((await roll.getAttribute('aria-label')) ?? '')?.[1]);
  const expertise = page.getByRole('button', { name: /Expertise/ }).first();
  await expertise.click();
  await expect(expertise).toHaveAttribute('aria-pressed', 'true');
  const after = Number(/([+-]\d+)$/.exec((await roll.getAttribute('aria-label')) ?? '')?.[1]);
  expect(after - before, 'Expertise soma a proficiência de novo (+2 no nível 1)').toBe(2);

  const removes = page.getByRole('button', { name: /^Remover / });
  const n = await removes.count();
  await page.getByRole('combobox', { name: 'Adicionar proficiência com ferramenta' }).selectOption({ index: 1 });
  await page.getByRole('button', { name: /Adicionar ferramenta/ }).click();
  await expect(removes).toHaveCount(n + 1);
  await removes.last().click();
  await expect(removes).toHaveCount(n);
});
