// Orçamento do pacote inicial: soma o que o index.html carrega na primeira
// abertura (script de entrada, modulepreload e CSS) e falha o CI se passar
// do limite em bundle-budget.json. Rode depois do `npm run build`.
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dist = 'dist';
const budget = JSON.parse(readFileSync('bundle-budget.json', 'utf8'));
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const files = [...new Set(refs)];
if (!files.length) {
  console.error('Nenhum script ou CSS encontrado em dist/index.html. O build rodou?');
  process.exit(1);
}

const kb = (n) => Math.round(n / 1024);
const total = { js: 0, css: 0, gzip: 0 };
for (const f of files) {
  const path = join(dist, f);
  const raw = statSync(path).size;
  const gz = gzipSync(readFileSync(path)).length;
  total[f.endsWith('.css') ? 'css' : 'js'] += raw;
  total.gzip += gz;
  console.log(`${String(kb(raw)).padStart(6)} KB  ${String(kb(gz)).padStart(5)} KB gzip  ${f}`);
}

const checks = [
  ['JavaScript inicial', total.js, budget.jsKB],
  ['CSS inicial', total.css, budget.cssKB],
  ['Total comprimido (gzip)', total.gzip, budget.gzipKB],
];
let failed = false;
for (const [label, size, limit] of checks) {
  const over = kb(size) > limit;
  failed ||= over;
  console.log(`${over ? '✗' : '✓'} ${label}: ${kb(size)} KB (limite ${limit} KB)`);
}
if (failed) {
  console.error('\nO pacote inicial passou do orçamento. Carregue o novo código sob demanda (import()) ou, se o aumento for justificado, ajuste bundle-budget.json no mesmo PR.');
  process.exit(1);
}
