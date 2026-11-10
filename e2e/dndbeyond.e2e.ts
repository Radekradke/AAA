import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';

/**
 * Importar do D&D Beyond: a ponte /api/ddb é simulada com um personagem
 * sintético. Mostra os avisos antes de criar e abre a ficha montada.
 */
const DDB = {
  name: 'Brakka', gender: 'Male', alignmentId: 6,
  race: { fullName: 'Half-Orc', baseRaceName: 'Half-Orc' },
  classes: [{ level: 3, isStartingClass: true, definition: { name: 'Fighter' }, subclassDefinition: { name: 'Champion' } }],
  background: { definition: { name: 'Soldier' } },
  stats: [{ id: 1, value: 15 }, { id: 2, value: 13 }, { id: 3, value: 14 }, { id: 4, value: 8 }, { id: 5, value: 12 }, { id: 6, value: 10 }],
  modifiers: { class: [{ type: 'proficiency', subType: 'perception' }, { type: 'proficiency', subType: 'survival' }] },
  feats: [{ definition: { name: 'Iron Will', description: 'You cannot be frightened.' } }],
  inventory: [
    { quantity: 1, equipped: true, definition: { name: 'Greatsword', filterType: 'Weapon', weight: 6 } },
    { quantity: 1, equipped: true, definition: { name: 'Chain Mail', filterType: 'Armor', weight: 55 } },
  ],
  currencies: { gp: 33 },
};

test.describe('importar do D&D Beyond', () => {
  test('link público: avisos antes de criar e a ficha abre com os números @celular', async ({ page }) => {
    let asked = '';
    await page.route('**/api/ddb?**', async (route) => {
      asked = new URL(route.request().url()).searchParams.get('id') ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: DDB }) });
    });
    await signIn(page, 'guest', { characters: [], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/personagens');
    await page.getByRole('button', { name: 'Importar do D&D Beyond' }).click();
    const dialog = page.getByRole('dialog', { name: 'Importar do D&D Beyond' });
    await dialog.getByLabel('Link do D&D Beyond').fill('https://www.dndbeyond.com/monsters/1');
    await expect(dialog.getByText('Esse não parece um link de personagem')).toBeVisible();
    await dialog.getByLabel('Link do D&D Beyond').fill('https://www.dndbeyond.com/characters/123456789');
    await dialog.getByRole('button', { name: 'Buscar personagem' }).click();
    const preview = page.getByRole('dialog', { name: 'Importar Brakka' });
    await expect(preview).toContainText('Fighter 3');
    await expect(preview.getByRole('list', { name: 'Avisos da importação' })).toContainText('Iron Will');
    expect(asked).toBe('123456789');
    await preview.getByRole('button', { name: 'Criar herói' }).click();
    await expect(page).toHaveURL(/\/ficha\//);
    await expect(page.getByText('Brakka').first()).toBeVisible();
    await expect(page.getByText(/Meio-Orc/).first()).toBeVisible();
  });

  test('personagem privado: explica como deixar público', async ({ page }) => {
    await page.route('**/api/ddb?**', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'private' }) }));
    await signIn(page, 'guest', { characters: [], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/personagens');
    await page.getByRole('button', { name: 'Importar do D&D Beyond' }).click();
    const dialog = page.getByRole('dialog', { name: 'Importar do D&D Beyond' });
    await dialog.getByLabel('Link do D&D Beyond').fill('123456789');
    await dialog.getByRole('button', { name: 'Buscar personagem' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Privacy → Public');
  });
});
