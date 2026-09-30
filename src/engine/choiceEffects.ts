import type { Character } from '@/types/character';
import { toolLabel } from '@/data/tools';

/**
 * Efeitos permanentes de uma escolha de classe no momento em que é feita
 * (os bônus de combate — Estilo de Luta etc. — são calculados em dndRules).
 */
export function grantChoiceEffects(c: Character, picks: Record<string, string[]>): void {
  for (const [storeKey, ids] of Object.entries(picks)) {
    const key = storeKey.split('.').slice(1).join('.');
    // Estudioso da Guerra: proficiência com a ferramenta de artesão escolhida
    if (key === 'artisanTool') {
      c.toolProfs = c.toolProfs ?? [];
      for (const id of ids) {
        if (!c.toolProfs.some((t) => t.id === id)) c.toolProfs.push({ id, label: toolLabel(id), source: 'Estudioso da Guerra' });
      }
    }
  }
}
