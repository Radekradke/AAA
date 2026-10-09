import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = vi.hoisted(() => ({
  files: new Map<string, Blob>(),
  fail: false,
  removed: [] as string[],
}));

vi.mock('@/services/supabaseClient', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: async (path: string, blob: Blob) => {
          if (bucket.fail) return { error: { message: 'Bucket not found' } };
          bucket.files.set(path, blob);
          return { error: null };
        },
        download: async (path: string) => (bucket.files.has(path) ? { data: bucket.files.get(path), error: null } : { data: null, error: { message: 'not found' } }),
        remove: async (paths: string[]) => {
          bucket.removed.push(...paths);
          paths.forEach((p) => bucket.files.delete(p));
          return { error: null };
        },
      }),
    },
  }),
}));

import { __resetClueImages, flushClueImageUploads, forgetClueImage, loadClueImage, saveClueImage } from '../clueImageStore';

const USER = '22222222-2222-4222-8222-222222222222';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';

beforeEach(() => {
  __resetClueImages();
  bucket.files.clear();
  bucket.fail = false;
  bucket.removed = [];
});

describe('imagens das pistas (fora da ficha)', () => {
  it('guarda no aparelho e devolve só um id para a pista', async () => {
    const id = await saveClueImage(PNG);
    expect(id).toMatch(/^img/);
    expect(await loadClueImage(id)).toBe(PNG);
  });

  it('a sincronização sobe a fila para a pasta privada do jogador', async () => {
    const id = await saveClueImage(PNG);
    await flushClueImageUploads(USER);
    expect([...bucket.files.keys()]).toEqual([`${USER}/${id}`]);
    await flushClueImageUploads(USER); // fila vazia: não sobe de novo
    expect(bucket.files.size).toBe(1);
  });

  it('sem o bucket (SQL não rodou): mantém na fila e tenta depois', async () => {
    const id = await saveClueImage(PNG);
    bucket.fail = true;
    await flushClueImageUploads(USER);
    expect(bucket.files.size).toBe(0);
    bucket.fail = false;
    await flushClueImageUploads(USER);
    expect(bucket.files.has(`${USER}/${id}`)).toBe(true);
  });

  it('em outro aparelho: baixa da nuvem e guarda localmente', async () => {
    const id = await saveClueImage(PNG);
    await flushClueImageUploads(USER);
    __resetClueImages(); // "outro aparelho": nada local
    const url = await loadClueImage(id, USER);
    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(await loadClueImage(id)).toBe(url); // ficou guardada aqui
  });

  it('convidado (sem nuvem) não tenta baixar', async () => {
    expect(await loadClueImage('img-x', 'guest')).toBeNull();
  });

  it('apagar tira do aparelho, da fila e da nuvem', async () => {
    const id = await saveClueImage(PNG);
    await flushClueImageUploads(USER);
    await forgetClueImage(id, USER);
    expect(await loadClueImage(id)).toBeNull();
    expect(bucket.removed).toEqual([`${USER}/${id}`]);
  });
});
