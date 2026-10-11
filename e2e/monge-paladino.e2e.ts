import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const base = (WIZARD.combat as Record<string, unknown>);
// monge 6 da Mão Aberta (ki 6) e paladino 10 da Devoção
const MONK = {
  ...WIZARD, id: 'mon6', name: 'Lin', raceId: 'human', subraceId: null, classId: 'monk', level: 6,
  classLevels: [{ classId: 'monk', level: 6 }], subclassId: 'openhand',
  baseAbilities: { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 },
  inventory: [], equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
  choices: {}, knownSpells: [], preparedSpells: [], hpCurrent: 20, levelHistory: [],
  combat: { ...base, resources: {}, marks: [], conditions: [], hpTemp: 0 },
};
const PAL = {
  ...WIZARD, id: 'pal10', name: 'Ser Lys', raceId: 'human', subraceId: null, classId: 'paladin', level: 10,
  classLevels: [{ classId: 'paladin', level: 10 }], subclassId: 'devotion',
  baseAbilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 16 },
  choices: { 'paladin.fightingStyle': ['defense'] }, knownSpells: [], preparedSpells: [], hpCurrent: 30, levelHistory: [],
  combat: { ...base, resources: {}, marks: [], conditions: [], hpTemp: 0 },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const hp = async (page: Page) => Number((await page.locator('.fv-hp-num').first().innerText()).match(/\d+/)?.[0]);

test.describe('monge: ki de verdade', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [MONK], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/mon6');
    await page.evaluate(() => { Math.random = () => 0.5; });
    await tab(page, 'Combate');
  });

  test('Defesa Paciente gasta 1 ki e liga o Esquivar; Integridade do Corpo cura 3 × nível', async ({ page }) => {
    const panel = page.getByRole('region', { name: 'Monge' });
    await expect(panel).toContainText('Ki 6/6');
    await panel.getByRole('button', { name: /^Defesa Paciente/ }).click();
    await expect(panel).toContainText('Ki 5/6');
    await expect(page.getByText(/Esquivando/).first()).toBeVisible();
    await panel.getByRole('button', { name: /^Integridade do Corpo/ }).click();
    await expect.poll(() => hp(page)).toBe(20 + 18);
  });

  test('Defletir Projéteis reduz 1d10 + DES + nível e gasta a reação', async ({ page }) => {
    await page.getByLabel('Valor de dano ou cura').fill('20');
    await page.getByRole('button', { name: /Defletir Projéteis/ }).click();
    await page.getByRole('button', { name: 'Aplicar dano' }).click();
    // 1d10 com random 0.5 = 6; + DES 3 + nível 6 = 15 → 20 − 15 = 5
    await expect.poll(() => hp(page)).toBe(20 - 5);
    await expect(page.getByRole('button', { name: /Defletir Projéteis/ })).toBeDisabled();
  });
});

test.describe('paladino: reservas e auras', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [PAL], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/pal10');
  });

  test('Cura pelas Mãos cura de verdade e gasta a reserva; Arma Sagrada soma CAR no ataque', async ({ page }) => {
    await tab(page, 'Combate');
    const panel = page.getByRole('region', { name: 'Paladino' });
    await expect(panel).toContainText('Cura pelas Mãos 50/50');
    const before = await hp(page);
    await panel.getByLabel('Pontos de Cura pelas Mãos').fill('8');
    await panel.getByRole('button', { name: /^Curar a mim/ }).click();
    await expect.poll(() => hp(page)).toBe(before + 8);
    await expect(panel).toContainText('Cura pelas Mãos 42/50');

    // a cura gastou a ação; Arma Sagrada também é ação: passa o turno
    await page.getByRole('button', { name: /Novo turno/ }).click();
    const hit = page.locator('.fv-atk button').first();
    const bonus = Number((await hit.innerText()).match(/[+-]\d+/)?.[0]);
    await page.getByRole('button', { name: /^Arma Sagrada/ }).click();
    await expect(page.getByText(/Arma Sagrada · \+CAR no ataque/)).toBeVisible();
    await expect.poll(async () => Number((await hit.innerText()).match(/[+-]\d+/)?.[0])).toBe(bonus + 3);
  });

  test('Aura de Coragem não deixa marcar Amedrontado', async ({ page }) => {
    await tab(page, 'Descanso');
    await page.getByRole('button', { name: /^Amedrontado/ }).click();
    await expect(page.getByText('Aura de Coragem: você não pode ficar amedrontado.')).toBeVisible();
  });
});
