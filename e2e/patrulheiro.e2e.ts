import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const BOW = {
  uid: 'b1', itemId: 'w-longbow', name: 'Arco Longo', category: 'weapon', note: '', rarity: 'comum', weight: 1, quantity: 1, favorite: false, attuned: false,
  weapon: { damageDice: 1, damageDie: 8, damageType: 'perfurante', type: 'martial', range: 'ranged', properties: ['Munição', 'Pesada', 'Duas mãos'] },
};
// patrulheiro Caçador 14 com Matador de Colossos
const HERO = {
  ...WIZARD, id: 'rg14', name: 'Kael', raceId: 'human', subraceId: null, classId: 'ranger', level: 14, subclassId: 'hunter',
  classLevels: [{ classId: 'ranger', level: 14 }], baseAbilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 },
  choices: { 'ranger.favoredEnemy': ['beasts', 'undead'], 'ranger.favoredTerrain': ['forest', 'mountain'], 'ranger.hunterPrey': ['colossus'] },
  knownSpells: [], preparedSpells: [], hpCurrent: 90, levelHistory: [],
  inventory: [BOW], equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: 'b1' },
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: {} },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}

test.describe('patrulheiro na mesa', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/rg14');
    await page.evaluate(() => { Math.random = () => 0.5; });
    await tab(page, 'Combate');
  });

  test('inimigos e terrenos no painel; Consciência Primitiva gasta espaço; camuflado soma +10 no Desaparecer', async ({ page }) => {
    const panel = page.getByRole('region', { name: 'Patrulheiro' });
    await expect(panel).toContainText('Inimigos favoritos: Bestas, Mortos-vivos');
    await expect(panel).toContainText('Terrenos: Floresta, Montanha');

    await panel.getByRole('button', { name: /^Consciência Primitiva/ }).click();
    await expect(page.getByText(/Consciência Primitiva: por 1 minuto/)).toBeVisible();

    await panel.getByRole('button', { name: /^Esconder-se à Vista/ }).click();
    await expect(panel.getByRole('button', { name: /^Camuflado/ })).toBeVisible();
    const vanish = panel.getByRole('button', { name: /^Desaparecer/ });
    await expect(vanish).toContainText('ação bônus');
    await vanish.click();
    await expect(page.getByText(/Desaparecer \(camuflado \+10\)/).first()).toBeVisible();
    await expect(vanish).toBeDisabled();
  });

  test('Matador de Colossos: +1d8 no dano, só uma vez por turno', async ({ page }) => {
    const damage = page.getByRole('button', { name: /^1d8 \+3 PERFURANTE/ });
    await damage.click();
    const colossus = page.getByRole('button', { name: /^Matador de Colossos/ });
    await colossus.click();
    await expect(colossus).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /^Rolar dano/ }).click();
    await expect(page.getByText(/Dano · Arco Longo · Matador de Colossos/).first()).toBeVisible();

    await damage.click();
    await expect(page.getByRole('button', { name: /^Matador de Colossos \+1d8 \(usado\)/ })).toBeDisabled();
  });
});
