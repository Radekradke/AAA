import { test as base, expect } from '@playwright/test';

/**
 * `test` com uma guarda: qualquer erro de JavaScript não tratado na página
 * (pageerror) reprova o teste, mesmo que as asserções tenham passado.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await use(errors);
      expect(errors, 'erros de JavaScript na página').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
