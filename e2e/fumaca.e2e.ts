import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { C, M, SHARE_TOKEN, INVITE_CODE, WIZARD, installSupabase, signIn } from './fixtures/supabase';

/**
 * Teste de fumaça: cada uma das 16 páginas abre sem tela de erro e sem
 * erro no console, no PC e no celular. Erros de JavaScript não tratados
 * já reprovam pelo fixture `test`; aqui também contam os console.error.
 */
const HERO = { ...WIZARD, id: String(WIZARD.id), name: String(WIZARD.name), ownerId: M };

const PAGES: { name: string; path: string; ready: (p: Page) => Promise<void> }[] = [
  { name: 'Início', path: '/', ready: (p) => expect(p.getByRole('heading', { name: 'FICHA VIVA' })).toBeVisible() },
  { name: 'Entrar', path: '/entrar', ready: (p) => expect(p.locator('body')).not.toBeEmpty() },
  { name: 'Retorno do login', path: '/auth/callback', ready: (p) => expect(p.locator('body')).not.toBeEmpty() },
  { name: 'Diagnóstico', path: '/diagnostico', ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
  { name: 'Oficina de retratos', path: '/retratos', ready: (p) => expect(p.getByText(/Solte aqui as artes originais/)).toBeVisible() },
  { name: 'Configurações', path: '/config', ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
  { name: 'Heróis', path: '/personagens', ready: (p) => expect(p.getByText(HERO.name).first()).toBeVisible() },
  { name: 'Continuar', path: '/continuar', ready: (p) => expect(p.locator('body')).not.toBeEmpty() },
  { name: 'Criação', path: '/criar', ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
  { name: 'Ficha', path: `/ficha/${HERO.id}`, ready: (p) => expect(p.getByText(HERO.name).first()).toBeVisible() },
  { name: 'Impressão', path: `/ficha/${HERO.id}/imprimir`, ready: (p) => expect(p.getByText(HERO.name).first()).toBeVisible() },
  { name: 'Mesas', path: '/mesas', ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
  { name: 'Sala da campanha', path: `/mesa/${C}`, ready: (p) => expect(p.locator('.fv-invite-code')).toBeVisible() },
  { name: 'Mesa ao vivo', path: `/mesa/${C}/jogar`, ready: (p) => expect(p.getByRole('main', { name: 'Palco' })).toBeVisible() },
  { name: 'Convite', path: `/sala/${INVITE_CODE}`, ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
  { name: 'Ficha compartilhada', path: `/f/${SHARE_TOKEN}`, ready: (p) => expect(p.getByRole('heading').first()).toBeVisible() },
];

test.describe('fumaça: as 16 páginas abrem limpas', () => {
  for (const pg of PAGES) {
    test(`${pg.name} (${pg.path}) @celular`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      await signIn(page, 'master', { characters: [HERO] });
      await installSupabase(page, 'master');
      await page.goto(pg.path);
      await pg.ready(page);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.fv-crash')).toHaveCount(0);
      expect(consoleErrors, 'erros no console').toEqual([]);
    });
  }
});
