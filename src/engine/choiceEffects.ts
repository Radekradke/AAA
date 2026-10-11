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

/** Proficiências que vêm com a subclasse (Assassino 3º: kit de disfarce e de envenenador). */
const SUBCLASS_TOOLS: Record<string, { classId: string; level: number; tools: string[]; source: string }> = {
  assassin: { classId: 'rogue', level: 3, tools: ['disguise-kit', 'poisoners-kit'], source: 'Assassino' },
};

/**
 * Devolve a ficha com as ferramentas da subclasse na lista de proficiências.
 * Sem nada a acrescentar, devolve o mesmo objeto (seguro para chamar sempre).
 */
export function withSubclassTools(c: Character): Character {
  const grant = c.subclassId ? SUBCLASS_TOOLS[c.subclassId] : undefined;
  if (!grant) return c;
  const lv = c.classLevels?.find((cl) => cl.classId === grant.classId)?.level ?? (c.classId === grant.classId ? c.level : 0);
  const have = c.toolProfs ?? [];
  const missing = lv >= grant.level ? grant.tools.filter((id) => !have.some((t) => t.id === id)) : [];
  if (!missing.length) return c;
  return { ...c, toolProfs: [...have, ...missing.map((id) => ({ id, label: toolLabel(id), source: grant.source }))] };
}
