import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

/**
 * Homebrew sem dor: criar uma magia na própria biblioteca de magias, aprender
 * e conjurar na aba Jogar (rola o dano que o jogador definiu). Os talentos
 * homebrew têm teste de unidade (src/store/__tests__/homebrewContent.test.ts).
 */
const SORC = {
  ...WIZARD, id: 'hb3', name: 'Kael', classId: 'sorcerer', level: 3, subclassId: 'draconic',
  classLevels: [{ classId: 'sorcerer', level: 3 }], knownSpells: [], preparedSpells: [], levelHistory: [], hpCurrent: 20,
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: { 1: { max: 4, used: 0 } } },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}

test.describe('homebrew de magias e talentos', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [SORC], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto(`/ficha/${SORC.id}`);
  });

  test('cria a magia na biblioteca, aprende e conjura rolando o dano dela', async ({ page }) => {
    await tab(page, 'Magias');
    await page.getByRole('button', { name: '+ Aprender' }).click();
    await page.getByRole('button', { name: /Criar magia/ }).click();
    const editor = page.getByRole('dialog', { name: 'Nova magia homebrew' });
    await editor.getByLabel('Nome da magia').fill('Lança de Brasas');
    await editor.getByRole('radio', { name: '1º' }).click();
    await editor.getByLabel('Dados de dano').fill('2d10');
    await editor.getByLabel('Tipo de dano').selectOption('fogo');
    await editor.getByLabel('Descrição da magia').fill('Uma lança de fogo.');
    await expect(editor).toContainText('A ficha rola');
    await editor.getByRole('button', { name: 'Salvar magia' }).click();
    await expect(editor).toHaveCount(0);

    await page.getByRole('button', { name: 'Aprender Lança de Brasas' }).click();
    await page.keyboard.press('Escape');
    await tab(page, 'Jogar');
    const row = page.locator('.fv-mesa-spell', { hasText: 'Lança de Brasas' });
    await row.getByRole('button', { name: /Conjurar/ }).click();
    await row.getByRole('menuitem', { name: /^1º círculo/ }).click();
    await expect(page.getByText(/Lança de Brasas · fogo/).first()).toBeVisible();
  });

  test('o mestre vê o selo: a magia criada aparece nas regras da ficha', async ({ page }) => {
    await tab(page, 'Magias');
    await page.getByRole('button', { name: '+ Aprender' }).click();
    await page.getByRole('button', { name: /Criar magia/ }).click();
    const editor = page.getByRole('dialog', { name: 'Nova magia homebrew' });
    await editor.getByLabel('Nome da magia').fill('Véu de Cinzas');
    // dano bem acima do padrão do Guia do Mestre: avisa, mas deixa salvar
    await editor.getByLabel('Dados de dano').fill('10d10');
    await expect(editor.getByRole('list', { name: 'Comparação com o padrão do livro' })).toContainText('acima do padrão');
    await editor.getByRole('button', { name: 'Salvar magia' }).click();
    await page.getByRole('button', { name: 'Aprender Véu de Cinzas' }).click();
    await page.keyboard.press('Escape');
    await tab(page, 'Evoluir');
    await expect(page.locator('.fv-rules-link')).toContainText('fora do padrão');
  });
});
