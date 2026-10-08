import { getSupabase } from '@/services/supabaseClient';

/**
 * Captador de erros do app: o que quebra na mão do jogador fica registrado
 * aqui, mesmo que ele não conte.
 * · Sempre: os últimos erros ficam neste aparelho (Diagnóstico → "Erros
 *   recentes", com botão de copiar o relatório).
 * · Com nuvem: cada erro novo também vai para a tabela `client_errors`
 *   (supabase/recursos_extras.sql) — o dono do projeto vê no painel do
 *   Supabase. Sem a tabela, o envio desliga sozinho nesta sessão.
 * Sem serviço externo, sem dependência nova.
 */
export interface ErrorEntry {
  id: string;
  at: number;
  kind: 'render' | 'window' | 'promise' | 'manual';
  message: string;
  stack?: string;
  where: string;
  /** Componente/peça onde o erro apareceu (Error Boundary). */
  scope?: string;
  count: number;
}

const KEY = 'fv-errors';
const MAX = 30;
const REMOTE_MAX_PER_SESSION = 10;

let remoteSent = 0;
let remoteOff = false;
const listeners = new Set<() => void>();

function load(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

function save(list: ErrorEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* armazenamento cheio/bloqueado: o erro só não fica guardado */
  }
}

/** Ruído conhecido que não é bug do app (extensões, avisos do navegador). */
export function isNoise(message: string, stack = ''): boolean {
  return (
    /ResizeObserver loop/i.test(message) ||
    /^Script error\.?$/i.test(message) ||
    /chrome-extension:|moz-extension:|safari-extension:/i.test(stack) ||
    /AbortError|The user aborted a request/i.test(message)
  );
}

/** Pedaço de código antigo que sumiu depois de uma atualização (deploy novo). */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(msg);
}

function normalize(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message || err.name, stack: err.stack?.split('\n').slice(0, 12).join('\n') };
  if (typeof err === 'string') return { message: err };
  try {
    return { message: JSON.stringify(err).slice(0, 500) };
  } catch {
    return { message: String(err) };
  }
}

export function reportError(err: unknown, opts: { kind?: ErrorEntry['kind']; scope?: string } = {}): ErrorEntry | null {
  const { message, stack } = normalize(err);
  if (isNoise(message, stack)) return null;
  const where = typeof location !== 'undefined' ? location.pathname : '';
  const list = load();
  // o mesmo erro repetido na mesma tela vira contador, não spam
  const same = list.find((e) => e.message === message && e.where === where && Date.now() - e.at < 10 * 60 * 1000);
  let entry: ErrorEntry;
  if (same) {
    same.count++;
    same.at = Date.now();
    entry = same;
    save([same, ...list.filter((e) => e !== same)]);
  } else {
    entry = { id: Math.random().toString(36).slice(2, 10), at: Date.now(), kind: opts.kind ?? 'manual', message: message.slice(0, 500), stack, where, scope: opts.scope, count: 1 };
    save([entry, ...list]);
    void sendRemote(entry);
  }
  listeners.forEach((l) => l());
  if (import.meta.env.DEV) console.warn('[fv] erro registrado:', message);
  return entry;
}

async function sendRemote(e: ErrorEntry) {
  if (remoteOff || remoteSent >= REMOTE_MAX_PER_SESSION) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) return; // só contas logadas enviam (a tabela não aceita anônimos)
    remoteSent++;
    const { error } = await sb.from('client_errors').insert({
      message: e.message,
      stack: e.stack ?? null,
      route: e.where,
      kind: e.kind,
      scope: e.scope ?? null,
      app_version: import.meta.env.VITE_APP_VERSION ?? null,
      user_agent: navigator.userAgent.slice(0, 300),
    });
    if (error) remoteOff = true; // tabela ainda não criada: para de tentar nesta sessão
  } catch {
    remoteOff = true;
  }
}

export function recentErrors(): ErrorEntry[] {
  return load();
}

export function clearErrors() {
  save([]);
  listeners.forEach((l) => l());
}

export function onErrorsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Texto para colar numa mensagem/issue. */
export function errorReport(list: ErrorEntry[] = load()): string {
  const head = `Ficha Viva — relatório de erros\n${new Date().toLocaleString('pt-BR')}\n${navigator.userAgent}\n`;
  return (
    head +
    list
      .map((e) => `\n[${new Date(e.at).toLocaleString('pt-BR')}] ${e.kind}${e.scope ? ' · ' + e.scope : ''} · ${e.where}${e.count > 1 ? ` · ×${e.count}` : ''}\n${e.message}${e.stack ? '\n' + e.stack : ''}`)
      .join('\n')
  );
}

/**
 * Recarrega UMA vez quando um pedaço de código antigo sumiu (atualização do
 * site com a aba aberta). Na segunda vez deixa a tela de erro aparecer.
 */
export function reloadOnceForStaleChunk(): boolean {
  try {
    const k = 'fv-chunk-reload';
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(k, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

/** Erros fora do React (eventos, timers, promessas sem catch). */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (ev) => {
    const err = ev.error ?? ev.message;
    if (isChunkLoadError(err) && reloadOnceForStaleChunk()) return;
    reportError(err, { kind: 'window' });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    if (isChunkLoadError(ev.reason) && reloadOnceForStaleChunk()) return;
    reportError(ev.reason, { kind: 'promise' });
  });
  // Vite avisa quando um preload de pedaço falha (deploy novo com a aba aberta)
  window.addEventListener('vite:preloadError', (ev) => {
    ev.preventDefault();
    if (!reloadOnceForStaleChunk()) reportError((ev as Event & { payload?: unknown }).payload ?? 'preload', { kind: 'window' });
  });
}
