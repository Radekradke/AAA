import type { Page } from '@playwright/test';

/** Testes das regras completas fazem a escolha explícita no novo início da criação. */
export async function chooseFullRules(page: Page) {
  await page.locator('.fv-concept-options, .fv-forge').first().waitFor({ state: 'visible' });
  const button = page.getByRole('button', { name: 'Escolher tudo pelas regras completas' });
  if (await button.isVisible()) await button.click();
}
