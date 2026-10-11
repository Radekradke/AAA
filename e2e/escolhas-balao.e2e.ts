import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

// bruxo 11 sem o Arcano Místico de 6º círculo escolhido
const HERO = {
  ...WIZARD, id: 'wl11', name: 'Morgana', classId: 'warlock', level: 11, classLevels: [{ classId: 'warlock', level: 11 }], subclassId: 'fiend',
  baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
  knownSpells: ['sp-eldritch'], preparedSpells: ['sp-eldritch'],
  choices: { 'warlock.invocation': ['agonizingBlast'] },
};

test('escolhas da evolução: balão com a magia inteira ao passar o mouse', async ({ page }) => {
  await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/ficha/wl11');
  await page.locator('.fv-sheet-tab', { hasText: 'Evoluir' }).click();

  const arcanum = page.getByRole('group', { name: /Arcano Místico \(6º círculo\)/ }).first();
  await arcanum.locator('.fv-choice-opt').first().scrollIntoViewIfNeeded();
  await arcanum.locator('.fv-choice-opt').first().hover();
  const tip = page.locator('.fv-lore-tooltip');
  await expect(tip).toBeVisible();
  // a magia completa: círculo, tempo de conjuração e o texto
  await expect(tip).toContainText('6º círculo');
  await expect(tip).toContainText('Conjuração:');
});

test('"+" do nível no topo leva à aba Evoluir sem subir sozinho', async ({ page }) => {
  await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/ficha/wl11');
  await page.getByRole('button', { name: /Subir de nível/ }).click();
  await expect(page.getByText('Subir para o Nível 12')).toBeInViewport();
  await expect(page.locator('.fv-sh-level')).toContainText('Nível 11');
});

test('escolhas já feitas na ficha: balão com a magia inteira', async ({ page }) => {
  const hero = { ...HERO, id: 'wl11b', choices: { ...HERO.choices, 'warlock.arcanum6': ['phb-flesh-stone'] } };
  await signIn(page, 'guest', { characters: [hero], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/ficha/wl11b');
  await page.locator('.fv-sheet-tab', { hasText: 'Ficha' }).click();
  const chip = page.locator('.fv-feat-choice', { hasText: 'Arcano Místico' }).getByText('Carne para Pedra');
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  const tip = page.locator('.fv-lore-tooltip');
  await expect(tip).toContainText('Conjuração:');
  await expect(tip).toContainText('Arcano Místico');
});
