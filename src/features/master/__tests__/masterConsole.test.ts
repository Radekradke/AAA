import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Combatant } from '@/types/session';
import type { CampaignNpc } from '@/types/npc';

// ---------- mocks: banco, sessão e avisos ----------
const saveTray = vi.fn(async () => undefined);
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
vi.mock('@/services/masterService', async (orig) => {
  const real = await orig<typeof import('@/services/masterService')>();
  return { ...real, masterService: { ...real.masterService, saveTray, tray: vi.fn(async () => real.normalizeTray({ npcs: ['n1'] })) } };
});

const toasts: { message: string; action?: { label: string; run: () => void } }[] = [];
vi.mock('@/store/feedbackStore', () => ({
  toast: (message: string, opts: { action?: { label: string; run: () => void } } = {}) => void toasts.push({ message, action: opts.action }),
}));

const ops: string[] = [];
let combatants: Combatant[] = [];
const session = {
  session: { id: 'sess' } as { id: string } | null,
  encounter: null as { id: string } | null,
  error: null,
  get combatants() {
    return combatants;
  },
  changeHp: vi.fn(async (c: Combatant, d: number) => {
    ops.push(`hp ${c.id} ${d}`);
    combatants = combatants.map((x) => (x.id === c.id ? { ...x, hpCurrent: (x.hpCurrent ?? 0) + d } : x));
  }),
  updateCombatant: vi.fn(async (id: string, patch: Record<string, unknown>) => void ops.push(`update ${id} ${JSON.stringify(patch)}`)),
  createEncounter: vi.fn(async (name: string) => {
    ops.push(`encontro ${name}`);
    session.encounter = { id: 'enc' };
  }),
  addCombatants: vi.fn(async (list: { name: string }[]) => void ops.push(`add ${list.map((x) => x.name).join(',')}`)),
};
vi.mock('@/store/sessionStore', () => ({ useSessionStore: { getState: () => session } }));

const { normalizeTray, toggleTray, trayCount, EMPTY_TRAY } = await import('@/services/masterService');
const { useMasterStore } = await import('../masterStore');
const { hpWithUndo, toggleHiddenWithUndo, addToEncounter, npcToCombatant } = await import('../actions');

const goblin = (p: Partial<Combatant> = {}): Combatant =>
  ({ id: 'g1', encounterId: 'enc', type: 'monster', name: 'Goblin', hpCurrent: 7, hpMax: 7, hidden: false, conditions: [], initiative: 12, initiativeBonus: 2, armorClass: 15, sheetId: null, groupKey: null, monsterRef: 'goblin', turnOrder: 1, ...p }) as Combatant;

beforeEach(() => {
  ops.length = 0;
  toasts.length = 0;
  saveTray.mockClear();
  combatants = [goblin()];
  session.session = { id: 'sess' };
  session.encounter = null;
});

describe('bandeja da sessão (atalhos, não roteiro)', () => {
  it('normaliza o que vem do banco: só textos, sem repetidos, campos faltando viram listas vazias', () => {
    expect(normalizeTray(null)).toEqual(EMPTY_TRAY);
    expect(normalizeTray({ npcs: ['a', 'a', 3, null, 'b'], scenes: 'x', monsters: ['goblin'] })).toEqual({ npcs: ['a', 'b'], scenes: [], handouts: [], monsters: ['goblin'] });
  });

  it('marca e desmarca um atalho sem mexer no resto', () => {
    const a = toggleTray(EMPTY_TRAY, 'npcs', 'n1');
    const b = toggleTray(a, 'monsters', 'ogre');
    expect(b).toEqual({ npcs: ['n1'], scenes: [], handouts: [], monsters: ['ogre'] });
    expect(trayCount(b)).toBe(2);
    expect(toggleTray(b, 'npcs', 'n1').npcs).toEqual([]);
    expect(EMPTY_TRAY.npcs).toEqual([]); // nunca muta a original
  });

  it('a estrela aparece na hora e volta atrás se o banco recusar', async () => {
    const m = useMasterStore.getState();
    m.bind('camp');
    await m.loadTray('sess');
    expect(useMasterStore.getState().tray.npcs).toEqual(['n1']);
    await useMasterStore.getState().toggleTray('scenes', 'sc1');
    expect(useMasterStore.getState().tray.scenes).toEqual(['sc1']);
    expect(saveTray).toHaveBeenCalledWith('sess', 'camp', expect.objectContaining({ scenes: ['sc1'] }));

    saveTray.mockRejectedValueOnce(new Error('sem permissão'));
    await useMasterStore.getState().toggleTray('handouts', 'h1');
    expect(useMasterStore.getState().tray.handouts).toEqual([]);
    expect(useMasterStore.getState().error).toBe('sem permissão');
  });

  it('sem sessão aberta ou preparada, a bandeja avisa em vez de gravar', async () => {
    useMasterStore.getState().bind('outra');
    await useMasterStore.getState().toggleTray('npcs', 'n9');
    expect(saveTray).not.toHaveBeenCalled();
    expect(useMasterStore.getState().error).toMatch(/sessão/);
  });
});

describe('desfazer do mestre', () => {
  it('dano em criatura: Desfazer devolve o PV de antes', async () => {
    await hpWithUndo(combatants[0], -5);
    expect(ops).toEqual(['hp g1 -5']);
    expect(toasts[0].message).toBe('5 de dano em Goblin.');
    toasts[0].action!.run();
    expect(ops[1]).toBe('update g1 {"hp_current":7}');
  });

  it('dano em herói vai para a ficha e não oferece desfazer (não seria exato)', async () => {
    const kael = goblin({ id: 'k', type: 'player', name: 'Kael', sheetId: 'sheet-k' });
    await hpWithUndo(kael, -3);
    expect(toasts[0].action).toBeUndefined();
    expect(toasts[0].message).toMatch(/ficha/);
  });

  it('ocultar/revelar: Desfazer volta ao estado anterior', async () => {
    await toggleHiddenWithUndo(combatants[0]);
    expect(ops[0]).toBe('update g1 {"hidden":true}');
    toasts[0].action!.run();
    expect(ops[1]).toBe('update g1 {"hidden":false}');
  });
});

describe('improviso no combate', () => {
  it('criatura sem encontro aberto cria um encontro improvisado na hora', async () => {
    await addToEncounter([{ type: 'monster', name: 'Lobo', initiativeBonus: 2, hpCurrent: 11, hpMax: 11, armorClass: 13, hidden: false }]);
    expect(ops).toEqual(['encontro Encontro improvisado', 'add Lobo']);
  });

  it('sem sessão, não cria nada e explica', async () => {
    session.session = null;
    await addToEncounter([{ type: 'monster', name: 'Lobo', initiativeBonus: 0, hpCurrent: 1, hpMax: 1, armorClass: 10, hidden: false }]);
    expect(ops).toEqual([]);
    expect(toasts[0].message).toMatch(/Abra a sessão/);
  });

  it('NPC oculto entra oculto, com os números secretos do mestre', () => {
    const n = { id: 'n2', name: 'Capitão Varek', revealed: false } as CampaignNpc;
    const c = npcToCombatant(n, { n2: { npcId: 'n2', notes: '', stats: { monsterRef: 'veteran', ac: 17, hp: 58 } } as never }, []);
    expect(c).toMatchObject({ type: 'npc', name: 'Capitão Varek', hidden: true, armorClass: 17, hpMax: 58, hpCurrent: 58, monsterRef: 'veteran' });
  });
});
