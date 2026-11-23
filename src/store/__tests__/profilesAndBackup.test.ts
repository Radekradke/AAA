import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/test/loadCharacterActions';
import { useCharacterStore } from '../characterStore';
import { createDraftCharacter, finalizeCharacter } from '@/engine/characterBuilder';
import type { Character } from '@/types/character';
import { heroRescue, otherLocalHeroes } from '@/lib/localProfiles';
import { isCloudAccount } from '@/lib/identity';
import { BACKUP_FORMAT, backupDue, backupFileName, buildBackup, clueImageIds, markBackup, parseBackup, planRestore, snoozeBackupReminder } from '@/lib/backup';
import { applyRestore } from '@/lib/backupActions';
import { __resetClueImages, loadClueImage } from '@/lib/clueImageStore';
import { useHomebrewStore } from '../homebrewStore';

// ambiente node: localStorage/sessionStorage de mentira
const mem = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
vi.stubGlobal('localStorage', fakeStorage);
vi.stubGlobal('sessionStorage', fakeStorage);


const CLOUD = '11111111-2222-3333-4444-555555555555';
const OTHER_CLOUD = '99999999-2222-3333-4444-555555555555';

let n = 0;
function hero(ownerId: string, extra: Partial<Character> = {}): Character {
  n += 1;
  const c = finalizeCharacter(createDraftCharacter({ ownerId, name: `Herói ${n}`, classId: 'fighter' }));
  return { ...c, id: `pc-test-${n}`, updatedAt: 1000 + n, ...extra };
}
const all = () => useCharacterStore.getState().characters;
const byId = (id: string) => all().find((c) => c.id === id)!;

beforeEach(() => {
  useCharacterStore.setState({ characters: [], pendingDeletes: [] });
  useHomebrewStore.setState({ races: [], spells: [], feats: [] });
  localStorage.clear();
  __resetClueImages();
});

describe('perfis locais: heróis invisíveis', () => {
  it('adoptCharacters troca o dono e zera o vínculo com a nuvem antiga', () => {
    const a = hero('guest', { syncStatus: 'synced', syncBase: 50, lastSyncedAt: 50 });
    const b = hero('guest');
    useCharacterStore.setState({ characters: [a, b] });
    useCharacterStore.getState().adoptCharacters([a.id], 'u-local');
    expect(byId(a.id)).toMatchObject({ ownerId: 'u-local', syncStatus: 'pending', syncBase: undefined, lastSyncedAt: undefined });
    expect(byId(b.id).ownerId).toBe('guest');
  });

  it('otherLocalHeroes ignora rascunhos, os meus e os de contas da nuvem', () => {
    const mine = hero('u1');
    const guest = hero('guest');
    const draft = { ...hero('guest'), draft: true };
    const cloud = hero(CLOUD);
    expect(otherLocalHeroes([mine, guest, draft, cloud], 'u1').map((c) => c.id)).toEqual([guest.id]);
  });

  it('heroRescue: convidado e perfil apagado podem vir; outra conta local só é apontada', () => {
    const guest = hero('guest');
    const orphan = hero('u-apagado');
    const sibling = hero('u-irmao');
    const r = heroRescue([guest, orphan, sibling, hero(OTHER_CLOUD)], 'u-eu', [
      { id: 'u-eu', name: 'Eu' },
      { id: 'u-irmao', name: 'Irmão' },
    ]);
    expect(r.claimable.map((c) => c.id).sort()).toEqual([guest.id, orphan.id].sort());
    expect(r.elsewhere).toEqual([{ ownerId: 'u-irmao', name: 'Irmão', count: 1 }]);
  });
});

describe('conta da nuvem', () => {
  it('convidado e conta local não contam como nuvem (nada de sync/mesa para elas)', () => {
    expect(isCloudAccount(null)).toBe(false);
    expect(isCloudAccount({ id: 'guest', guest: true })).toBe(false);
    expect(isCloudAccount({ id: 'u1abc2', guest: false })).toBe(false);
    expect(isCloudAccount({ id: CLOUD, guest: true })).toBe(false);
    expect(isCloudAccount({ id: CLOUD })).toBe(true);
  });
});

