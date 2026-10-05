import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '@/types/session';

// ficha local do jogador (mock do characterStore)
const hero = { id: 'sheet-kael', appliedEvents: [] as string[], combat: { conditions: [] as string[] } };
const calls: string[] = [];
const chars = {
  characters: [hero],
  applyDamage: (id: string, n: number) => calls.push(`dano ${id} ${n}`),
  heal: (id: string, n: number) => calls.push(`cura ${id} ${n}`),
  addXp: (id: string, n: number) => calls.push(`xp ${id} ${n}`),
  toggleCondition: (id: string, c: string) => { calls.push(`cond ${id} ${c}`); hero.combat.conditions.push(c); },
  addInventoryItem: (id: string, it: { name: string; quantity: number; homebrew?: boolean; note?: string }) =>
    calls.push(`item ${id} ${it.name} x${it.quantity}${it.homebrew ? ' (inventado)' : ''}${it.note ? ` — ${it.note}` : ''}`),
  markEventApplied: (_id: string, e: string) => { hero.appliedEvents.push(e); },
  addScar: (id: string, sc: { text: string; session?: string | null; by: string }) => calls.push(`cicatriz ${id} ${sc.text} · ${sc.session} · ${sc.by}`),
  resetTurn: vi.fn(),
};
vi.mock('@/store/characterStore', () => ({ useCharacterStore: { getState: () => chars } }));
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
vi.mock('@/lib/deedTracker', () => ({ applyDeedKinds: (id: string, kinds: string[]) => kinds.forEach((k) => calls.push(`feito ${id} ${k}`)) }));
vi.mock('@/services/realtimeService', () => ({ joinLiveChannel: () => ({ leave: vi.fn(), track: vi.fn(), broadcast: vi.fn(), isPrivate: () => true }) }));

let events: SessionEvent[] = [];
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    live: async () => ({ id: 'sess', campaignId: 'camp', name: 'S', status: 'active', startedAt: null, endedAt: null, createdBy: 'gm', createdAt: '', updatedAt: '' }),
    events: async () => events,
    log: vi.fn(async () => undefined),
  },
}));
vi.mock('@/services/encounterService', () => ({ StaleRevisionError: class extends Error {}, encounterService: { open: async () => null } }));

const store = new Map<string, string>();
const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('sessionStorage', storage);

const { useSessionStore } = await import('../sessionStore');
const ev = (id: string, type: string, actorId: string, payload: Record<string, unknown>, t = '2026-01-01T00:00:00Z'): SessionEvent =>
  ({ id, sessionId: 'sess', type, actorId, targetId: null, payload, visibility: 'public', createdAt: t });

describe('ordens do mestre chegam na ficha do jogador', () => {
  beforeEach(() => {
    calls.length = 0;
    hero.appliedEvents = [];
    hero.combat.conditions = [];
    useSessionStore.getState().leave();
  });

  it('aplica dano, cura, condição e XP do mestre — uma vez só', async () => {
    events = [
      ev('e1', 'hero_hp', 'gm', { sheetId: 'sheet-kael', amount: 7, kind: 'damage' }, '2026-01-01T00:00:01Z'),
      ev('e2', 'hero_hp', 'gm', { sheetId: 'sheet-kael', amount: 3, kind: 'heal' }, '2026-01-01T00:00:02Z'),
      ev('e3', 'hero_condition', 'gm', { sheetId: 'sheet-kael', condition: 'Caído', on: true }, '2026-01-01T00:00:03Z'),
      ev('e4', 'xp_award', 'gm', { sheetIds: ['sheet-kael', 'outra'], amount: 50 }, '2026-01-01T00:00:04Z'),
    ];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    expect(calls).toEqual(['dano sheet-kael 7', 'cura sheet-kael 3', 'cond sheet-kael Caído', 'xp sheet-kael 50']);
    // novo refresh (evento repetido, ou outro aparelho com a ficha sincronizada) não reaplica
    await useSessionStore.getState().refresh();
    expect(calls.length).toBe(4);
  });

  it('ignora ordem de quem não é o mestre e ficha que não está no aparelho', async () => {
    events = [
      ev('x1', 'hero_hp', 'p2', { sheetId: 'sheet-kael', amount: 99, kind: 'damage' }),
      ev('x2', 'hero_hp', 'gm', { sheetId: 'sheet-de-outro', amount: 5, kind: 'damage' }),
    ];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    expect(calls).toEqual([]);
  });

  it('item dado pelo mestre entra na mochila (do catálogo ou inventado) — uma vez só', async () => {
    events = [
      ev('i1', 'hero_item', 'gm', { sheetId: 'sheet-kael', heroName: 'Kael', itemId: 'w-longsword', item: 'Espada Longa', quantity: 1 }, '2026-01-01T00:00:01Z'),
      ev('i2', 'hero_item', 'gm', { sheetId: 'sheet-kael', heroName: 'Kael', item: 'Chave de osso', quantity: 2, note: 'abre a cripta' }, '2026-01-01T00:00:02Z'),
      ev('i3', 'hero_item', 'p2', { sheetId: 'sheet-kael', item: 'Item roubado', quantity: 1 }, '2026-01-01T00:00:03Z'),
    ];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    expect(calls).toEqual(['item sheet-kael Espada Longa x1 — 1d8 (1d10) cortante · Versátil', 'item sheet-kael Chave de osso x2 (inventado) — abre a cripta']);
    await useSessionStore.getState().refresh();
    expect(calls.length).toBe(2);
  });

  it('golpe final e cicatriz do mestre vão para a carta — uma vez só', async () => {
    events = [
      ev('d1', 'hero_deed', 'gm', { sheetId: 'sheet-kael', name: 'Kael', creature: 'Dragão Vermelho Adulto', kinds: ['kills', 'dragons'] }, '2026-01-01T00:00:01Z'),
      ev('d2', 'hero_scar', 'gm', { sheetId: 'sheet-kael', name: 'Kael', text: 'Garra no ombro', session: 'Sessão 12' }, '2026-01-01T00:00:02Z'),
      ev('d3', 'hero_scar', 'p2', { sheetId: 'sheet-kael', text: 'Falsa' }, '2026-01-01T00:00:03Z'),
    ];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    // o feito chega pelo módulo carregado sob demanda (assíncrono)
    await vi.waitFor(() => expect(calls).toEqual(['cicatriz sheet-kael Garra no ombro · Sessão 12 · mestre', 'feito sheet-kael kills', 'feito sheet-kael dragons']));
    await useSessionStore.getState().refresh();
    expect(calls.length).toBe(3);
  });

  it('20 natural de outro herói abre o crítico cinematográfico na minha tela', async () => {
    const { useUiStore } = await import('../uiStore');
    useUiStore.setState({ cinematic: null, cinematics: true });
    events = [];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    events = [
      ev('r1', 'roll', 'p2', { who: 'Lyra', label: 'Ataque · Arco', d20: true, crit: true, fail: false, sheetId: 'sheet-lyra' }, '2026-01-01T00:00:05Z'),
      ev('r2', 'roll', 'p1', { who: 'Kael', label: 'Ataque', d20: true, crit: true, sheetId: 'sheet-kael' }, '2026-01-01T00:00:06Z'),
    ];
    await useSessionStore.getState().refresh();
    expect(useUiStore.getState().cinematic).toMatchObject({ kind: 'crit', sheetId: 'sheet-lyra', name: 'Lyra', label: 'Ataque · Arco' });
  });
});
