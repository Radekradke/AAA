import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

// monge 6 (Golpe Desarmado no fim da lista de ataques da aba Jogar)
const MONK = {
  ...WIZARD, id: 'mk6', name: 'Lin', raceId: 'human', subraceId: null, classId: 'monk', level: 6, subclassId: 'openhand',
  classLevels: [{ classId: 'monk', level: 6 }], baseAbilities: { str: 10, dex: 16, con: 14, int: 10, wis: 15, cha: 8 },
  choices: {}, knownSpells: [], preparedSpells: [], hpCurrent: 40, levelHistory: [], inventory: [],
  equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], hpTemp: 0, spellSlots: {} },
};

test('a janela de dano nunca esconde o "Rolar dano", mesmo perto do fim da tela', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 650 });
  await signIn(page, 'guest', { characters: [MONK], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
  await page.goto('/ficha/mk6');
  const dmg = page.locator('.fv-mesa-atk', { hasText: 'Golpe Desarmado' }).getByRole('button', { name: /DANO/ });
  const scroller = page.locator('.fv-screen-scroll');
  await dmg.scrollIntoViewIfNeeded();
  const before = await scroller.evaluate((el) => el.scrollTop);
  await dmg.click();
  // o ataque está no fim da tela: a janela abre para cima, sem precisar rolar a página
  await expect(page.getByRole('dialog', { name: 'Dano de Golpe Desarmado' })).toHaveClass(/is-up/);
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(before);
  const roll = page.getByRole('dialog', { name: 'Dano de Golpe Desarmado' }).getByRole('button', { name: /^Rolar dano/ });
  // mede onde o botão está SEM rolar a página (o clique do Playwright rolaria sozinho)
  const box = await roll.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.bottom).toBeLessThanOrEqual(box.vh);
  await roll.click();
  await expect(page.getByRole('dialog', { name: 'Dano de Golpe Desarmado' })).toHaveCount(0);
});