describe('backup: montar e ler', () => {
  it('ida e volta: o arquivo montado é lido igual (rascunhos ficam de fora)', () => {
    const a = hero('u1');
    const d = { ...hero('u1'), draft: true };
    const file = JSON.stringify(
      buildBackup({ profile: { id: 'u1', name: 'Ana' }, characters: [a, d], clueImages: { img1: 'data:image/webp;base64,AAAA' }, homebrew: { races: [], spells: [], feats: [] }, now: 5 }),
    );
    const parsed = parseBackup(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.format).toBe(BACKUP_FORMAT);
    expect(parsed.backup.characters.map((c) => c.id)).toEqual([a.id]);
    expect(parsed.backup.clueImages).toEqual({ img1: 'data:image/webp;base64,AAAA' });
    expect(parsed.skipped).toEqual([]);
  });

  it('recusa lixo, ficha avulsa e versão do futuro com mensagens claras', () => {
    expect(parseBackup('não é json')).toMatchObject({ ok: false });
    const single = parseBackup(JSON.stringify(hero('u1')));
    expect(single.ok).toBe(false);
    if (!single.ok) expect(single.error).toMatch(/ficha avulsa/);
    const future = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 99, characters: [] }));
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.error).toMatch(/versão mais nova/);
  });

  it('ficha inválida dentro do backup fica de fora sem derrubar as outras', () => {
    const good = hero('u1');
    const bad = { ...hero('u1'), level: 99 };
    const parsed = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, characters: [good, bad, 'x'] }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.characters.map((c) => c.id)).toEqual([good.id]);
    expect(parsed.skipped).toHaveLength(2);
  });

  it('clueImageIds junta as imagens das pistas sem repetir', () => {
    const a = hero('u1', { diary: { clues: [{ id: 'c1', title: '', text: '', status: 'unverified', imageId: 'img1', at: 1 }, { id: 'c2', title: '', text: '', status: 'unverified', imageId: 'img1', at: 1 }] } as unknown as Character['diary'] });
    expect(clueImageIds([a, hero('u1')])).toEqual(['img1']);
  });

  it('nome do arquivo com a data', () => {
    expect(backupFileName(new Date(2026, 10, 2).getTime())).toBe('ficha-viva-backup-2026-11-02.json');
  });
});

