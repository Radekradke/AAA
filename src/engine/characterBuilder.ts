import type { AbilityKey, AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, CombatState, InventoryItem, ToolProf } from '@/types/character';
import { DEFAULT_CAMPAIGN } from '@/types/character';
import { synthesizeHistory } from './levelUp';
import { getClass } from '@/data/classes';
import { getSubraces } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { toolLabel } from '@/data/tools';
import { defaultPreparedForClass, getSpell } from '@/data/spells';
import { cantripsKnown, spellsKnownOrPrepared } from './spellcasting';
import { buildSpellSlots, buildResources } from './progression';
import { resourceMaxMap } from './classResources';
import { buildLoadout, defaultSelection, kitGold } from './loadout';
import { itemToInventory } from './inventory';
import { getItem } from '@/data/items';

/** Equipamento dos antecedentes que existe no catálogo: [id, quantidade]. */
const BG_ITEMS: Record<string, [string, number]> = {
  'Símbolo sagrado': ['g-holy-amulet', 1],
  'Bastões de incenso (5)': ['g-incense', 5],
  'Vestes cerimoniais': ['g-vestments', 1],
  'Roupas comuns': ['g-clothes-common', 1],
  'Roupas finas': ['g-clothes-fine', 1],
  'Roupas de viagem': ['g-clothes-traveler', 1],
  'Traje de apresentação': ['g-clothes-costume', 1],
  'Kit de disfarce': ['g-disguise', 1],
  'Pé de cabra': ['g-crowbar', 1],
  'Pá': ['g-shovel', 1],
  'Panela de ferro': ['g-pot', 1],
  'Estojo de pergaminhos com anotações': ['g-casemap', 1],
  'Cobertor de inverno': ['g-blanket', 1],
  'Kit de herbalismo': ['g-herbalism', 1],
  'Anel de sinete': ['g-signet', 1],
  'Cajado': ['w-quarterstaff', 1],
  'Armadilha de caça': ['g-huntingtrap', 1],
  'Vidro de tinta preta': ['g-ink', 1],
  'Pena': ['g-inkpen', 1],
  'Faca pequena': ['g-knife', 1],
  'Cinturão de amarras (belaying pin)': ['w-club', 1],
  'Corda de seda (15 m)': ['g-ropesilk', 1],
  'Jogo de dados de osso': ['g-game-dice', 1],
};
const ARTISAN_GEAR: Record<string, string> = {
  'smiths-tools': 'g-tool-smith', 'alchemists-supplies': 'g-tool-alchemist', 'brewers-supplies': 'g-tool-brewer', 'carpenters-tools': 'g-tool-carpenter',
  'cooks-utensils': 'g-tool-cook', 'leatherworkers-tools': 'g-tool-leatherworker', 'masons-tools': 'g-tool-mason', 'painters-supplies': 'g-tool-painter',
  'jewelers-tools': 'g-tool-jeweler', 'tinkers-tools': 'g-tool-tinker', 'weavers-tools': 'g-tool-weaver', 'woodcarvers-tools': 'g-tool-woodcarver',
  'cartographers-tools': 'g-tool-cartographer', 'cobblers-tools': 'g-tool-cobbler', 'glassblowers-tools': 'g-tool-glassblower', 'potters-tools': 'g-tool-potter',
  'calligraphers-supplies': 'g-tool-calligrapher',
};
const INSTRUMENT_GEAR: Record<string, string> = {
  lute: 'g-inst-lute', flute: 'g-inst-flute', drum: 'g-inst-drum', lyre: 'g-inst-lyre', horn: 'g-inst-horn', viol: 'g-inst-viol',
  bagpipes: 'g-inst-bagpipes', 'pan-flute': 'g-inst-panflute', shawm: 'g-inst-shawm', dulcimer: 'g-inst-dulcimer',
};

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

