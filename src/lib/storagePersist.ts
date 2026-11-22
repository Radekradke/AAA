/**
 * Proteção do armazenamento. As fichas vivem só no IndexedDB deste aparelho,
 * e o navegador pode apagar esse espaço por conta própria: o Safari limpa
 * sites (não instalados) que ficam 7 dias sem uso; o Chrome e o Firefox
 * liberam espaço quando o disco enche. Pedir armazenamento PERSISTENTE tira
 * os dados dessa faxina automática.
 *
 * O Chrome concede sem perguntar (app instalado ou usado com frequência); o
 * Firefox mostra uma pergunta — por isso o pedido automático é espaçado.
 */
export interface StorageStatus {
  /** O navegador oferece a API de persistência. */
  supported: boolean;
  /** Já está protegido (não entra na faxina automática). */
  persisted: boolean;
  /** Bytes usados / disponíveis para este site (quando o navegador informa). */
  usage?: number;
  quota?: number;
}

const ASKED_KEY = 'fv-persist-asked';
/** Intervalo entre pedidos automáticos (o manual, em Configurações, é livre). */
export const PERSIST_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

function storageApi(): StorageManager | null {
  return typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null;
}

export async function storageStatus(): Promise<StorageStatus> {
  const api = storageApi();
  if (!api?.persist || !api.persisted) return { supported: false, persisted: false };
  const [persisted, estimate] = await Promise.all([
    api.persisted().catch(() => false),
    api.estimate ? api.estimate().catch(() => undefined) : Promise.resolve(undefined),
  ]);
  return { supported: true, persisted, usage: estimate?.usage, quota: estimate?.quota };
}

/** Pede a proteção agora. Devolve se ficou protegido. */
export async function requestPersistentStorage(): Promise<boolean> {
  const api = storageApi();
  if (!api?.persist) return false;
  try {
    if (await api.persisted?.()) return true;
    rememberAsked();
    return await api.persist();
  } catch {
    return false;
  }
}

function rememberAsked() {
  try {
    localStorage.setItem(ASKED_KEY, String(Date.now()));
  } catch {
    /* sem localStorage: só não espaça os pedidos */
  }
}

/** Pode pedir sozinho de novo? (nunca pediu ou o último pedido foi há mais de 7 dias) */
export function canAskAgain(now = Date.now()): boolean {
  try {
    const last = Number(localStorage.getItem(ASKED_KEY) ?? 0);
    return !last || now - last > PERSIST_RETRY_MS;
  } catch {
    return true;
  }
}

/**
 * Pedido automático: só quando há heróis a proteger e respeitando o
 * intervalo — quem negou no Firefox não é perguntado a cada abertura.
 */
export async function protectIfNeeded(heroCount: number): Promise<boolean> {
  if (heroCount < 1) return false;
  const status = await storageStatus();
  if (!status.supported || status.persisted) return status.persisted;
  if (!canAskAgain()) return false;
  return requestPersistentStorage();
}

/** "12,4 MB" — para mostrar o espaço usado. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace('.', ',')} MB`;
  return `${(mb / 1024).toFixed(1).replace('.', ',').replace(/,0$/, '')} GB`;
}
