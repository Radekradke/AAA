import type { StoreApi } from 'zustand';
import type { ActiveSpellEffect, Character, Diary, CoinKey, InventoryItem, JournalEntry, ToolProf } from '@/types/character';
import type { Item, SkillKey } from '@/types/dnd';
import type { NewCharacterInput } from '@/engine/characterBuilder';
import type { ContainerId, MoveResult } from '@/engine/inventory';
import type { LevelUpPlan } from '@/engine/levelUp';

/** Aplica uma transformação imutável a um personagem por id. */
export type Recipe = (char: Character) => void;

export interface CharacterState {
  characters: Character[];
  currentId: string | null;
  /** Fichas excluídas localmente aguardando exclusão na nuvem. */
  pendingDeletes: string[];

  // ---- seleção / ciclo de vida ----
  charactersFor: (ownerId: string) => Character[];
  getCharacter: (id: string | null) => Character | undefined;
  setCurrent: (id: string | null) => void;
  startDraft: (input: NewCharacterInput) => string;
  saveDraft: (recipe: Recipe) => void;
  updateCharacter: (id: string, recipe: Recipe) => void;
  finalizeDraft: (id: string) => void;
  deleteCharacter: (id: string) => void;
  /** Devolve uma ficha recém-excluída (botão Desfazer do aviso). */
  restoreCharacter: (char: Character) => void;
  duplicateCharacter: (id: string) => void;
  /** Ficha completa (JSON exportado). Texto colado/ficha simples: use lib/heroImport. */
  importCharacter: (json: string, ownerId: string) => { ok: boolean; error?: string; id?: string };
  exportCharacter: (id: string) => string | null;