/** Os 2 atributos mais importantes da classe (recomendações leves na criação). */
export function recommendedAbilities(classId: string): AbilityKey[] {
  return (CLASS_PRIORITY[classId] ?? ['str', 'con']).slice(0, 2);
}

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
    exhaustion: 0,
    concentration: false,
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
    classLevels: [{ classId, level: 1 }],
    subclassId: null,
    feats: [],
    asiBonuses: {},
    levelHistory: [],
    inspiration: false,
    campaign: { ...DEFAULT_CAMPAIGN },
    schema: 3,
    baseAbilities: standardArrayFor(classId),
    skillProfs: [],
    skillExpertise: [],
    savingThrowProfs: getClass(classId).savingThrows,
    toolProfs: [],
    extraLanguages: [],
    hpCurrent: 0,
    coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
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
  const loadout = draft.inventory.length > 0 ? null : buildLoadout(draft.classId, draft.startingKit ?? defaultSelection(draft.classId, draft), draft);
  const inventory = loadout ? [...loadout.inventory] : [...draft.inventory];
  const equipped = loadout ? loadout.equipped : draft.equipped;

  // proficiências de perícia: antecedente + escolhas (garante ao menos as do background)
  const skillProfs = Array.from(new Set([...draft.skillProfs, ...bg.skills]));

  // ferramentas: classe (ex.: Ladino → Ferramentas de Ladrão) + antecedente
  const toolProfs: ToolProf[] = [...(draft.toolProfs ?? [])];
  const addTool = (id: string, source: string) => {
    if (toolProfs.some((t) => t.id === id)) return;
    toolProfs.push({ id, label: toolLabel(id), source });
  };
  for (const id of cls.tools ?? []) addTool(id, cls.label);
  for (const id of bg.tools ?? []) addTool(id, bg.label);
  // Gnomo das Rochas (Engenhoqueiro): Ferramentas de Funileiro
  if (draft.subraceId === 'rock-gnome') addTool('tinkers-tools', 'Gnomo das Rochas');

  // equipamento do antecedente (PHB 2014): o que existe no catálogo vira item de verdade
  // (peso, preço, arte); lembranças e cartas ficam como item simples
  let bagSeq = 0;
  const bgTool = (group: Record<string, string>) => toolProfs.find((t) => t.source === bg.label && group[t.id])?.id;
  for (const name of bg.equipment ?? []) {
    const mapped = BG_ITEMS[name];
    const id =
      name === 'Ferramentas de artesão' ? ARTISAN_GEAR[bgTool(ARTISAN_GEAR) ?? ''] :
      name === 'Instrumento musical' ? INSTRUMENT_GEAR[bgTool(INSTRUMENT_GEAR) ?? 'lute'] :
      mapped?.[0];
    const catalog = id ? getItem(id) : undefined;
    if (catalog) {
      // o clérigo já trouxe símbolo sagrado no kit: não duplica
      if (id!.startsWith('g-holy-') && inventory.some((i) => i.itemId?.startsWith('g-holy-'))) continue;
      // item igual já veio no pacote (incenso, roupas…): empilha em vez de repetir
      const same = !catalog.weapon ? inventory.find((i) => i.itemId === id) : undefined;
      if (same) same.quantity += mapped?.[1] ?? 1;
      else inventory.push(itemToInventory(catalog, mapped?.[1] ?? 1));
      continue;
    }
    if (inventory.some((i) => i.name === name)) continue;
    bagSeq += 1;
    const item: InventoryItem = {
      uid: `bg${Date.now().toString(36)}${bagSeq}`,
      name,
      category: 'gear',
      note: `Equipamento inicial · ${bg.label}`,
      rarity: 'comum',
      weight: 0,
      quantity: 1,
      favorite: false,
      attuned: false,
    };
    inventory.push(item);
  }

  // espaços de magia e recursos conforme classe/nível
  const spellSlots = cls.spellcasting ? buildSpellSlots(draft.classId, draft.level) : {};
  const resources = buildResources(draft.classId, draft.level);
  const maxCircle = Math.max(0, ...Object.keys(spellSlots).map(Number));
  const preparedSpells =
    maxCircle > 0 && draft.preparedSpells.length === 0
      ? defaultPreparedForClass(
          draft.classId,
          maxCircle,
          cantripsKnown(draft.classId, draft.level),
          // conjuradores que preparam: sugestão modesta (o jogador ajusta na aba Magias)
          Math.min(4, spellsKnownOrPrepared(draft.classId, draft.level, 1).count),
        )
      : draft.preparedSpells;
  // Mago: grimório inicial com 6 magias de 1º círculo (as preparadas saem dele)
  const knownSpells =
    draft.classId === 'wizard' && maxCircle > 0 && (draft.knownSpells ?? []).length === 0
      ? Array.from(new Set([
          ...preparedSpells.filter((id) => (getSpell(id)?.level ?? 0) >= 1),
          ...defaultPreparedForClass('wizard', 1, 0, 6),
        ])).slice(0, 6)
      : draft.knownSpells;

  const finalized: Character = {
    ...draft,
    name: draft.name.trim() || 'Herói Sem Nome',
    classLevels: [{ classId: draft.classId, level: draft.level }],
    levelHistory: synthesizeHistory(draft),
    inventory,
    equipped,
    skillProfs,
    toolProfs,
    // ouro: bolsa do antecedente (PHB) + riqueza inicial, se trocou o kit da classe por ouro
    coins: { ...draft.coins, gp: draft.coins.gp + (bg.startingGold ?? 0) + (kitGold(draft.startingKit) ?? 0) },
    preparedSpells,
    knownSpells,
    combat: {
      ...emptyCombat(),
      hitDiceRemaining: draft.level,
      resources,
      spellSlots,
    },
    draft: false,
    updatedAt: Date.now(),
  };
  // recursos calculados com o personagem pronto (nível, atributos, subclasse)
  finalized.combat.resources = resourceMaxMap(finalized);

  return finalized;
}

/** Garante que todas as chaves de atributo existam (migração defensiva). */
export function normalizeAbilities(a: Partial<AbilityScores>): AbilityScores {
  const out = {} as AbilityScores;
  for (const k of ABILITY_KEYS) out[k] = a[k] ?? 10;
  return out;
}
