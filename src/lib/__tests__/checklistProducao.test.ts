import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

describe('checklist de produção', () => {
  it('lista todo SQL de supabase/ (script novo não pode ficar de fora da publicação)', () => {
    const checklist = readFileSync(resolve(root, 'docs/CHECKLIST-PRODUCAO.md'), 'utf8');
    const sqls = readdirSync(resolve(root, 'supabase')).filter((f) => f.endsWith('.sql'));
    expect(sqls.length).toBeGreaterThan(0);
    for (const f of sqls) expect(checklist, `${f} não está no checklist`).toContain(`supabase/${f}`);
  });

  it('cita as variáveis de ambiente que o app lê', () => {
    const checklist = readFileSync(resolve(root, 'docs/CHECKLIST-PRODUCAO.md'), 'utf8');
    for (const v of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) expect(checklist).toContain(v);
  });
});
