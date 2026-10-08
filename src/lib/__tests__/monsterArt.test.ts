import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MONSTERS, MONSTER_BY_ID } from '@/data/bestiary';
import { MONSTER_TYPES, bundledMonsterArt, monsterLook, monsterTypeKey } from '@/lib/monsterArt';

describe('arte do bestiário', () => {
  it('todo tipo do bestiário cai num emblema conhecido (e o tipo do SRD casa com o rótulo)', () => {
    for (const m of MONSTERS) {
      const k = monsterTypeKey(m.type);
      expect(MONSTER_TYPES[k], m.id).toBeTruthy();
      // "Humanoide (metamorfo)" → Humanoide; tipos desconhecidos viram Monstruosidade de propósito
      if (k !== 'monstrosity') expect(m.type.toLowerCase().startsWith(MONSTER_TYPES[k].label.toLowerCase().slice(0, 5)), m.id).toBe(true);
    }
    expect(monsterTypeKey('Aberração')).toBe('monstrosity');
  });

  it('personalização da mesa vence a arte oficial; sem nada, emblema', () => {
    const g = MONSTER_BY_ID.goblin;
    const plain = monsterLook(g);
    expect(plain.name).toBe('Goblin');
    expect(plain.type).toBe('humanoid');
    const custom = monsterLook(g, { name: '  Batedor Garra-Negra ', portrait: 'data:image/webp;base64,AA' });
    expect(custom).toMatchObject({ name: 'Batedor Garra-Negra', art: 'data:image/webp;base64,AA', artSource: 'custom' });
    expect(monsterLook(g, { name: '   ', portrait: null }).name).toBe('Goblin');
  });

  it('arte da pasta só com id que existe; o guia cobre todas as criaturas', () => {
    for (const id of Object.keys(bundledMonsterArt())) expect(MONSTER_BY_ID[id], `src/assets/bestiario/${id}`).toBeTruthy();
    const guide = readFileSync(resolve(__dirname, '../../../docs/ARTE-BESTIARIO.md'), 'utf8');
    for (const m of MONSTERS) expect(guide, m.id).toContain(`\`${m.id}.webp\``);
  });
});
