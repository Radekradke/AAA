import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const bow = {
  uid: 'bow', itemId: 'w-shortbow', name: 'Arco Curto', category: 'weapon', note: '', rarity: 'comum', weight: 1, quantity: 1, favorite: false, attuned: false,
  weapon: { damageDice: 1, damageDie: 6, damageType: 'perfurante', type: 'simple', range: 'ranged', properties: ['Munição', 'Duas mãos'], rangeLabel: '24/96 m' },
};
// aljava quase vazia: o pacote aberto tem 2 flechas
const arrows = { uid: 'arr', itemId: 'g-arrows', name: 'Flechas (20)', category: 'gear', note: 'Para arcos', rarity: 'comum', weight: 0.5, quantity: 1, favorite: false, attuned: false, ammoLeft: 2 };
const HERO = {
  ...WIZARD,
  inventory: [...(WIZARD.inventory as unknown[]), bow, arrows],
  equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: 'bow' },
};

async function openCombat(page: Page) {
  const tab = page.locator('.fv-sheet-tab', { hasText: 'Combate' });
  if (await tab.isVisible()) return tab.click();
  await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Combate', exact: true }).click();
}

test.describe('munição', () => {
  test('cada disparo do arco gasta uma flecha; desfazer, acabar e recolher @celular', async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { dice3d: false } });
    await page.goto(`/ficha/${ID}`);
    await openCombat(page);
    // dado no meio: sem crítico nem tropeço cobrindo a tela
    await page.evaluate(() => { Math.random = () => 0.5; });

    const badge = page.locator('.fv-ammo-badge');
    const shoot = () => page.getByRole('button', { name: /ACERTO/ }).click();
    const pop = page.getByRole('dialog', { name: /acertou\?/ });
    await expect(badge).toHaveText('2 flechas');

    // disparo: −1 flecha, e dá para desfazer (clique sem querer)
    await shoot();
    await expect(pop).toContainText('−1 flecha · sobram 1');
    await expect(badge).toHaveText('1 flecha');
    await pop.getByRole('button', { name: 'Desfazer' }).click();
    await expect(badge).toHaveText('2 flechas');
    await pop.getByRole('button', { name: 'Fechar' }).click();

    // dois disparos: a última flecha avisa, e a aljava fica vazia
    await shoot();
    await shoot();
    await expect(pop).toContainText('era a última!');
    await expect(badge).toHaveText('sem flechas');
    await pop.getByRole('button', { name: 'Fechar' }).click();

    // sem flechas: não rola sozinho, avisa e oferece atirar mesmo assim
    await shoot();
    await expect(pop).toHaveCount(0);
    await expect(page.getByText('Sem flechas na Mochila.')).toBeVisible();

    // depois da luta: recolhe metade das 2 disparadas
    await page.getByRole('button', { name: 'Recolher +1' }).click();
    await expect(badge).toHaveText('1 flecha');
    await expect(page.getByRole('button', { name: /Recolher/ })).toHaveCount(0);
  });
});
