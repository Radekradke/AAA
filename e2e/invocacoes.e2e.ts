import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// bruxo 12 (Pacto da Lâmina) com invocações que dão magias, sentidos e dano
const HERO = {
  ...WIZARD, id: 'wl12', name: 'Morgana', classId: 'warlock', level: 12, classLevels: [{ classId: 'warlock', level: 12 }], subclassId: 'fiend',
  baseAbilities: { str: 10, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
  knownSpells: ['sp-eldritch'], preparedSpells: ['sp-eldritch', 'phb-flesh-stone'],
  choices: { 'warlock.arcanum6': ['phb-flesh-stone'], 'warlock.pact': ['blade'], 'warlock.invocation': ['armorOfShadows', 'fiendishVigor', 'mireTheMind', 'devilsSight', 'lifedrinker', 'repellingBlast'] },
  equipped: { armor: null, shield: null, mainHand: (WIZARD.equipped as Record<string, unknown>).mainHand, offHand: null, ranged: null },
};

async function open(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const ac = async (page: Page) => Number((await page.locator('[aria-label^="Classe de Armadura"]').first().innerText()).match(/\d+/)?.[0]);

test.describe('invocações do bruxo funcionam na ficha', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/wl12');
    await page.evaluate(() => { Math.random = () => 0.5; });
  });

  test('Armadura das Sombras e Vigor Infernal à vontade (em si mesmo); Atolar a Mente 1×/descanso', async ({ page }) => {
    const before = await ac(page);
    await open(page, 'Magias');
    const box = page.locator('section, div').filter({ has: page.getByText('Magias de raça, itens, talentos e invocações') }).last();
    const row = (name: string) => page.locator('div', { has: page.getByText(new RegExp(`^${name}$`)) }).filter({ hasText: /Invocação/ }).last();

    // armadura arcana à vontade: a CA vira 13 + DES (+3) = 16 e não gasta espaço
    await expect(row('Armadura Arcana')).toContainText('Invocação: Armadura das Sombras');
    await row('Armadura Arcana').getByRole('button', { name: /Usar|Conjurar/ }).click();
    await expect.poll(() => ac(page)).toBe(16);
    expect(before).toBe(13);

    // vigor infernal: vitalidade falsa à vontade em si mesmo → PV temporários
    await row('Vitalidade Falsa').getByRole('button', { name: /Usar|Conjurar/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Vitalidade Falsa' })).toContainText('PV temporários');

    // atolar a mente (lentidão): 1/1 → usada até o descanso
    const slow = row('Lentidão');
    await expect(slow).toContainText('1/1');
    await slow.getByRole('button', { name: /Usar|Conjurar/ }).click();
    await expect(slow).toContainText('usada');
    await expect(box).toBeVisible();
  });

  test('Visão do Diabo 36 m e Bebedor de Vida no dano da arma de pacto', async ({ page }) => {
    await open(page, 'Ficha');
    await expect(page.getByText(/Visão no Escuro/).first()).toBeVisible();
    await expect(page.locator('body')).toContainText('36 m');
    await open(page, 'Combate');
    await page.getByRole('button', { name: /CONCUSSÃO/ }).first().click();
    await expect(page.getByRole('button', { name: /Bebedor de Vida \+3 necrótico/ })).toBeVisible();
  });

  test('Arcano Místico conjura sem espaço, 1× por descanso longo', async ({ page }) => {
    await open(page, 'Magias');
    const row = page.locator('.fv-spell-row', { hasText: 'Carne para Pedra' });
    await expect(row).toContainText('Arcano Místico · 1×/descanso longo');
    await row.getByRole('button', { name: /Usar|Conjurar/ }).click();
    await expect(row).toContainText('usado · volta no descanso longo');
    await expect(row.getByRole('button', { name: /Usar|Conjurar/ })).toHaveCount(0);
  });
});
