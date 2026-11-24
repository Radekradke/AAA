import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const version = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }).version;

describe('versão, changelog e notas', () => {
  it('a primeira versão do CHANGELOG.md é a do package.json', () => {
    const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
    expect(/^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog)?.[1]).toBe(version);
  });

  it('as notas da versão começam pela mesma versão', () => {
    const notas = readFileSync(resolve(root, 'docs/NOTAS-DA-VERSAO.md'), 'utf8');
    expect(/^## Versão (\d+\.\d+\.\d+)/m.exec(notas)?.[1]).toBe(version);
  });
});
