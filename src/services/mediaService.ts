import { useEffect, useState } from 'react';
import { getSupabase } from './supabaseClient';
import { sessionUserId } from './campaignService';

/**
 * Imagens do palco (mapas, cenas, handouts) no Supabase Storage — bucket
 * privado "campaign-media", uma pasta por campanha. O banco decide quem baixa
 * o quê (supabase/palco.sql). Cada imagem baixada fica guardada no aparelho
 * (Cache Storage): a mesa inteira não baixa o mesmo mapa toda hora e o que já
 * foi visto abre offline.
 */
const BUCKET = 'campaign-media';
const CACHE = 'fv-media-v1';
const cacheKey = (path: string) => `https://fv-media.local/${encodeURI(path)}`;
const memory = new Map<string, string>();
const loading = new Map<string, Promise<string>>();

export const PALCO_SETUP_MISSING =
  'O banco ainda não tem o palco (mapas, cenas e handouts). No Supabase: SQL Editor → aba nova → cole supabase/palco.sql → Run.';

function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

function mediaError(e: { message: string }): Error {
  if (/bucket not found/i.test(e.message)) return new Error('Falta o espaço de imagens "campaign-media" no Storage. No Supabase: SQL Editor → aba nova → cole supabase/palco_storage.sql → Run (ou crie o bucket em Storage → New bucket, privado).');
  if (/row-level security|unauthorized|403/i.test(e.message)) return new Error('O Storage recusou a imagem: só o mestre da mesa envia arquivos.');
  if (/payload too large|exceeded|size/i.test(e.message)) return new Error('Imagem grande demais (máx. 10 MB depois de comprimida).');
  return new Error(`Não deu para enviar a imagem: ${e.message}`);
}

/** Reduz para no máximo `maxSide` px e comprime (WebP; JPEG se o navegador não gerar WebP). */
export async function compressImage(file: File, maxSide: number, quality = 0.82): Promise<{ blob: Blob; width: number; height: number; ext: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (PNG, JPG ou WebP).');
  if (file.size > 40 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 40 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
    let blob = await toBlob('image/webp');
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob('image/jpeg');
      ext = 'jpg';
    }
    if (!blob) throw new Error('Seu navegador não conseguiu comprimir a imagem.');
    return { blob, width, height, ext };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fromCache(path: string): Promise<Blob | null> {
  try {
    if (!('caches' in window)) return null;
    const hit = await (await caches.open(CACHE)).match(cacheKey(path));
    return hit ? await hit.blob() : null;
  } catch {
    return null;
  }
}

async function toCache(path: string, blob: Blob) {
  try {
    if ('caches' in window) await (await caches.open(CACHE)).put(cacheKey(path), new Response(blob, { headers: { 'Content-Type': blob.type } }));
  } catch {
    /* sem espaço: segue sem cache */
  }
}

export const mediaService = {
  /** Envia uma imagem para a pasta da campanha e devolve o caminho. */
  async upload(campaignId: string, file: File, maxSide = 1920): Promise<{ path: string; width: number; height: number }> {
    await sessionUserId();
    const { blob, width, height, ext } = await compressImage(file, maxSide);
    const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb().storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' });
    if (error) throw mediaError(error);
    await toCache(path, blob);
    return { path, width, height };
  },

  /** URL local (blob:) da imagem — do cache do aparelho ou baixando uma vez. */
  url(path: string): Promise<string> {
    const known = memory.get(path);
    if (known) return Promise.resolve(known);
    const pending = loading.get(path);
    if (pending) return pending;
    const job = (async () => {
      let blob = await fromCache(path);
      if (!blob) {
        const { data, error } = await sb().storage.from(BUCKET).download(path);
        if (error || !data) throw new Error('Imagem indisponível (ainda não foi mostrada para você, ou o arquivo sumiu).');
        blob = data;
        await toCache(path, blob);
      }
      const url = URL.createObjectURL(blob);
      memory.set(path, url);
      return url;
    })().finally(() => loading.delete(path));
    loading.set(path, job);
    return job;
  },

  async remove(paths: (string | null | undefined)[]): Promise<void> {
    const list = paths.filter((p): p is string => !!p);
    if (!list.length) return;
    await sb().storage.from(BUCKET).remove(list).catch(() => undefined);
    for (const p of list) {
      const u = memory.get(p);
      if (u) URL.revokeObjectURL(u);
      memory.delete(p);
    }
  },
};

/** Imagem do Storage pronta para <img src>. */
export function useMediaUrl(path: string | null | undefined): { url: string | null; error: string | null } {
  const [state, setState] = useState<{ path: string | null; url: string | null; error: string | null }>({ path: null, url: null, error: null });
  useEffect(() => {
    if (!path) return;
    let alive = true;
    mediaService
      .url(path)
      .then((url) => alive && setState({ path, url, error: null }))
      .catch((e) => alive && setState({ path, url: null, error: (e as Error).message }));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!path) return { url: null, error: null };
  return state.path === path ? { url: state.url, error: state.error } : { url: null, error: null };
}

/** Várias imagens do Storage de uma vez (retratos dos peões): caminho → URL local. */
export function useMediaUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const key = [...new Set(paths.filter((p): p is string => !!p))].sort().join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) return;
    let alive = true;
    for (const path of key.split('|')) {
      mediaService
        .url(path)
        .then((url) => alive && setUrls((u) => (u[path] === url ? u : { ...u, [path]: url })))
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [key]);
  return urls;
}
