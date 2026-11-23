// Mede LCP, FCP e CLS das telas principais num celular médio, sobre o build.
//
//   npm run build && npm run vitals
//
// Celular médio como o Lighthouse: tela 390×844 (3×), CPU 4× mais lenta, 4G
// lenta (150 ms de latência, 1,6 Mbit/s). Duas situações:
//   frio   primeira visita: sem cache e sem service worker
//   quente app já instalado: o service worker serve o código
// Mediana de 3 cargas por tela. Explicação e resultados: docs/DESEMPENHO.md.
// Usa o Chromium do Playwright (PW_CHROMIUM aponta outro, se precisar).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const RUNS = 3;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
for (let i = 0; ; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* ainda subindo */
  }
  if (i > 60) throw new Error('o vite preview não subiu (rodou npm run build?)');
  await new Promise((r) => setTimeout(r, 500));
}

const exe = process.env.PW_CHROMIUM ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});

function observe() {
  if (!localStorage.getItem('fv-ui')) {
    localStorage.setItem('fv-ui', JSON.stringify({ state: { theme: 'astral', onboarded: true, toursSeen: { sheet: true }, dice3d: false }, version: 0 }));
  }
  window.__vitals = { lcp: 0, cls: 0, el: '' };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__vitals.lcp = e.startTime;
      window.__vitals.el = `${e.element?.tagName.toLowerCase() ?? ''}.${String(e.element?.className ?? '').split(' ')[0]}`;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
}

async function measure(ctx, route, cold) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (cold) await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const v = await page.evaluate(() => ({ ...window.__vitals, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0 }));
  await page.close();
  return v;
}

/** Convidado com um herói pronto (Herói rápido), para medir a ficha e a lista. */
async function withHero(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/entrar`);
  await p.getByRole('button', { name: /Continuar offline/i }).first().click();
  await p.goto(`${BASE}/`);
  await p.getByRole('button', { name: /Herói rápido/ }).first().click();
  await p.getByRole('dialog', { name: 'Herói rápido' }).getByRole('button', { name: 'Criar herói' }).click();
  await p.waitForURL(/\/ficha\//);
  const sheet = new URL(p.url()).pathname;
  await p.waitForTimeout(1500);
  // segunda carga: o service worker (quando permitido) assume e guarda o app
  await p.reload();
  await p.waitForTimeout(8000);
  await p.close();
  return sheet;
}

const rows = [];
for (const cold of [true, false]) {
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: cold ? 'block' : 'allow' };
  // visitante novo: tela inicial e Entrar
  const fresh = await browser.newContext(phone);
  await fresh.addInitScript(observe);
  if (!cold) {
    const warm = await fresh.newPage();
    await warm.goto(BASE);
    await warm.waitForTimeout(8000);
    await warm.close();
  }
  const screens = [['Tela inicial', '/', fresh], ['Entrar', '/entrar', fresh]];
  const player = await browser.newContext(phone);
  await player.addInitScript(observe);
  const sheet = await withHero(player);
  screens.push(['Seus heróis', '/personagens', player], ['Ficha', sheet, player]);
  for (const [name, route, ctx] of screens) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(ctx, route, cold));
    runs.sort((a, b) => a.lcp - b.lcp);
    const mid = runs[Math.floor(RUNS / 2)];
    rows.push({ situação: cold ? 'frio' : 'quente', tela: name, 'LCP (ms)': Math.round(mid.lcp), 'FCP (ms)': Math.round(mid.fcp), CLS: Number(Math.max(...runs.map((r) => r.cls)).toFixed(3)), 'maior elemento': mid.el, ok: mid.lcp < 2500 ? 'sim' : 'NÃO' });
  }
  await fresh.close();
  await player.close();
}
await browser.close();
server.kill();
console.table(rows);
