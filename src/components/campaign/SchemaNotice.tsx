import { useEffect, useState } from 'react';
import { schemaService } from '@/services/schemaService';
import type { SchemaStatus } from '@/services/schemaService';

const DISMISS = 'fv-schema-notice';

/**
 * Aviso para o MESTRE quando falta rodar algum script do banco. Diz qual
 * arquivo, o que ele liga e como rodar — e some quando estiver tudo certo.
 */
export function SchemaNotice() {
  const [status, setStatus] = useState<SchemaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let alive = true;
    void schemaService.status().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  if (hidden || !status || status.missing.length === 0) return null;

  const recheck = async () => {
    setBusy(true);
    setStatus(await schemaService.status(true));
    setBusy(false);
  };

  return (
    <section className="fv-panel fv-schema-notice" role="status" aria-labelledby="fv-schema-title">
      <div className="fv-schema-head">
        <h2 id="fv-schema-title">O banco da mesa precisa de uma atualização</h2>
        <button
          type="button"
          className="fv-schema-x"
          aria-label="Esconder até a próxima visita"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(DISMISS, '1');
            } catch {
              /* ignora */
            }
          }}
        >
          ×
        </button>
      </div>
      <p>Alguns recursos ficam desligados até rodar {status.missing.length === 1 ? 'este script' : 'estes scripts'} no Supabase (só o mestre/dono do projeto precisa fazer isso, uma vez):</p>
      <ul>
        {status.missing.map((m) => (
          <li key={m.step}>
            <code>{m.file}</code> <span>— {m.what}</span>
          </li>
        ))}
      </ul>
      <p className="fv-schema-how">No Supabase: <b>SQL Editor</b> → aba nova → cole o arquivo inteiro → <b>Run</b> (sem nada selecionado). Pode rodar de novo sem medo.</p>
      <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void recheck()}>
        {busy ? 'Verificando…' : 'Já rodei — verificar'}
      </button>
    </section>
  );
}
