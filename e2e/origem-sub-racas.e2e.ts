import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';
// raça homebrew pronta (resumo do Aasimar de src/data/racePresets.ts)
const AASIMAR = {
  id: 'preset-aasimar', icon: 'angel-wings', label: 'Aasimar', mono: 'AA', jewel: '#C9A227',
  abilityBonus: { cha: 2 }, bonus: '+2 CAR', speed: 9, darkvision: 18, size: 'Médio', homebrew: true,
  desc: 'Mortais tocados pelos planos celestiais: carregam uma centelha divina e um guia espiritual que fala em sonhos.',
  languages: ['Comum', 'Celestial'], resistances: ['necrótico', 'radiante'], traits: ['Resistência Celestial', 'Mãos Curativas'],
  traitDetails: [
    { name: 'Resistência Celestial', desc: 'Resistência a dano necrótico e radiante.' },
    { name: 'Mãos Curativas', desc: 'Ação: toque numa criatura e restaure PV iguais ao seu nível. 1 uso por descanso longo.' },
  ],
  subraces: [
    { id: 'preset-aasimar-protetor', label: 'Aasimar Protetor', abilityBonus: { wis: 1 }, bonus: '+1 SAB', desc: 'Guardiões da luz, encarregados de proteger os fracos.', traitDetails: [{ name: 'Alma Radiante', desc: 'Asas espectrais.' }] },
    { id: 'preset-aasimar-flagelo', label: 'Aasimar Flagelo', abilityBonus: { con: 1 }, bonus: '+1 CON', desc: 'Movidos por uma fúria divina contra o mal.', traitDetails: [{ name: 'Consumo Radiante', desc: 'Luz forte.' }] },
    { id: 'preset-aasimar-caido', label: 'Aasimar Caído', abilityBonus: { str: 1 }, bonus: '+1 FOR', desc: 'Tocados pela escuridão — a centelha divina virou sombra.', traitDetails: [{ name: 'Mortalha Necrótica', desc: 'Asas sombrias.' }] },
  ],
};

test.describe('origem: sub-raças explicadas e balão das raças homebrew', () => {
  test('frase curta da sublinhagem e resumo da raça homebrew no balão', async ({ page }) => {
    // biblioteca homebrew com o Aasimar pronto
    await page.addInitScript((race) => {
      localStorage.setItem('fv-homebrew', JSON.stringify({ state: { races: [race] }, version: 1 }));
    }, AASIMAR);
    await signIn(page, 'guest', { ui: { onboarded: true, toursSeen: { creator: true }, dice3d: false } });
    await page.goto('/criar');

    // sublinhagem do livro: a escolhida ganha uma frase curta
    await page.getByRole('button', { name: /^Anão/ }).first().click();
    const subs = page.getByRole('group', { name: 'Sublinhagem' });
    await subs.getByRole('button', { name: /Anão da Colina/ }).click();
    await expect(page.locator('.fv-sub-desc')).toContainText('1 PV a mais');
    await subs.getByRole('button', { name: /Anão da Montanha/ }).click();
    await expect(page.locator('.fv-sub-desc')).toContainText('armaduras leves e médias');

    // raça homebrew: o balão resume a raça, os traços e cada sub-raça
    const tile = page.getByRole('group', { name: 'Raças homebrew' }).getByRole('button', { name: /Aasimar/ });
    await tile.hover();
    const tip = page.locator('.fv-lore-tooltip');
    await expect(tip).toContainText('centelha divina');
    await expect(tip).toContainText('Mãos Curativas');
    await expect(tip).toContainText('• Aasimar Protetor');
    await expect(tip).toContainText('• Aasimar Caído');

    // escolhida: a sub-raça homebrew também mostra a frase dela
    await tile.click();
    await page.getByRole('group', { name: 'Sublinhagem' }).getByRole('button', { name: /Aasimar Flagelo/ }).click();
    await expect(page.locator('.fv-sub-desc')).toContainText('fúria divina');
  });
});
