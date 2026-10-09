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
    await cta.click(); // Caminho
    await cta.click(); // Dons
    // Dons: o Guerreiro escolhe o Estilo de Luta; o painel explica antes de escolher
    await expect(page.getByRole('heading', { name: 'Dons' })).toBeVisible();
    const estilos = page.getByRole('group', { name: 'Estilo de Luta' });
    await estilos.getByRole('button', { name: /^Defesa/ }).hover();
    await expect(page.locator('.fv-detail h3')).toHaveText('Defesa');
    await estilos.getByRole('button', { name: /^Defesa/ }).click();
    await expect(page.locator('.fv-gift-stop.is-done')).toContainText('Defesa');
    await cta.click(); // Passado

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
    // dica de item (BG3): passar o mouse no nome mostra CA, exigências, peso e preço
    await page.locator('.fv-kit-list .fv-item-tip', { hasText: 'Cota de Malha' }).hover();
    const dica = page.getByRole('tooltip');
    await expect(dica).toContainText('CA 16');
    await expect(dica).toContainText('Exige FOR 13');
    await expect(dica).toContainText('75 po');
    await page.mouse.move(5, 5);
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

    // Origem: Anão
    await page.getByRole('button', { name: /^Anão/ }).click();
    await cta.click();

    // Caminho: Clérigo
    await page.getByRole('button', { name: /^Clérigo/ }).click();
    await expect(page.locator('.fv-detail')).toContainText('Dons (1º nível)');
    await cta.click();

    // Dons: domínio primeiro; as Bênçãos do Conhecimento surgem na trilha
    const track = page.getByRole('navigation', { name: 'Decisões do 1º nível' });
    await page.getByRole('group', { name: 'Domínio Divino' }).getByRole('button', { name: /Domínio do Conhecimento/ }).click();
    await expect(page.locator('.fv-detail')).toContainText('Magias de domínio');
    for (const [name, n] of [['Bênçãos do Conhecimento (idiomas)', 2], ['Bênçãos do Conhecimento (perícias)', 2], ['Proficiência com Ferramentas (Anão)', 1]] as const) {
      await track.getByRole('button', { name: new RegExp(name.replace(/[()]/g, '\\$&')) }).click();
      const g = page.getByRole('group', { name });
      for (let i = 0; i < n; i++) await g.locator('button[aria-pressed="false"]').first().click();
    }
    await expect(track.locator('.fv-gift-stop:not(.is-done)')).toHaveCount(0);
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

  test('Dons no celular: tocar no cartão abre a gaveta com o que ele faz @celular', async ({ page }) => {
    test.skip(test.info().project.name !== 'celular');
    await signIn(page, 'guest');
    await page.goto('/criar');
    const cta = page.locator('.fv-foot-cta');
    await cta.click(); // Caminho
    await page.getByRole('button', { name: /^Bardo/ }).click();
    await cta.click(); // Dons
    const grupo = page.getByRole('group', { name: 'Instrumentos musicais' });
    await grupo.getByRole('button', { name: /^Alaúde/ }).click();
    const gaveta = page.getByRole('dialog', { name: 'Alaúde' });
    await expect(gaveta).toContainText('O que entra na ficha');
    await expect(grupo.getByRole('button', { name: /^Alaúde/ })).toHaveAttribute('aria-pressed', 'false'); // só mostrou
    await gaveta.getByRole('button', { name: 'Escolher Alaúde' }).click();
    await expect(gaveta).toHaveCount(0);
    await expect(grupo.getByRole('button', { name: /^Alaúde/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.fv-gift-stop')).toContainText('1 de 3');
  });
});
