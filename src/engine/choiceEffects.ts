import type { Character } from '@/types/character';
import { toolLabel } from '@/data/tools';

const TOOL_SOURCES: Record<string, string> = {
  artisanTool: 'Estudioso da Guerra',
  bardInstruments: 'Bardo',
  monkTool: 'Monge',
  dwarfTool: 'Anão',
  artificerTool: 'Iniciado Artífice',
};

const SPELL_KEYS = /^(magicalSecrets|loreSecrets|tomeCantrips|natureCantrip|arcanum\d|spellMastery\d|signature)$/;

/**
 * Efeitos permanentes de uma escolha de classe no momento em que é feita
 * (os bônus de combate — Estilo de Luta etc. — são calculados em dndRules).
 */
export function grantChoiceEffects(c: Character, picks: Record<string, string[]>): void {
  for (const [storeKey, ids] of Object.entries(picks)) {
    const key = storeKey.split('.').slice(1).join('.');
    // Estudioso da Guerra: proficiência com a ferramenta de artesão escolhida
    // magias escolhidas (Segredos Mágicos, Livro das Sombras, Arcano Místico,
    // Magias de Assinatura) entram na lista do personagem
    if (SPELL_KEYS.test(key)) {
      const wizardBook = key === 'signature' || key.startsWith('spellMastery');
      for (const id of ids) {
        if (wizardBook) {
          c.knownSpells = c.knownSpells ?? [];
          if (!c.knownSpells.includes(id)) c.knownSpells.push(id);
          if (key === 'signature' && !c.preparedSpells.includes(id)) c.preparedSpells.push(id);
        } else if (!c.preparedSpells.includes(id)) {
          c.preparedSpells.push(id);
        }
      }
    }
    // ferramentas escolhidas viram proficiência na ficha
    const toolSource = TOOL_SOURCES[key];
    if (toolSource) {
      c.toolProfs = c.toolProfs ?? [];
      for (const id of ids) {
        if (!c.toolProfs.some((t) => t.id === id)) c.toolProfs.push({ id, label: toolLabel(id), source: toolSource });
      }
    }
  }
}