  // ---- gameplay (operam no personagem informado) ----
  /** Dano (PHB 2014): PV temporários primeiro; a 0 PV, falha no teste contra a morte; dano maciço mata. */
  applyDamage: (id: string, amount: number, opts?: { crit?: boolean }) => void;
  heal: (id: string, amount: number) => void;
  setTempHp: (id: string, amount: number) => void;
  addInventoryItem: (id: string, item: Item | InventoryItem) => void;
  updateInventoryItem: (id: string, uid: string, patch: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string, uid: string) => void;
  /** Abre um pacote fechado que já está na mochila (fichas antigas). */
  openPackItem: (id: string, uid: string) => void;
  /** Disparo com arco/besta/funda/zarabatana: gasta 1 peça de munição (null = arma sem munição). */
  fireAmmo: (id: string, weaponUid: string) => import('@/engine/ammo').SpendResult;
  /** Desfaz o último disparo: a peça volta. */
  refundAmmo: (id: string, kind: import('@/engine/ammo').AmmoKind) => void;
  /** Depois da luta: recolhe metade da munição disparada. Devolve quantas voltaram. */
  recoverAmmo: (id: string, weaponUid: string) => number;
  toggleEquip: (id: string, uid: string) => void;
  /** Move entre Equipado / Mochila / Baú (arrastar ou botões). */
  moveItem: (id: string, uid: string, target: ContainerId) => MoveResult;
  toggleFavorite: (id: string, uid: string) => void;
  toggleAttune: (id: string, uid: string) => void;
  adjustCoin: (id: string, coin: CoinKey, delta: number) => void;
  setCoin: (id: string, coin: CoinKey, value: number) => void;
  toggleSkillExpertise: (id: string, key: SkillKey) => void;
  addToolProf: (id: string, tool: ToolProf) => void;
  removeToolProf: (id: string, toolId: string) => void;
  toggleToolExpertise: (id: string, toolId: string) => void;
  setToolAbility: (id: string, toolId: string, ability: import('@/types/dnd').AbilityKey) => void;
  addLanguage: (id: string, lang: string) => void;
  removeLanguage: (id: string, lang: string) => void;
  toggleTurn: (id: string, key: 'action' | 'bonus' | 'reaction') => void;
  resetTurn: (id: string) => void;
  adjustMove: (id: string, delta: number) => void;
  toggleCondition: (id: string, cond: string) => void;
  setExhaustion: (id: string, level: number) => void;
  toggleConcentration: (id: string) => void;
  /** Gasta um uso de uma magia concedida por item (recarga por descanso). */
  useItemSpell: (id: string, key: string) => void;
  /** Gasta cargas de um item (cajado, varinha…; negativo devolve); devolve quantas sobraram. */
  spendItemCharges: (id: string, uid: string, n: number) => number;
  toggleSpellSlot: (id: string, level: number, index: number) => void;
  /** Conjurar: gasta um espaço do círculo (e liga a concentração, se a magia pedir). */
  castWithSlot: (id: string, level: number, concentration?: boolean) => void;
  /** Liga/desliga Bruxaria, Marca do Caçador ou Fúria (dano extra em todo acerto). */
  setMark: (id: string, mark: 'hex' | 'huntersMark' | 'rage' | 'frenzy' | 'reckless' | 'assassinate', on: boolean) => void;
  /** Bárbaro: entra em Fúria (gasta 1 uso e a ação bônus); `frenzy` = Frenesi do Furioso. */
  startRage: (id: string, frenzy?: boolean) => void;
  /** Bárbaro: encerra a Fúria (com Frenesi, +1 nível de exaustão). */
  endRage: (id: string) => void;
  /** Ataque Furtivo gasto neste turno. */
  useSneakAttack: (id: string) => void;
  /** Disparada: dobra o deslocamento do turno e gasta a ação (ou a ação bônus, Ação Ardilosa). */
  dash: (id: string, as: 'action' | 'bonus') => void;
  /** Efeito de magia passa a valer em você (troca o da mesma magia). */
  applySpellEffect: (id: string, effect: ActiveSpellEffect) => void;
  removeSpellEffect: (id: string, spellId: string) => void;
  /** Acaba com os efeitos que dependem de concentração (nova concentração / romper). */
  endConcentrationEffects: (id: string) => void;
  /** PV temporários não acumulam: fica o maior. */
  gainTempHp: (id: string, amount: number) => void;
  /** Marca ação/bônus/reação como gasta (sem desmarcar). */
  useTurn: (id: string, key: 'action' | 'bonus' | 'reaction') => void;
  /** Registra a magia conjurada neste turno. */
  noteCast: (id: string, spellId: string) => void;
  /** Soma XP (recompensa do mestre ou manual). */
  addXp: (id: string, amount: number) => void;
  /** Marca uma ordem da mesa ao vivo como aplicada nesta ficha. */
  markEventApplied: (id: string, eventId: string) => void;
  /** Grava os feitos já calculados (a conta fica em lib/deedTracker, carregado sob demanda). */
  setDeeds: (id: string, deeds: import('@/engine/deeds').HeroDeeds) => void;
  addScar: (id: string, scar: Omit<import('@/engine/deeds').Scar, 'id'> & { id?: string }) => void;
  removeScar: (id: string, scarId: string) => void;
  /** Sessão da mesa ao vivo jogada com esta ficha (linha da jornada). */
  recordSession: (id: string, session: { id: string; name: string; at: string }) => void;
  /** Esquece uma magia; `useSwap` gasta a troca ganha ao subir de nível. */
  forgetSpell: (id: string, spellId: string, useSwap?: boolean) => void;
  /** Mago: copia uma magia para o grimório pagando ouro. */
  copySpell: (id: string, spellId: string, cost: number) => void;
  setResource: (id: string, resId: string, value: number) => void;
  spendHitDie: (id: string) => void;
  setDeathSave: (id: string, type: 'success' | 'fail', n: number) => void;
  shortRest: (id: string) => void;
  longRest: (id: string) => void;
  /** Cria uma sessão nova na Crônica e devolve o id dela. */
  addJournalEntry: (id: string) => string;
  /** Altera o diário pessoal (rabiscos, missões, pistas, pessoas). */
  updateDiary: (id: string, recipe: (d: Diary) => void) => void;
  updateJournalEntry: (id: string, entryId: string, patch: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string, entryId: string) => void;
  setNotes: (id: string, notes: string) => void;
  setLevel: (id: string, level: number) => void;
  editCharacter: (id: string, patch: Partial<Character>) => void;
  /** Evolução guiada (aba Evoluir): valida e aplica um plano de nível. */
  levelUp: (id: string, plan: LevelUpPlan) => { ok: boolean; errors: string[] };
  /** Preenche escolhas de classe pendentes (ex.: ficha antiga sem Estilo de Luta). */
  setClassChoices: (id: string, picks: Record<string, string[]>) => void;
  toggleInspiration: (id: string) => void;
  /** Pontos de Inspiração: ganhar (+1), gastar (−1) ou ajustar direto. */
  gainInspiration: (id: string) => void;
  spendInspiration: (id: string) => void;
  setInspiration: (id: string, points: number) => void;
  updateCampaign: (id: string, patch: Partial<Character['campaign']>) => void;
}

/** O que cada módulo de ações recebe do store (ver characterStore.ts). */
export interface StoreCtx {
  set: StoreApi<CharacterState>['setState'];
  get: () => CharacterState;
  /** Edita uma ficha por id numa cópia (structuredClone) e marca como pendente de sync. */
  mutate: (id: string, recipe: Recipe) => void;
}
