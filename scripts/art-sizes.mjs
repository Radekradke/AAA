// Gera a arte no tamanho que o app mostra, a partir dos originais em arte-original/.
//
//   npm run art -- magias          só o que falta ou mudou
//   npm run art -- magias --all    refaz tudo
//
// Os originais (magias 1122×1402, itens 800×1000) ficam fora de src/ e não entram no site.
// A maior exibição da carta (magia ou item) é 180 px de largura; 560 px cobre telas 3×.
// Redimensiona com o canvas do Chromium do Playwright (já instalado para os testes).
// Fora do container do projeto, PW_CHROMIUM aponta outro executável se precisar.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const KINDS = {
  magias: { src: 'arte-original/magias', out: 'src/assets/magias', width: 560, quality: 0.82 },
  itens: { src: 'arte-original/itens', out: 'src/assets/itens', width: 560, quality: 0.82 },
};

const [kind, ...flags] = process.argv.slice(2);
const cfg = KINDS[kind];
if (!cfg) {
  console.error(`uso: npm run art -- <${Object.keys(KINDS).join('|')}> [--all]`);
  process.exit(1);
}
const all = flags.includes('--all');
fs.mkdirSync(cfg.out, { recursive: true });

const files = fs.readdirSync(cfg.src).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).filter((f) => {
  if (all) return true;
  const out = path.join(cfg.out, f.replace(/\.[a-z]+$/i, '.webp'));
  return !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(path.join(cfg.src, f)).mtimeMs;
});
if (!files.length) {
  console.log('nada a fazer: a arte já está no tamanho do app');
  process.exit(0);
}

const exe = process.env.PW_CHROMIUM ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');

let before = 0;
let after = 0;
for (const f of files) {
  const buf = fs.readFileSync(path.join(cfg.src, f));
  if (!buf.length) throw new Error(`${f} está vazio: gere a arte de novo`);
  const mime = f.endsWith('.png') ? 'image/png' : /\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/webp';
  const b64 = await page.evaluate(
    async ({ data, mime, width, quality }) => {
      const img = new Image();
      img.src = `data:${mime};base64,${data}`;
      await img.decode();
      const w = Math.min(width, img.naturalWidth);
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
      const c = document.getElementById('c');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise((r) => c.toBlob(r, 'image/webp', quality));
      const u = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    },
    { data: buf.toString('base64'), mime, width: cfg.width, quality: cfg.quality },
  );
  const out = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(cfg.out, f.replace(/\.[a-z]+$/i, '.webp')), out);
  before += buf.length;
  after += out.length;
}
await browser.close();
console.log(`${files.length} arquivo(s): ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
