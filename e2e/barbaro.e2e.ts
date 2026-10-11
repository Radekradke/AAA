import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn, WIZARD } from './fixtures/supabase';

// bárbaro 11 (Furioso), humano, sem armadura
const HERO = {
  ...WIZARD, id: 'bb11', name: 'Grok', raceId: 'human', subraceId: null, classId: 'barbarian', level: 11,
  classLevels: [{ classId: 'barbarian', level: 11 }], subclassId: 'berserker',
  baseAbilities: { str: 16, dex: 14, con: 15, int: 8, wis: 10, cha: 10 },
  knownSpells: [], preparedSpells: [], hpCurrent: 30,
  combat: { ...(WIZARD.combat as Record<string, unknown>), resources: {}, marks: [], conditions: [], exhaustion: 0, hpTemp: 0 },
};

async function tab(page: Page, name: string) {
  await page.locator('.fv-sheet-tab', { hasText: name }).click();
}
const hp = async (page: Page) => Number((await page.locator('.fv-hp-num').first().innerText()).match(/\d+/)?.[0]);

test.describe('bárbaro: Fúria de verdade', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [HERO], ui: { onboarded: true, toursSeen: { sheet: true }, dice3d: false } });
    await page.goto('/ficha/bb11');
    await tab(page, 'Combate');
  });

  test('entrar em Fúria gasta uso, dá resistência e a Fúria Implacável segura a 1 PV', async ({ page }) => {
    const rage = page.getByRole('region', { name: 'Fúria do Bárbaro' });
    await expect(rage.getByRole('button', { name: /Entrar em Fúria/ })).toContainText('usos 4/4');
    await rage.getByRole('button', { name: /Entrar em Fúria/ }).click();
    await expect(rage).toContainText('Em Fúria');
    await expect(rage).toContainText('usos 3/4');
    await expect(rage).toContainText('Resistência a concussão, cortante e perfurante');

    // dano com a resistência ligada: 10 → 5
    const before = await hp(page);
    await page.getByLabel('Valor de dano ou cura').fill('10');
    await page.getByRole('button', { name: 'Aplicar dano' }).click();
    await expect.poll(() => hp(page)).toBe(before - 5);

    // cai a 0 em Fúria (60 → 30, sem dano maciço): salvaguarda de CON CD 10 — com dado alto, fica com 1 PV
    await page.evaluate(() => { Math.random = () => 0.99; });
    await page.getByLabel('Valor de dano ou cura').fill('60');
    await page.getByRole('button', { name: 'Aplicar dano' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Fúria Implacável' });
    await expect(alert).toContainText('CD 10');
    await alert.getByRole('button', { name: /Rolar/ }).click();
    await expect.poll(() => hp(page)).toBe(1);
  });

  test('Frenesi cobra exaustão ao encerrar; Ataque Imprudente aparece nos efeitos', async ({ page }) => {
    const rage = page.getByRole('region', { name: 'Fúria do Bárbaro' });
    await rage.getByRole('button', { name: 'Ataque Imprudente' }).click();
    await expect(page.getByText(/Imprudente · inimigos com vantagem/)).toBeVisible();
    await rage.getByRole('button', { name: /com Frenesi/ }).click();
    await expect(rage).toContainText('com Frenesi');
    await rage.getByRole('button', { name: /Encerrar Fúria \(\+1 exaustão\)/ }).click();
    await expect(page.getByText('Frenesi: a Fúria acabou e você ganhou 1 nível de exaustão.')).toBeVisible();
    await expect(rage.getByRole('button', { name: /Entrar em Fúria/ })).toContainText('usos 3/4');
  });

  test('em Fúria, teste de FOR rola com vantagem', async ({ page }) => {
    await page.getByRole('region', { name: 'Fúria do Bárbaro' }).getByRole('button', { name: /Entrar em Fúria/ }).click();
    await tab(page, 'Ficha');
    await page.locator('.fv-ability-row .fv-lore-anchor > div').first().click();
    await expect(page.locator('body')).toContainText('vantagem: Fúria');
  });
});