describe('backup: restaurar', () => {
  it('planRestore separa novos, iguais, conflitos e heróis de outro perfil (viram cópia)', () => {
    const fresh = hero('u1');
    const same = hero('u1');
    const changed = hero('u1');
    const foreign = hero('u2');
    const backup = buildBackup({
      profile: { id: 'u1', name: 'Ana' },
      characters: [fresh, same, { ...changed, updatedAt: changed.updatedAt + 10 }, foreign],
      clueImages: {},
      homebrew: { races: [], spells: [], feats: [] },
    });
    const plan = planRestore(backup, [same, changed, { ...foreign, ownerId: 'outra' }], 'u1');
    expect(plan.unchanged).toBe(1);
    expect(plan.conflicts.map((c) => [c.incoming.id, c.newer])).toEqual([[changed.id, 'backup']]);
    expect(plan.fresh.map((c) => c.id)).toContain(fresh.id);
    const copy = plan.fresh.find((c) => c.name === foreign.name)!;
    expect(copy.id).not.toBe(foreign.id);
  });

  it('manter os deste aparelho: só entra o novo; nada é apagado', async () => {
    const local = hero('u1', { syncBase: 70, lastSyncedAt: 70 });
    const fresh = hero('u1');
    useCharacterStore.setState({ characters: [local] });
    const backup = buildBackup({ profile: { id: 'u1', name: 'Ana' }, characters: [{ ...local, name: 'Velho', updatedAt: 1 }, fresh], clueImages: {}, homebrew: { races: [], spells: [], feats: [] } });
    const plan = planRestore(backup, all(), 'u1');
    const r = await applyRestore(backup, plan, 'u1', false);
    expect(r).toMatchObject({ added: 1, replaced: 0 });
    expect(byId(local.id).name).toBe(local.name);
    expect(byId(fresh.id).ownerId).toBe('u1');
  });

  it('usar os do backup: substitui guardando o vínculo deste aparelho com a nuvem', async () => {
    const local = hero(CLOUD, { syncBase: 70, lastSyncedAt: 70, updatedAt: 80 });
    useCharacterStore.setState({ characters: [local] });
    const backup = buildBackup({ profile: { id: CLOUD, name: 'Ana' }, characters: [{ ...local, name: 'Do backup', syncBase: 10, lastSyncedAt: 10, updatedAt: 20 }], clueImages: {}, homebrew: { races: [], spells: [], feats: [] } });
    const r = await applyRestore(backup, planRestore(backup, all(), CLOUD), CLOUD, true);
    expect(r.replaced).toBe(1);
    const after = byId(local.id);
    expect(after.name).toBe('Do backup');
    expect(after.syncBase).toBe(70);
    expect(after.updatedAt).toBeGreaterThan(80);
    expect(after.syncStatus).toBe('pending');
  });

  it('backup de outro dono entra sem o vínculo da nuvem dele; tira da fila de exclusão', async () => {
    const h = hero(CLOUD, { syncBase: 30, lastSyncedAt: 30 });
    useCharacterStore.setState({ characters: [], pendingDeletes: [h.id] });
    const backup = buildBackup({ profile: { id: CLOUD, name: 'Ana' }, characters: [h], clueImages: {}, homebrew: { races: [], spells: [], feats: [] } });
    await applyRestore(backup, planRestore(backup, all(), 'u-local'), 'u-local', false);
    expect(byId(h.id)).toMatchObject({ ownerId: 'u-local', syncBase: undefined, lastSyncedAt: undefined });
    expect(useCharacterStore.getState().pendingDeletes).toEqual([]);
  });

  it('imagens das pistas: entram as que faltam, as daqui não são trocadas', async () => {
    const backup = buildBackup({ profile: { id: 'u1', name: 'A' }, characters: [], clueImages: { imgA: 'data:image/webp;base64,QQ==', 'bad id!': 'data:image/webp;base64,QQ==', imgB: 'javascript:alert(1)' }, homebrew: { races: [], spells: [], feats: [] } });
    const r = await applyRestore(backup, { fresh: [], conflicts: [], unchanged: 0 }, 'u1', false);
    expect(r.images).toBe(1);
    expect(await loadClueImage('imgA')).toBe('data:image/webp;base64,QQ==');
    const again = await applyRestore(backup, { fresh: [], conflicts: [], unchanged: 0 }, 'u1', false);
    expect(again.images).toBe(0);
  });
});

describe('lembrete de backup', () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  it('só sem nuvem, com heróis e depois de alguns dias de uso', () => {
    expect(backupDue({ now, cloud: true, heroes: [{ createdAt: 0 }] })).toBe(false);
    expect(backupDue({ now, cloud: false, heroes: [] })).toBe(false);
    expect(backupDue({ now, cloud: false, heroes: [{ createdAt: now - DAY }] })).toBe(false);
    expect(backupDue({ now, cloud: false, heroes: [{ createdAt: now - 5 * DAY }] })).toBe(true);
  });
  it('backup recente cala; antigo lembra; "lembrar depois" cala por 7 dias', () => {
    const heroes = [{ createdAt: 0 }];
    markBackup(now - 3 * DAY);
    expect(backupDue({ now, cloud: false, heroes })).toBe(false);
    markBackup(now - 20 * DAY);
    expect(backupDue({ now, cloud: false, heroes })).toBe(true);
    snoozeBackupReminder(now);
    expect(backupDue({ now: now + 6 * DAY, cloud: false, heroes })).toBe(false);
    expect(backupDue({ now: now + 8 * DAY, cloud: false, heroes })).toBe(true);
  });
});
