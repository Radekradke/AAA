// Guarda do design system (etapa 2.5): a dívida de estilo só pode DIMINUIR.
// Conta, por arquivo:
//   - style={{…}} em componentes (.tsx): estilo solto no lugar de classe + token
//   - cores fixas (#rrggbb) em componentes e no CSS fora dos temas
// e compara com style-debt.json. Arquivo que passa do registrado reprova o CI;
// arquivo novo começa em zero. Quem limpa roda `npm run debt -- --update`
// para baixar o registro no mesmo PR.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const BASELINE = 'style-debt.json';
// paletas e tokens: é aqui que a cor fixa DEVE morar
const ALLOWED = [/^src\/styles\/themes\//, /^src\/styles\/tokens\.css$/, /^src\/data\/themes\.ts$/, /__tests__\//];
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g;
const HEX_IN_STRING = /['"`]#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}

function measure() {
  const counts = {};
  for (const file of walk(ROOT)) {
    const rel = relative('.', file).replaceAll('\\', '/');
    if (ALLOWED.some((re) => re.test(rel))) continue;
    const src = readFileSync(file, 'utf8');
    const c = file.endsWith('.tsx')
      ? { style: (src.match(/style=\{\{/g) ?? []).length, hex: (src.match(HEX_IN_STRING) ?? []).length }
      : { style: 0, hex: (src.replace(/\/\*[\s\S]*?\*\//g, '').match(HEX) ?? []).length };
    if (c.style || c.hex) counts[rel] = c;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

const now = measure();
const total = (m, k) => Object.values(m).reduce((s, c) => s + c[k], 0);

if (process.argv.includes('--update')) {
  // uma linha por arquivo: o diff do PR mostra direto o que mudou
  writeFileSync(BASELINE, '{\n' + Object.entries(now).map(([f, c]) => `  ${JSON.stringify(f)}: ${JSON.stringify(c)}`).join(',\n') + '\n}\n');
  console.log(`style-debt.json atualizado: ${total(now, 'style')} style={{…}}, ${total(now, 'hex')} cores fixas.`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
const worse = [];
const better = [];
for (const [file, c] of Object.entries(now)) {
  const b = base[file] ?? { style: 0, hex: 0 };
  for (const k of ['style', 'hex']) {
    if (c[k] > b[k]) worse.push(`  ${file}: ${k === 'style' ? 'style={{…}}' : 'cor fixa'} ${b[k]} → ${c[k]}`);
    else if (c[k] < b[k]) better.push(file);
  }
}
for (const file of Object.keys(base)) if (!now[file]) better.push(file);

console.log(`Dívida de estilo: ${total(now, 'style')} style={{…}} (registro ${total(base, 'style')}), ${total(now, 'hex')} cores fixas (registro ${total(base, 'hex')}).`);
if (worse.length) {
  console.error('\nA dívida de estilo cresceu:\n' + worse.join('\n'));
  console.error('\nUse classes com os tokens (src/styles/tokens.css, docs/DESIGN-TOKENS.md) e os primitivos de src/components/ui.');
  console.error('style={{…}} só para valor que muda na hora (largura de barra, posição no mapa).');
  process.exit(1);
}
if (better.length) console.log(`Diminuiu em ${new Set(better).size} arquivo(s): rode \`npm run debt -- --update\` para baixar o registro.`);
