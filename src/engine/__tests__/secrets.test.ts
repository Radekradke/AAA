import { describe, expect, it } from 'vitest';
import { evaluateSecret, rulesSummary, skillOfRoll } from '../secrets';
import type { Seeker } from '../secrets';
import { visibilityPolygon } from '../vision';
import type { SecretRules } from '@/types/stage';

const B = { x0: 0, y0: 0, x1: 20, y1: 20 };
const spot = { x: 10.5, y: 5.5 };
const seeker = (p: Partial<Seeker> = {}): Seeker => ({
  tokenId: 't1',
  name: 'Kael',
  ownerId: 'u1',
  sheetId: 's1',
  at: { x: 8.5, y: 5.5 },
  sight: [],
  passive: { perception: 12, investigation: 10 },
  items: [],
  ...p,
});
const rules = (r: Partial<SecretRules>): { rules: SecretRules } => ({ rules: { mode: 'any', ...r } });

describe('segredos do mapa', () => {
  it('sem condição, só o mestre revela', () => {
    expect(evaluateSecret(rules({}), spot, [seeker()], [])).toBeNull();
    expect(rulesSummary({ mode: 'any' })).toBe('Só pela sua mão');
  });

  it('proximidade exige estar perto e com linha de visão', () => {
    expect(evaluateSecret(rules({ near: 3 }), spot, [seeker()], [])?.by?.name).toBe('Kael');
    expect(evaluateSecret(rules({ near: 3 }), spot, [seeker({ at: { x: 2.5, y: 5.5 } })], [])).toBeNull();
    // parede entre o herói e o baú
    const wall = [{ x1: 9.5, y1: 0, x2: 9.5, y2: 20 }];
    const sight = visibilityPolygon({ x: 8.5, y: 5.5 }, wall, B);
    expect(evaluateSecret(rules({ near: 3 }), spot, [seeker({ sight })], [])).toBeNull();
  });

  it('Percepção passiva da ficha contra a CD, ao alcance', () => {
    const r = rules({ passive: { skill: 'perception', dc: 14 } });
    expect(evaluateSecret(r, spot, [seeker()], [])).toBeNull();
    const hit = evaluateSecret(r, spot, [seeker(), seeker({ tokenId: 't2', name: 'Lyra', passive: { perception: 15, investigation: 9 } })], []);
    expect(hit?.by?.name).toBe('Lyra');
    expect(hit?.why).toEqual(['Percepção passiva 15 ≥ CD 14']);
    // longe demais (alcance padrão 9 m = 6 casas)
    expect(evaluateSecret(r, spot, [seeker({ at: { x: 1.5, y: 5.5 }, passive: { perception: 20, investigation: 0 } })], [])).toBeNull();
  });

  it('teste rolado recente e do herói certo', () => {
    const r = rules({ check: { skill: 'investigation', dc: 15 } });
    const now = 1_000_000;
    expect(evaluateSecret(r, spot, [seeker()], [{ sheetId: 's1', skill: 'investigation', total: 17, at: now - 10_000 }], now)?.why).toEqual(['Investigação 17 ≥ CD 15']);
    expect(evaluateSecret(r, spot, [seeker()], [{ sheetId: 's1', skill: 'investigation', total: 12, at: now }], now)).toBeNull();
    expect(evaluateSecret(r, spot, [seeker()], [{ sheetId: 's2', skill: 'investigation', total: 20, at: now }], now)).toBeNull();
    expect(evaluateSecret(r, spot, [seeker()], [{ sheetId: 's1', skill: 'investigation', total: 20, at: now - 10 * 60_000 }], now)).toBeNull();
  });

  it('"todas" exige tudo do mesmo herói; o gatilho vale para todos', () => {
    const r: { rules: SecretRules } = { rules: { mode: 'all', near: 3, item: 'chave do barão', flag: { label: 'Alavanca puxada', on: false } } };
    const kael = seeker({ items: ['Corda', 'Chave do Barão'] });
    expect(evaluateSecret(r, spot, [kael], [])).toBeNull();
    r.rules.flag!.on = true;
    expect(evaluateSecret(r, spot, [kael], [])?.why).toEqual(['a 3 m', 'carrega Chave do Barão', 'Alavanca puxada']);
    expect(evaluateSecret(r, spot, [seeker()], [])).toBeNull();
    // só o gatilho: revela sem herói
    expect(evaluateSecret({ rules: { mode: 'any', flag: { label: 'Alavanca', on: true } } }, spot, [], [])?.by).toBeNull();
  });

  it('lê o teste pelo rótulo da rolagem', () => {
    expect(skillOfRoll('Teste de Percepção (SAB)')).toBe('perception');
    expect(skillOfRoll('INVESTIGAÇÃO')).toBe('investigation');
    expect(skillOfRoll('Atletismo')).toBeNull();
    expect(rulesSummary({ mode: 'all', near: 3, passive: { skill: 'perception', dc: 14 } })).toBe('a 3 m + Percepção passiva 14');
  });
});
