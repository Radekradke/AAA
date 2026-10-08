import { test, expect } from './fixtures/test';
import { signIn } from './fixtures/supabase';
import { readFileSync } from 'node:fs';

// o exemplo do próprio guia que vai para o ChatGPT (docs/CRIAR-COM-CHATGPT.md)
const guide = readFileSync(new URL('../docs/CRIAR-COM-CHATGPT.md', import.meta.url), 'utf8');
const GUIDE_EXAMPLE = JSON.parse(guide.match(/```json\n([\s\S]*?)\n```/)![1]) as Record<string, unknown>;

test.describe('colar ficha do ChatGPT', () => {
  test('cola a resposta inteira do ChatGPT e abre o herói pronto @celular', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/personagens');
    await page.getByRole('button', { name: 'Colar ficha (ChatGPT)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Colar ficha' });
    // resposta "de verdade": texto em volta e cerca ```json
    const resposta = `Aqui está a Lyra!\n\n\`\`\`json\n${JSON.stringify(GUIDE_EXAMPLE, null, 2)}\n\`\`\`\nBoa aventura.`;
    await dialog.getByLabel('Texto da ficha').fill(resposta);
    // clicar fora não fecha enquanto há texto
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Importar herói' }).click();
    await expect(page).toHaveURL(/\/ficha\//);
    await expect(page.getByText('Lyra Ventobranco').first()).toBeVisible();
    await expect(page.getByText(/Mago/).first()).toBeVisible();
  });

  test('mostra os ajustes antes de abrir e avisa JSON inválido', async ({ page }) => {
    await signIn(page, 'guest');
    await page.goto('/personagens');
    await page.getByRole('button', { name: 'Colar ficha (ChatGPT)' }).click();
    const box = page.getByLabel('Texto da ficha');
    await box.fill('isso não é uma ficha');
    await page.getByRole('button', { name: 'Importar herói' }).click();
    await expect(page.getByRole('alert')).toContainText('Não consegui ler');

    await box.fill(JSON.stringify({ ...GUIDE_EXAMPLE, nome: 'Torvak', raca: 'Hobbit' }));
    await page.getByRole('button', { name: 'Importar herói' }).click();
    const done = page.getByRole('dialog', { name: 'Herói importado' });
    await expect(done).toContainText('Raça "Hobbit" não encontrada');
    await done.getByRole('button', { name: 'Abrir a ficha' }).click();
    await expect(page).toHaveURL(/\/ficha\//);
    await expect(page.getByText('Torvak').first()).toBeVisible();
  });
});
