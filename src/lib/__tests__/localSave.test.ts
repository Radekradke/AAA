import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const disk = vi.hoisted(() => ({ fail: false, values: new Map<string, string>() }));
vi.mock('../storage/idb', () => ({
  idbAvailable: () => true, idbGet: async (key: string) => disk.values.get(key), idbDel: async (key: string) => disk.values.delete(key),
  idbSet: async (key: string, value: string) => { if (disk.fail) throw new Error('QuotaExceededError'); disk.values.set(key, value); },
}));
import { idbStateStorage, retryLocalSave } from '../storage/zustandIdb';
import { useSaveStatusStore } from '@/store/saveStatusStore';
beforeEach(() => { vi.useFakeTimers(); disk.fail = false; disk.values.clear(); useSaveStatusStore.setState({ local: 'idle', localError: null }); });
afterEach(async () => { disk.fail = false; await retryLocalSave(); vi.useRealTimers(); });
describe('estado da gravação local', () => {
  it('mostra salvando durante debounce e só confirma após gravar', async () => {
    await idbStateStorage.setItem('teste', 'novo');
    expect(useSaveStatusStore.getState().local).toBe('saving');
    expect(disk.values.has('teste')).toBe(false);
    await vi.advanceTimersByTimeAsync(900);
    expect(disk.values.get('teste')).toBe('novo');
    expect(useSaveStatusStore.getState().local).toBe('saved');
  });
  it('falha de quota permanece em memória e retenta a versão mais recente', async () => {
    disk.fail = true;
    await idbStateStorage.setItem('teste', 'primeiro');
    await vi.advanceTimersByTimeAsync(900);
    expect(useSaveStatusStore.getState().local).toBe('error');
    expect(useSaveStatusStore.getState().localError).toBe('QuotaExceededError');
    await idbStateStorage.setItem('teste', 'mais recente');
    await vi.advanceTimersByTimeAsync(900);
    disk.fail = false;
    await retryLocalSave();
    expect(disk.values.get('teste')).toBe('mais recente');
    expect(useSaveStatusStore.getState().local).toBe('saved');
  });
});
