import { describe, it, expect } from 'vitest';
import { SPELL_BY_ID, SPELLS } from '@/data/spells';
import { damageRoll, damageTiming, hasAgonizingBlast, healRoll, isFixedRoll, parseDiceGroups, spellAttackPlan, spellHitDamage, upcastDice } from '../spellCast';

const sp = (id: string) => {
  const s = SPELL_BY_ID[id];
  if (!s) throw new Error(`magia ${id} não existe`);
  return s;
};

describe('conjurar: dados de dano e cura', () => {
  it('lê grupos de dados diferentes, fixo e modificador', () => {
    expect(parseDiceGroups('2d8 + 4d6')).toEqual({ groups: [{ n: 2, d: 8 }, { n: 4, d: 6 }], flat: 0, mod: false });
    expect(parseDiceGroups('7d8 + 30')).toEqual({ groups: [{ n: 7, d: 8 }], flat: 30, mod: false });
    expect(parseDiceGroups('1d8 + mod.')).toEqual({ groups: [{ n: 1, d: 8 }], flat: 0, mod: true });
    expect(parseDiceGroups('20')).toEqual({ groups: [], flat: 20, mod: false });
    expect(parseDiceGroups('variado')).toBeNull();
  });

  it('Tempestade de Gelo rola 2d8 + 4d6 (e o círculo acima soma d8)', () => {
    const r = damageRoll(sp('sp-tempestade'), 4, 7)!;
    expect([r.count, r.sides, r.extra]).toEqual([2, 8, [{ count: 4, sides: 6 }]]);
    expect(damageRoll(sp('sp-tempestade'), 6, 11)!.count).toBe(4);
  });

  it('Raio do Caos: o crítico dobra todos os dados, não só o primeiro tipo', () => {
    const plan = spellAttackPlan(sp('xge-chaos-bolt'), 1, 3)!;
    const crit = spellHitDamage(plan, ['crit'])!;
    expect([crit.count, crit.sides, crit.extra]).toEqual([4, 8, [{ count: 2, sides: 6 }]]);
  });

  it('Faca de Gelo: 1d10 no acerto e a explosão de frio (com o círculo) sai sempre', () => {
    const plan = spellAttackPlan(sp('xge-ice-knife'), 3, 5)!;
    expect([plan.perHit.count, plan.perHit.sides]).toEqual([1, 10]);
    expect([plan.area?.count, plan.area?.sides]).toEqual([4, 6]);
    expect(spellHitDamage(plan, ['miss'])).toBeNull();
  });

  it('aumento a cada dois círculos e "por círculo" sem "acima"', () => {
    expect(upcastDice(sp('sp-espiritual'))).toEqual({ n: 1, d: 8, every: 2 });
    expect(damageRoll(sp('sp-espiritual'), 3, 5, null, 3)!.count).toBe(1);
    expect(damageRoll(sp('sp-espiritual'), 4, 7, null, 3)!.count).toBe(2);
    expect(damageRoll(sp('xge-catapult'), 3, 5)!.count).toBe(5);
  });

  it('dano com "+ mod." soma o modificador de conjuração', () => {
    expect(damageRoll(sp('sp-espiritual'), 2, 3, null, 4)!.bonus).toBe(4);
    expect(damageRoll(sp('xge-magic-stone'), 0, 1, null, 3)!.bonus).toBe(3);
  });

  it('dano e cura fixos não viram rolagem', () => {
    const g = damageRoll(sp('phb-guardian-faith'), 4, 7)!;
    expect(isFixedRoll(g) && g.bonus).toBe(20);
    const h = healRoll(sp('phb-heal'), 6, 3)!;
    expect(isFixedRoll(h) && h.bonus).toBe(70);
  });
});

describe('quando o dano acontece', () => {
  it('Destruições e Escudo de Fogo: no acerto; Raio Lunar e Espíritos Guardiões: na área; Bruxaria: marca', () => {
    for (const id of ['phb-searing-smite', 'phb-branding-smite', 'phb-fire-shield', 'tce-booming-blade', 'tce-spirit-shroud']) expect(damageTiming(sp(id))).toBe('rider');
    for (const id of ['phb-moonbeam', 'phb-spirit-guardians', 'phb-cloud-daggers', 'phb-spike-growth', 'phb-guardian-faith']) expect(damageTiming(sp(id))).toBe('trigger');
    expect(damageTiming(sp('phb-hex'))).toBe('mark');
    expect(damageTiming(sp('phb-hunters-mark'))).toBe('mark');
  });

  it('Bola de Fogo, Mísseis, Muralha de Fogo e magias de ataque: na hora', () => {
    for (const id of ['sp-bolafogo', 'sp-misseis', 'sp-muralha', 'sp-firebolt', 'sp-espiritual', 'phb-bigbys-hand']) expect(damageTiming(sp(id))).toBe('now');
  });

  it('toda magia de dano rolável na hora tem uma rolagem', () => {
    const missing = SPELLS.filter((s) => s.damage && !s.attack && damageTiming(s) === 'now' && !damageRoll(s, Math.max(1, s.level), 1)).map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('Explosão Agonizante (invocação do Bruxo)', () => {
  it('reconhece a invocação escolhida na evolução', () => {
    expect(hasAgonizingBlast({ 'warlock.invocation': ['devilSight', 'agonizingBlast'] })).toBe(true);
    expect(hasAgonizingBlast({ 'warlock.invocation': ['devilSight'] })).toBe(false);
    expect(hasAgonizingBlast(undefined)).toBe(false);
  });

  it('soma o CAR em CADA feixe da Rajada Mística que acerta', () => {
    // nível 5: 2 feixes; CAR +3
    const plan = spellAttackPlan(sp('sp-eldritch'), 0, 5, null, { agonizing: 3 })!;
    expect(plan.beams).toBe(2);
    expect(plan.perHit).toMatchObject({ count: 1, sides: 10, bonus: 3 });
    expect(spellHitDamage(plan, ['hit', 'hit'])).toMatchObject({ count: 2, sides: 10, bonus: 6 });
    // um acerto e um erro: só +3; crítico dobra os dados, não o CAR
    expect(spellHitDamage(plan, ['hit', 'miss'])).toMatchObject({ count: 1, bonus: 3 });
    expect(spellHitDamage(plan, ['crit', 'miss'])).toMatchObject({ count: 2, bonus: 3 });
  });

  it('não mexe em outras magias de ataque', () => {
    const plan = spellAttackPlan(sp('sp-firebolt'), 0, 5, null, { agonizing: 3 });
    expect(plan?.perHit.bonus ?? 0).toBe(0);
  });
});
