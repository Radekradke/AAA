import { mapSession, rpcError, sb } from './sessionService';
import type { Combatant, CombatantType, Encounter, EncounterStatus } from '@/types/session';

/**
 * Encontro (combate) e combatentes. O banco é a autoridade da ordem, do
 * turno e da rodada; o cliente só pede. Ações de turno mandam a `revision`
 * que o cliente viu — se outro navegador mexeu antes, volta STALE_REVISION
 * e o cliente recarrega em vez de pular dois turnos.
 */
export class StaleRevisionError extends Error {
  constructor() {
    super('O encontro mudou em outro aparelho — atualizei a tela, confira e tente de novo.');
    this.name = 'StaleRevisionError';
  }
}

function fail(error: { message: string } | null): void {
  if (!error) return;
  if (error.message.includes('STALE_REVISION')) throw new StaleRevisionError();
  throw rpcError(error)!;
}

export function mapEncounter(r: Record<string, unknown>): Encounter {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    campaignId: String(r.campaign_id),
    name: String(r.name ?? ''),
    status: r.status as EncounterStatus,
    round: Number(r.round ?? 0),
    activeCombatantId: (r.active_combatant_id as string) ?? null,
    revision: Number(r.revision ?? 0),
    startedAt: (r.started_at as string) ?? null,
    endedAt: (r.ended_at as string) ?? null,
    updatedAt: String(r.updated_at ?? ''),
  };
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function mapCombatant(r: Record<string, unknown>): Combatant {
  return {
    id: String(r.id),
    encounterId: String(r.encounter_id),
    sessionId: String(r.session_id),
    campaignId: String(r.campaign_id),
    type: r.type as CombatantType,
    sheetId: (r.sheet_id as string) ?? null,
    ownerId: (r.owner_id as string) ?? null,
    monsterInstanceId: (r.monster_instance_id as string) ?? null,
    name: String(r.name ?? ''),
    initiative: num(r.initiative),
    initiativeBonus: Number(r.initiative_bonus ?? 0),
    turnOrder: Number(r.turn_order ?? 0),
    hpCurrent: num(r.hp_current),
    hpMax: num(r.hp_max),
    armorClass: num(r.armor_class),
    conditions: Array.isArray(r.conditions) ? (r.conditions as string[]) : [],
    hidden: Boolean(r.hidden),
    groupKey: (r.group_key as string) ?? null,
    monsterRef: (r.monster_ref as string) ?? null,
  };
}

export interface NewCombatant {
  type: CombatantType;
  name: string;
  sheetId?: string | null;
  initiativeBonus?: number;
  hpCurrent?: number | null;
  hpMax?: number | null;
  armorClass?: number | null;
  hidden?: boolean;
  groupKey?: string | null;
  /** Id do bestiário (SRD). */
  monsterRef?: string | null;
}

export interface CombatantPatch {
  name?: string;
  hp_current?: number | null;
  hp_max?: number | null;
  armor_class?: number | null;
  conditions?: string[];
  hidden?: boolean;
}

export const encounterService = {
  async create(sessionId: string, name?: string): Promise<Encounter> {
    const { data, error } = await sb().rpc('create_encounter', { p_session: sessionId, p_name: name ?? null });
    fail(error);
    return mapEncounter(data as Record<string, unknown>);
  },

  /** O encontro aberto (não encerrado) da sessão + combatentes que EU posso ver. */
  async open(sessionId: string): Promise<{ encounter: Encounter; combatants: Combatant[] } | null> {
    const client = sb();
    const { data, error } = await client.from('encounters').select('*').eq('session_id', sessionId)
      .neq('status', 'finished').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const encounter = mapEncounter(data);
    return { encounter, combatants: await encounterService.combatants(encounter.id) };
  },

  async combatants(encounterId: string): Promise<Combatant[]> {
    const { data, error } = await sb().from('combatants').select('*').eq('encounter_id', encounterId).order('turn_order');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCombatant);
  },

  async add(encounterId: string, c: NewCombatant): Promise<Combatant> {
    const { data, error } = await sb().rpc('add_combatant', {
      p_encounter: encounterId,
      p_type: c.type,
      p_name: c.name,
      p_sheet_id: c.sheetId ?? null,
      p_initiative_bonus: c.initiativeBonus ?? 0,
      p_hp_current: c.hpCurrent ?? null,
      p_hp_max: c.hpMax ?? null,
      p_armor_class: c.armorClass ?? null,
      p_hidden: c.hidden ?? false,
      p_group_key: c.groupKey ?? null,
      // só manda o parâmetro novo quando existe: um banco sem o SQL
      // atualizado continua aceitando os combatentes comuns
      ...(c.monsterRef ? { p_monster_ref: c.monsterRef } : {}),
    });
    fail(error);
    return mapCombatant(data as Record<string, unknown>);
  },

  async remove(combatantId: string): Promise<void> {
    const { error } = await sb().rpc('remove_combatant', { p_combatant: combatantId });
    fail(error);
  },

  /** Jogador: só a do próprio personagem (o banco recusa as outras). */
  async setInitiative(combatantId: string, value: number): Promise<void> {
    const { error } = await sb().rpc('set_initiative', { p_combatant: combatantId, p_value: Math.round(value) });
    fail(error);
  },

  /** Mestre: várias de uma vez (inimigos/grupos). */
  async setInitiatives(encounterId: string, values: { id: string; value: number }[]): Promise<void> {
    const { error } = await sb().rpc('set_initiatives', { p_encounter: encounterId, p_values: values });
    fail(error);
  },

  async update(combatantId: string, patch: CombatantPatch): Promise<void> {
    const { error } = await sb().rpc('update_combatant', { p_combatant: combatantId, p_patch: patch });
    fail(error);
  },

  async startCombat(e: Encounter): Promise<Encounter> {
    const { data, error } = await sb().rpc('start_combat', { p_encounter: e.id, p_revision: e.revision });
    fail(error);
    return mapEncounter(data as Record<string, unknown>);
  },

  async advance(e: Encounter, direction: 1 | -1 = 1): Promise<Encounter> {
    const { data, error } = await sb().rpc('advance_turn', { p_encounter: e.id, p_direction: direction, p_revision: e.revision });
    fail(error);
    return mapEncounter(data as Record<string, unknown>);
  },

  async setStatus(e: Encounter, status: Exclude<EncounterStatus, 'preparing'>): Promise<Encounter> {
    const { data, error } = await sb().rpc('set_encounter_status', { p_encounter: e.id, p_status: status, p_revision: e.revision });
    fail(error);
    return mapEncounter(data as Record<string, unknown>);
  },
};

export { mapSession };
