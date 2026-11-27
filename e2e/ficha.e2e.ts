import { test, expect } from './fixtures/test';
import { signIn, WIZARD } from './fixtures/supabase';

const ID = String(WIZARD.id);
const NAME = String(WIZARD.name);

test.describe('ficha', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'guest', { characters: [WIZARD] });
  });

  test('abre e troca de aba', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    for (const aba of ['Combate', 'Inventário', 'Magias', 'Diário', 'Ficha']) {
      const tab = page.locator('.fv-sheet-tab', { hasText: aba });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-current', 'page');
    }
  });

  test('aba Retrato: carta do herói, detalhes e arte em tela cheia @celular', async ({ page }) => {
    await page.goto(`/ficha/${ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(NAME).first()).toBeVisible();
    const aba = page.locator('.fv-sheet-tab', { hasText: 'Retrato' });
    if (await aba.isVisible()) await aba.click();
    else {
      // celular: Retrato fica na gaveta "Mais"
      await page.getByRole('navigation', { name: 'Abas da ficha' }).getByRole('button', { name: 'Mais' }).click();
      await page.getByRole('menuitem', { name: /Retrato/ }).click();
    }
    const vitrine = page.getByRole('region', { name: 'Retrato do herói' });
    await expect(vitrine.getByRole('heading', { name: NAME })).toBeVisible();
    await expect(vitrine.getByLabel('Atributos')).toContainText('INT');
    await vitrine.getByRole('button', { name: `Ver a arte de ${NAME} em tela cheia` }).click();
    const zoom = page.getByRole('dialog', { name: `Arte de ${NAME}` });
    await expect(zoom).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(zoom).toHaveCount(0);
  });

  test('tela de impressão rola até o fim da ficha @celular', async ({ page }) => {
    await page.goto(`/ficha/${ID}/imprimir`);
    const pagina = page.locator('.fv-printpage');
    await expect(page.locator('.fv-ills h1')).toHaveText(NAME);
    const fim = page.locator('.fv-ills-credit');
    await pagina.hover();
    for (let i = 0; i < 40 && !(await fim.evaluate((el) => el.getBoundingClientRect().top < innerHeight)); i++) await page.mouse.wheel(0, 900);
    expect(await pagina.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
    await expect(fim).toBeInViewport();
  });

  test('ficha ilustrada no tema, e a clássica para imprimir', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('menuitem', { name: 'Ficha ilustrada / imprimir' }).click();
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}/imprimir$`));

    // O estilo Retrato continua disponível para destacar a arte do herói.
    await page.getByRole('button', { name: 'Retrato', exact: true }).click();
    const ills = page.locator('.fv-ills');
    await expect(ills.getByRole('heading', { level: 1 })).toHaveText(NAME);
    await expect(ills.getByRole('img', { name: `Retrato de ${NAME}` })).toBeVisible();
    await expect(ills).toHaveAttribute('data-theme', 'astral');
    await page.getByLabel('Tema').selectOption('carmesim');
    await expect(ills).toHaveAttribute('data-theme', 'carmesim');
    await expect(ills).toHaveAttribute('data-mode', 'light');
    // em branco para lápis (padrão) x valores atuais
    await page.getByLabel('PV, usos e moedas em branco (para lápis)').check();
    await expect(ills.locator('.fv-ills-hp .fv-ills-write')).toHaveText('');
    await page.getByLabel('PV, usos e moedas em branco (para lápis)').uncheck();
    await expect(ills.locator('.fv-ills-hp .fv-ills-write')).toHaveText(String(WIZARD.hpCurrent));

    // na impressão só as folhas aparecem
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.fv-printpage-bar').first()).toBeHidden();
    await expect(ills).toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    // clássica: preto no branco
    await page.getByRole('button', { name: 'Clássica' }).click();
    const papel = page.locator('.fv-print');
    await expect(papel.getByRole('heading', { level: 1 })).toHaveText(NAME);
    await expect(papel).toContainText('Testes de resistência');

    // a escolha fica lembrada
    await page.reload();
    await expect(page.locator('.fv-print')).toBeVisible();
  });

  test('PDF temático aplica as quatro artes aos dados do personagem @celular', async ({ page }) => {
    await page.goto(`/ficha/${ID}/imprimir`);
    const sheet = page.locator('.fv-template');
    await expect(page.getByRole('button', { name: 'Temática' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByRole('heading', { level: 1 })).toHaveText(NAME);
    await expect(sheet.locator('.fv-template-skills li')).toHaveCount(18);

    await expect(page.locator('.fv-ills-p2')).toContainText('Magias');

    for (const theme of ['astral', 'carmesim', 'eclipse', 'rubra']) {
      await page.getByLabel('Tema').selectOption(theme);
      await expect(sheet).toHaveAttribute('data-template', theme);
      const art = sheet.locator('.fv-template-art');
      await expect(art).toHaveAttribute('src', `/themes/print/${theme}.webp`);
      await expect.poll(() => art.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }

    const currentHp = sheet.locator('.fv-template-stats > div').filter({ hasText: 'PV atuais' }).locator('dd');
    await expect(currentHp).toHaveText(String(WIZARD.hpCurrent));
    await page.getByLabel('PV, usos e moedas em branco (para lápis)').check();
    await expect(currentHp).toBeEmpty();
    await page.getByLabel('PV, usos e moedas em branco (para lápis)').uncheck();
    await expect(currentHp).toHaveText(String(WIZARD.hpCurrent));
    await page.reload();
    await expect(sheet).toHaveAttribute('data-template', 'rubra');
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Imprimir / Salvar PDF' })).toBeHidden();
    await expect(sheet).toBeVisible();
  });

  test('corrente no retrato: compartilhar por link ou em PDF', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('button', { name: 'Compartilhar a ficha (link, PDF ou JSON)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Compartilhar a ficha' });
    await expect(dialog.getByRole('button', { name: /Por link/ })).toBeVisible();

    // sem conta: o link explica o caminho alternativo
    await dialog.getByRole('button', { name: /Por link/ }).click();
    const link = page.getByRole('dialog', { name: 'Compartilhar por link' });
    await expect(link).toContainText('precisa de uma conta');
    await link.getByRole('button', { name: '‹ Voltar' }).click();

    // PDF: abre a ficha pronta para imprimir
    await page.getByRole('dialog', { name: 'Compartilhar a ficha' }).getByRole('button', { name: /Em PDF/ }).click();
    await expect(page).toHaveURL(new RegExp(`/ficha/${ID}/imprimir$`));
    await expect(page.locator('.fv-ills h1')).toHaveText(NAME);
  });

  test('compartilhar em arquivo: baixa a ficha inteira em JSON', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await page.getByRole('button', { name: 'Compartilhar a ficha (link, PDF ou JSON)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Compartilhar a ficha' });
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: /Em arquivo \(JSON\)/ }).click()]);
    expect(download.suggestedFilename()).toMatch(/^[a-z0-9-]+\.json$/);
    const path = await download.path();
    const data = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
    expect(data.id).toBe(ID);
    expect(data.name).toBe(NAME);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Ficha salva em .*\.json/)).toBeVisible();
  });

  test('trocar a arte fica em Editar (não mais no retrato)', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await expect(page.locator('.fv-sheet-head').getByRole('button', { name: /arte do personagem/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar herói' });
    await expect(dialog).toContainText('Arte do personagem');
    await expect(dialog.getByRole('button', { name: /Sua arte/ })).toBeVisible();
  });

  test('cabe na tela do celular sem rolagem lateral @celular', async ({ page }) => {
    await page.goto(`/ficha/${ID}`);
    await expect(page.getByText(NAME).first()).toBeVisible();
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBeLessThanOrEqual(1);
  });
});
