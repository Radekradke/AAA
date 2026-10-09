import { describe, expect, it } from 'vitest';
import { featuresGained } from '../levelUp';
import { featureInfo } from '@/data/featureInfo';
import { CLASSES } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';

describe('explicação das características de classe', () => {
  it('toda característica de 1 a 20, com ou sem subclasse, tem o que ela faz', () => {
    const missing: string[] = [];
    for (const c of CLASSES)
      for (const sub of [null, ...subclassesFor(c.id).map((s) => s.id)])
        for (let lv = 1; lv <= 20; lv++)
          for (const f of featuresGained(c.id, lv, sub)) if (!featureInfo(f)) missing.push(`${c.id}/${sub ?? '—'} ${lv}: ${f}`);
    expect(missing).toEqual([]);
  });
});
