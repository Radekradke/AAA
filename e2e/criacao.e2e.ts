import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
import { signIn } from './fixtures/supabase';

async function tab(page: Page, desktop: string, mobile: string) {
  const top = page.locator('.fv-sheet-tab', { hasText: desktop });
  if (await top.isVisible()) return top.click();
  const nav = page.getByRole('navigation', { name: 'Abas da ficha' });
  const direct = nav.getByRole('button', { name: new RegExp(`^${mobile}`) });
  if (await direct.count()) return direct.first().click();
  await nav.getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('menuitem', { name: new RegExp(mobile) }).click();
}

test.describe('criação de herói', () => {
  test('do zero até a ficha, com as escolhas obrigatórias', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/criar');
    const cta = page.locator('.fv-foot-cta');

    // Origem → Caminho → Passado (padrões: Humano, Guerreiro, Soldado)
    await expect(page.getByRole('button', { name: /Humano/ })).toHaveAttribute('aria-pressed', 'true');
    await cta.click();
    // Caminho: o Guerreiro escolhe o Estilo de Luta já na criação
    await page.getByRole('group', { name: 'Estilo de Luta' }).getByRole('button', { name: /^Defesa/ }).click();
    await cta.click();

    // Passado: o antecedente pede 1 idioma à escolha
    const idiomas = page.getByRole('group', { name: 'Idiomas à escolha' });
    await idiomas.locator('button[aria-pressed="false"]').first().click();
    await cta.click(); // Atributos
    await cta.click(); // Perícias

    // Perícias: Guerreiro escolhe 2
    const livres = page.locator('.fv-skill:not(.is-on)');
    await livres.first().click();
    await livres.first().click();
    await cta.click(); // Equipamento

    // Guerreiro não conjura no 1º nível: a etapa Magias nem aparece
    await expect(page.getByRole('heading', { name: 'Equipamento' })).toBeVisible();
    // Kit do Livro do Jogador: Guerreiro com cota de malha e pacote aberto
    await expect(page.getByText('Kit do Livro do Jogador')).toBeVisible();
    await expect(page.locator('.fv-kit-bag')).toContainText('Pacote de Explorador de Masmorras:');
    await page.getByRole('button', { name: 'Personalizar kit' }).click();
    // (b) couro, arco longo e 20 flechas
    await page.getByRole('radiogroup', { name: 'Armadura' }).getByRole('radio', { name: /Couro, arco longo/ }).click();
    await expect(page.locator('.fv-kit-list')).toContainText('Arco Longo');
    await expect(page.getByText('Kit personalizado')).toBeVisible();
    // regra do livro: trocar o kit pelo ouro da classe (Guerreiro 5d4 × 10, média 125)
    await page.getByRole('button', { name: /Trocar o kit por ouro/ }).click();
    await expect(page.locator('.fv-kit-gold-n')).toContainText('125 po');
    await expect(page.locator('.fv-kit-bag')).toContainText('Do antecedente (Soldado)');
    // volta ao kit que estava escolhido (o personalizado, com arco longo)
    await page.getByRole('button', { name: 'Voltar ao kit' }).click();
    await expect(page.getByText('Kit personalizado')).toBeVisible();
    await expect(page.locator('.fv-kit-list')).toContainText('Arco Longo');
    await expect(page.getByRole('button', { name: 'Fechar personalização' })).toBeVisible(); // a personalização continua aberta
    await cta.click(); // Despertar

    // Sem nome o botão fica travado e diz o que falta
    await expect(cta).toBeDisabled();
    await expect(cta).toHaveAttribute('title', /nome/i);
    await page.getByLabel('Nome', { exact: true }).fill('Brenna Teste');
    await expect(cta).toBeEnabled();
    await cta.click();

    await expect(page).toHaveURL(/\/ficha\/[^/]+$/);
    await expect(page.getByText('Brenna Teste').first()).toBeVisible();

    // continua lá depois de recarregar (salvo no aparelho)
    await page.waitForTimeout(1200); // autosave com debounce de 900 ms
    await page.reload();
    await expect(page.getByText('Brenna Teste').first()).toBeVisible();
  });

  test('escolhas do 1º nível ficam na criação (Clérigo do Conhecimento, Anão)', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/criar');
    const cta = page.locator('.fv-foot-cta');

    // Origem: Anão escolhe a ferramenta ali mesmo
    await page.getByRole('button', { name: /^Anão/ }).click();
    await page.getByRole('group', { name: /Ferramentas \(Anão\)/ }).getByRole('button').first().click();
    await cta.click();

    // Caminho: Clérigo escolhe o domínio e as Bênçãos do Conhecimento
    await page.getByRole('button', { name: /^Clérigo/ }).click();
    await page.getByRole('radiogroup', { name: 'Domínio Divino' }).getByRole('radio', { name: 'Domínio do Conhecimento' }).click();
    for (const name of ['Bênçãos do Conhecimento (idiomas)', 'Bênçãos do Conhecimento (perícias)']) {
      const g = page.getByRole('group', { name });
      await g.locator('button[aria-pressed="false"]').first().click();
      await g.locator('button[aria-pressed="false"]').first().click();
    }
    await expect(page.locator('.fv-lv1 .is-due')).toHaveCount(0);
    await cta.click(); // Passado
    await cta.click(); // Atributos
    await cta.click(); // Perícias
    const livres = page.locator('.fv-skill:not(.is-on)');
    await livres.first().click();
    await livres.first().click();
    await cta.click(); // Magias (o Clérigo conjura no 1º nível)

    // Magias: chega com a sugestão; tirar um truque trava e o rodapé avisa
    await expect(page.getByRole('heading', { name: 'Magias' })).toBeVisible();
    const truques = page.getByRole('group', { name: 'Truques' });
    await expect(truques.locator('button[aria-pressed="true"]')).toHaveCount(3);
    await truques.locator('button[aria-pressed="true"]').first().click();
    await expect(page.locator('.fv-foot-next')).toContainText('1 truque');
    await truques.locator('button[aria-pressed="false"]:not([disabled])').first().click();
    await expect(truques.locator('button[aria-pressed="true"]')).toHaveCount(3);
    await cta.click(); // Equipamento
    await cta.click(); // Despertar
    await page.getByLabel('Nome', { exact: true }).fill('Thoren Teste');
    await expect(cta).toBeEnabled();
    await cta.click();
    await expect(page).toHaveURL(/\/ficha\/[^/]+$/);

    // nada sobra para "Escolhas pendentes" na aba Evoluir
    await expect(page.getByText('Thoren Teste').first()).toBeVisible();
    await tab(page, 'Evoluir', 'Evoluir');
    await expect(page.getByText('Subir para o Nível 2')).toBeVisible();
    await expect(page.getByText('Escolhas pendentes')).toHaveCount(0);
  });
});
