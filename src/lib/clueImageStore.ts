import { useEffect, useState } from 'react';
import { idbAvailable, idbDel, idbGet, idbSet } from '@/lib/storage/idb';
import { getSupabase } from '@/services/supabaseClient';
import { newId } from '@/store/character/ids';

/**
 * Imagens das pistas do diário. NÃO ficam dentro da ficha (que sobe inteira a
 * cada edição e vai para o histórico): cada uma tem sua chave no IndexedDB
 * deste aparelho — funciona offline — e uma cópia PRIVADA no bucket `diario`
 * (pasta do próprio jogador), para aparecer nos outros aparelhos dele.
 * A pista guarda só o `imageId`.
 */

const BUCKET = 'diario';
const QUEUE = 'fv-clue-img-queue';
const key = (id: string) => `fv-clue-img:${id}`;
const memory = new Map<string, unknown>(); // testes / navegador sem IndexedDB

async function get<T>(k: string): Promise<T | undefined> {
  if (!idbAvailable()) return memory.get(k) as T | undefined;
  try {
    return await idbGet<T>(k);
  } catch {
    return undefined;
  }
}
async function put(k: string, v: unknown) {
  if (!idbAvailable()) return void memory.set(k, v);
  await idbSet(k, v);
}
async function del(k: string) {
  if (!idbAvailable()) return void memory.delete(k);
  await idbDel(k).catch(() => undefined);
}

const CLOUD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const path = (userId: string, id: string) => `${userId}/${id}`;

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/webp';
  const bin = atob(b64 ?? '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/webp'};base64,${btoa(bin)}`;
}

async function queue(): Promise<string[]> {
  return (await get<string[]>(QUEUE)) ?? [];
}

// a fila é lida e regravada: uma alteração por vez, para nenhuma se perder
let chain: Promise<unknown> = Promise.resolve();
function editQueue(fn: (q: string[]) => string[]): Promise<void> {
  const job = chain.then(async () => put(QUEUE, fn(await queue())));
  chain = job.catch(() => undefined);
  return job;
}

/** Guarda a imagem neste aparelho e põe na fila de envio. Devolve o id para a pista. */
export async function saveClueImage(dataUrl: string): Promise<string> {
  const id = newId('img');
  await put(key(id), dataUrl);
  await editQueue((q) => [...q, id]);
  return id;
}

/** A imagem (data URL): deste aparelho, ou baixada da cópia privada na nuvem (e guardada aqui). */
export async function loadClueImage(id: string, userId?: string | null): Promise<string | null> {
  const local = await get<string>(key(id));
  if (local) return local;
  const sb = getSupabase();
  if (!sb || !userId || !CLOUD_ID.test(userId)) return null;
  const { data, error } = await sb.storage.from(BUCKET).download(path(userId, id));
  if (error || !data) return null;
  const url = await blobToDataUrl(data);
  await put(key(id), url);
  return url;
}

/** Apaga a imagem (aparelho, fila e nuvem — esta última quando der). */
export async function forgetClueImage(id: string, userId?: string | null): Promise<void> {
  await del(key(id));
  await editQueue((q) => q.filter((x) => x !== id));
  const sb = getSupabase();
  if (sb && userId && CLOUD_ID.test(userId)) await sb.storage.from(BUCKET).remove([path(userId, id)]).catch(() => undefined);
}

/** Sobe as imagens que ainda não foram para a nuvem (chamado no fim de cada sincronização). */
export async function flushClueImageUploads(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !CLOUD_ID.test(userId)) return;
  const pending = await queue();
  const done: string[] = [];
  for (const id of pending) {
    const url = await get<string>(key(id));
    if (!url) {
      done.push(id); // apagada antes de subir
      continue;
    }
    const blob = dataUrlToBlob(url);
    const { error } = await sb.storage.from(BUCKET).upload(path(userId, id), blob, { contentType: blob.type, upsert: true, cacheControl: '31536000' });
    if (error) break; // sem o bucket (SQL não rodou) ou sem rede: tenta na próxima
    done.push(id);
  }
  if (done.length) await editQueue((q) => q.filter((x) => !done.includes(x)));
}

/** A imagem de uma pista para mostrar (null enquanto carrega ou se não houver). */
export function useClueImageUrl(imageId: string | undefined, userId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!imageId) return;
    let alive = true;
    void loadClueImage(imageId, userId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [imageId, userId]);
  return url;
}

export function __resetClueImages() {
  memory.clear();
}
