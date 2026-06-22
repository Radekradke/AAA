import type { AbilityKey, AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, CombatState } from '@/types/character';
import { getClass } from '@/data/classes';
import { getSubraces } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { itemToInventory } from './inventory';
import { getItem } from '@/data/items';
import { DEFAULT_PREPARED } from '@/data/spells';

/** Valores do Array Padrão de D&D 5e. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Ordem de prioridade de atributos sugerida por classe (para distribuir o array padrão). */
const CLASS_PRIORITY: Record<string, AbilityKey[]> = {
  barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  cleric: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
  druid: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
  fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  monk: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
  ranger: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  rogue: ['dex', 'int', 'con', 'cha', 'wis', 'str'],
  sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};

/** Distribui o array padrão segundo a prioridade da classe. */
export function standardArrayFor(classId: string): AbilityScores {
  const order = CLASS_PRIORITY[classId] ?? ['str', 'con', 'dex', 'wis', 'int', 'cha'];
  const out = {} as AbilityScores;
  order.forEach((key, i) => {
    out[key] = STANDARD_ARRAY[i];
  });
  return out;
}

export function emptyCombat(): CombatState {
  return {
    hpTemp: 0,
    hitDiceRemaining: 1,
    deathSaves: { success: 0, fail: 0 },
    turn: { action: false, bonus: false, reaction: false },
    moveUsed: 0,
    conditions: [],
    resources: {},
    spellSlots: {},
  };
}

let _seq = 0;
function charId(): string {
  _seq += 1;
  return `pc${Date.now().toString(36)}${_seq}`;
}

/** Equipamento inicial padrão por categoria de classe. */
function defaultLoadout(classId: string): { itemIds: string[]; equip: Partial<Character['equipped']> } {
  const cls = getClass(classId);
  // marciais começam com armadura + arma; conjuradores com couro + arma simples
  if (cls.kind === 'Marcial' && cls.hitDie >= 10) {
    return {
      itemIds: ['a-chainmail', 'w-longsword', 's-shield', 'g-backpack', 'p-heal'],
      equip: { armor: 'a-chainmail', mainHand: 'w-longsword', shield: 's-shield' },
    };
  }
  if (cls.id === 'rogue' || cls.id === 'monk' || cls.id === 'ranger') {
    return {
      itemIds: ['a-leather', 'w-shortsword', 'w-shortbow', 'g-explorer', 'p-heal'],
      equip: { armor: 'a-leather', mainHand: 'w-shortsword', ranged: 'w-shortbow' },
    };
  }
  return {
    itemIds: ['a-leather', 'w-quarterstaff', 'g-explorer', 'p-heal'],
    equip: { armor: 'a-leather', mainHand: 'w-quarterstaff' },
  };
}

export interface NewCharacterInput {
  ownerId: string;
  name?: string;
  gender?: 'masc' | 'fem';
  raceId?: string;
  classId?: string;
  backgroundId?: string;
}

/** Cria um rascunho de personagem com defaults coerentes. */
export function createDraftCharacter(input: NewCharacterInput): Character {
  const classId = input.classId ?? 'fighter';
  const raceId = input.raceId ?? 'human';
  const backgroundId = input.backgroundId ?? 'soldier';
  const subs = getSubraces(raceId);

  const now = Date.now();
  return {
    id: charId(),
    ownerId: input.ownerId,
    name: input.name ?? '',
    gender: input.gender ?? 'masc',
    raceId,
    subraceId: subs.length ? subs[subs.length - 1].id : null,
    classId,
    backgroundId,
    alignment: 'Leal e Neutro',
    age: '',
    concept: '',
    level: 1,
    baseAbilities: standardArrayFor(classId),
    skillProfs: [],
    savingThrowProfs: getClass(classId).savingThrows,
    hpCurrent: 0,
    coins: { pp: 0, gp: 25, ep: 0, sp: 0, cp: 0 },
    inventory: [],
    equipped: { armor: null, shield: null, mainHand: null, offHand: null, ranged: null },
    knownSpells: [],
    preparedSpells: [],
    journal: [],
    notes: '',
    combat: emptyCombat(),
    createdAt: now,
    updatedAt: now,
    draft: true,
  };
}

/**
 * Aplica equipamento inicial, proficiências do antecedente, magias padrão
 * e zera o estado de combate. Chamado ao finalizar a criação.
 */
export function finalizeCharacter(draft: Character): Character {
  const cls = getClass(draft.classId);
  const bg = getBackground(draft.backgroundId);
  const loadout = defaultLoadout(draft.classId);

  // monta a mochila inicial (não sobrescreve se o usuário já adicionou itens)
  const inventory =
    draft.inventory.length > 0
      ? draft.inventory
      : loadout.itemIds.map((id) => {
          const item = getItem(id)!;
          return itemToInventory(item);
        });

  // resolve os uids dos itens equipados por itemId
  const equipped = { ...draft.equipped };
  if (draft.inventory.length === 0) {
    for (const [slot, itemId] of Object.entries(loadout.equip)) {
      const inst = inventory.find((i) => i.itemId === itemId);
      if (inst) equipped[slot as keyof Character['equipped']] = inst.uid;
    }
  }

  // proficiências de perícia: antecedente + escolhas (garante ao menos as do background)
  const skillProfs = Array.from(new Set([...draft.skillProfs, ...bg.skills]));

  // magias padrão para conjuradores
  const preparedSpells =
    cls.spellcasting && draft.preparedSpells.length === 0 ? [...DEFAULT_PREPARED] : draft.preparedSpells;

  // espaços de magia iniciais (1º círculo) para conjuradores
  const spellSlots: Character['combat']['spellSlots'] = cls.spellcasting
    ? { 1: { used: 0, max: 2 } }
    : {};

  // recursos de classe iniciais
  const resources: Record<string, number> = {};
  for (const r of cls.resources ?? []) resources[r.id] = r.max;

  const finalized: Character = {
    ...draft,
    name: draft.name.trim() || 'Herói Sem Nome',
    inventory,
    equipped,
    skillProfs,
    preparedSpells,
    combat: {
      ...emptyCombat(),
      hitDiceRemaining: draft.level,
      resources,
      spellSlots,
    },
    draft: false,
    updatedAt: Date.now(),
  };

  return finalized;
}

/** Garante que todas as chaves de atributo existam (migração defensiva). */
export function normalizeAbilities(a: Partial<AbilityScores>): AbilityScores {
  const out = {} as AbilityScores;
  for (const k of ABILITY_KEYS) out[k] = a[k] ?? 10;
  return out;
}
