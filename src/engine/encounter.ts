import type { Combatant } from '@/types/session';

/**
 * Regras puras do encontro — as mesmas do banco (supabase/multiplayer_session.sql:
 * _fv_recompute_order e _fv_step). O banco é quem decide; aqui é só para a
 * interface mostrar ordem, grupos, "próximo" e estado de vida sem esperar ida
 * e volta ao servidor.
 */

/** Ordem de iniciativa: maior primeiro; sem iniciativa ao fim; desempate por bônus; grupo junto. */
export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort(
    (a, b) =>
      (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) ||
      b.initiativeBonus - a.initiativeBonus ||
      (a.groupKey ?? a.id).localeCompare(b.groupKey ?? b.id) ||
      a.turnOrder - b.turnOrder,
  );
}

/** Monstro/NPC com 0 PV está fora da ordem (jogador caído ainda tem turno: salvaguardas contra a morte). */
export function isDefeated(c: Combatant): boolean {
  return c.type !== 'player' && c.hpCurrent !== null && c.hpCurrent <= 0;
}

export interface InitiativeRow {
  key: string;
  /** Primeiro membro (quem recebe o turno). */
  lead: Combatant;
  members: Combatant[];
  label: string;
  initiative: number | null;
  active: boolean;
  defeated: boolean;
}

/** "Goblin #1", "Goblin #2" → "Goblins"; nomes diferentes → o do primeiro. */
export function groupLabel(members: Combatant[]): string {
  if (members.length === 1) return members[0].name;
  const bases = members.map((m) => m.name.replace(/\s*#?\d+$/, '').trim());
  const base = bases.every((b) => b === bases[0]) ? bases[0] : members[0].name;
  const plural = /[aeiouáéíóú]$/i.test(base) ? `${base}s` : /[rsz]$/i.test(base) ? `${base}es` : `${base}s`;
  return `${plural} ×${members.length}`;
}

/** Linhas do rastreador: grupos (mesma chave) viram uma linha só, na ordem do banco. */
export function initiativeRows(list: Combatant[], activeId: string | null): InitiativeRow[] {
  const ordered = [...list].sort((a, b) => a.turnOrder - b.turnOrder);
  const rows = new Map<string, Combatant[]>();
  for (const c of ordered) {
    const key = c.groupKey ?? c.id;
    rows.set(key, [...(rows.get(key) ?? []), c]);
  }
  return [...rows.entries()].map(([key, members]) => ({
    key,
    lead: members[0],
    members,
    label: groupLabel(members),
    initiative: members[0].initiative,
    active: members.some((m) => m.id === activeId),
    defeated: members.every(isDefeated),
  }));
}

/** Próximo (+1) ou anterior (−1) lugar na ordem — mesmo algoritmo do banco. */
export function stepTurn(list: Combatant[], currentId: string | null, dir: 1 | -1): { nextId: string | null; wrapped: boolean } {
  const slots = initiativeRows(list.filter((c) => !isDefeated(c)), null);
  if (!slots.length) return { nextId: null, wrapped: false };
  if (!currentId) return { nextId: slots[0].lead.id, wrapped: false };
  const cur = list.find((c) => c.id === currentId);
  const idx = cur ? slots.findIndex((s) => s.key === (cur.groupKey ?? cur.id)) : -1;
  if (idx === -1) {
    const o = cur?.turnOrder ?? -1;
    if (dir > 0) {
      const next = slots.find((s) => s.lead.turnOrder > o);
      return next ? { nextId: next.lead.id, wrapped: false } : { nextId: slots[0].lead.id, wrapped: true };
    }
    const prev = [...slots].reverse().find((s) => s.lead.turnOrder < o);
    return prev ? { nextId: prev.lead.id, wrapped: false } : { nextId: slots[slots.length - 1].lead.id, wrapped: true };
  }
  if (dir > 0) return idx < slots.length - 1 ? { nextId: slots[idx + 1].lead.id, wrapped: false } : { nextId: slots[0].lead.id, wrapped: true };
  return idx > 0 ? { nextId: slots[idx - 1].lead.id, wrapped: false } : { nextId: slots[slots.length - 1].lead.id, wrapped: true };
}

export type HealthState = 'ileso' | 'ferido' | 'sangrando' | 'caído' | 'desconhecido';

/** O que o jogador enxerga da vida de um inimigo (sem números). */
export function healthState(hp: number | null, max: number | null): HealthState {
  if (hp === null || max === null || max <= 0) return 'desconhecido';
  if (hp <= 0) return 'caído';
  if (hp >= max) return 'ileso';
  return hp <= max / 2 ? 'sangrando' : 'ferido';
}

/** Rola 1d20 + bônus (iniciativa de monstros/NPCs pelo mestre). */
export function rollInitiative(bonus: number, rand: () => number = Math.random): number {
  return 1 + Math.floor(rand() * 20) + bonus;
}

/**
 * Iniciativas dos inimigos: uma rolagem por GRUPO (todos iguais agem juntos)
 * e uma por combatente solto. Só quem ainda não tem iniciativa, a menos que `all`.
 */
export function rollEnemyInitiatives(list: Combatant[], all = false, rand: () => number = Math.random): { id: string; value: number }[] {
  const out: { id: string; value: number }[] = [];
  const byGroup = new Map<string, number>();
  for (const c of list) {
    if (c.type === 'player') continue;
    if (!all && c.initiative !== null) continue;
    const key = c.groupKey;
    let value: number;
    if (key) {
      if (!byGroup.has(key)) byGroup.set(key, rollInitiative(c.initiativeBonus, rand));
      value = byGroup.get(key)!;
    } else {
      value = rollInitiative(c.initiativeBonus, rand);
    }
    out.push({ id: c.id, value });
  }
  return out;
}
