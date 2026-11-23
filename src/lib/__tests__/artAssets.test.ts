import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ASSETS = resolve(__dirname, '../../assets');
const IMAGE = /\.(webp|png|jpe?g)$/i;
const folders = readdirSync(ASSETS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe('arte em src/assets', () => {
  it.each(folders)('%s: nenhuma imagem vazia ou corrompida', (folder) => {
    for (const f of readdirSync(resolve(ASSETS, folder)).filter((n) => IMAGE.test(n))) {
      const buf = readFileSync(resolve(ASSETS, folder, f));
      expect(buf.length, `${folder}/${f} está vazio`).toBeGreaterThan(0);
      if (f.endsWith('.webp')) expect(buf.toString('ascii', 8, 12), `${folder}/${f} não é WebP`).toBe('WEBP');
    }
  });

  // as cartas aparecem com no máximo 180 px de largura; o original grande fica em arte-original/
  it.each(['magias', 'itens'])('%s: cartas no tamanho do app (até 560 px de largura)', (folder) => {
    for (const f of readdirSync(resolve(ASSETS, folder)).filter((n) => n.endsWith('.webp'))) {
      const b = readFileSync(resolve(ASSETS, folder, f));
      const chunk = b.toString('ascii', 12, 16);
      const width =
        chunk === 'VP8X' ? 1 + b.readUIntLE(24, 3) : chunk === 'VP8L' ? 1 + (b.readUInt16LE(21) & 0x3fff) : b.readUInt16LE(26) & 0x3fff;
      expect(width, `${folder}/${f} tem ${width} px: rode npm run art -- ${folder}`).toBeLessThanOrEqual(560);
    }
  });
});
