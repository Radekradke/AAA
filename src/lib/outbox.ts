/**
 * Fila de gravações que esperam a rede voltar.
 *
 * Só entra o que é IDEMPOTENTE (mandar duas vezes dá no mesmo): "o peão
 * está em (5,3)", "a luz é 12 m", "a névoa é esta". Cada gravação tem uma
 * chave; uma nova com a mesma chave substitui a antiga (mover o peão três
 * vezes sem rede manda só a última posição). Alternâncias como abrir/
 * fechar porta NÃO entram: repetidas, dariam o contrário.
 *
 * `flush` manda na ordem em que entraram. Se a rede cair de novo no meio,
 * para e guarda o resto; se o banco recusar uma (regra, permissão), ela sai
 * da fila e volta em `dropped` para a tela avisar.
 */
export type OutboxRun = () => Promise<unknown>;

export interface OutboxResult {
  sent: number;
  dropped: { key: string; error: unknown }[];
  left: number;
}

export interface Outbox {
  put: (key: string, run: OutboxRun) => void;
  readonly size: number;
  flush: () => Promise<OutboxResult>;
  clear: () => void;
}

export function createOutbox(isOffline: (e: unknown) => boolean): Outbox {
  const items = new Map<string, OutboxRun>();
  let flushing: Promise<OutboxResult> | null = null;

  const drain = async (): Promise<OutboxResult> => {
    let sent = 0;
    const dropped: OutboxResult['dropped'] = [];
    for (const [key, run] of [...items]) {
      // trocada durante o envio por uma mais nova: a nova fica para a próxima
      if (items.get(key) !== run) continue;
      try {
        await run();
        sent++;
      } catch (error) {
        if (isOffline(error)) break;
        dropped.push({ key, error });
      }
      if (items.get(key) === run) items.delete(key);
    }
    return { sent, dropped, left: items.size };
  };

  return {
    put(key, run) {
      items.delete(key); // vai para o fim: a ordem é a da última mudança
      items.set(key, run);
    },
    get size() {
      return items.size;
    },
    flush() {
      flushing ??= drain().finally(() => {
        flushing = null;
      });
      return flushing;
    },
    clear() {
      items.clear();
    },
  };
}

/** A falha foi de rede (sem internet, servidor fora), não do banco recusar. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|ERR_INTERNET_DISCONNECTED|ERR_NETWORK/i.test(msg);
}
