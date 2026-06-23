import type { AbilityKey, AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, CombatState } from '@/types/character';
import { getClass } from '@/data/classes';
import { getSubraces } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { defaultPreparedForClass } from '@/data/spells';
import { buildSpellSlots, buildResources } from './progression';
import { buildLoadout, defaultSelection } from './loadout';

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

  // monta a mochila inicial (não sobrescreve se o usuário já adicionou itens)
  const loadout = draft.inventory.length > 0 ? null : buildLoadout(defaultSelection(draft.classId));
  const inventory = loadout ? loadout.inventory : draft.inventory;
  const equipped = loadout ? loadout.equipped : draft.equipped;

  // proficiências de perícia: antecedente + escolhas (garante ao menos as do background)
  const skillProfs = Array.from(new Set([...draft.skillProfs, ...bg.skills]));

  // espaços de magia e recursos conforme classe/nível
  const spellSlots = cls.spellcasting ? buildSpellSlots(draft.classId, draft.level) : {};
  const resources = buildResources(draft.classId, draft.level);
  const maxCircle = Math.max(0, ...Object.keys(spellSlots).map(Number));
  const preparedSpells =
    maxCircle > 0 && draft.preparedSpells.length === 0 ? defaultPreparedForClass(draft.classId, maxCircle) : draft.preparedSpells;

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
