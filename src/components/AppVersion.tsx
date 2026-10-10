import { useEffect, useState } from 'react';
import { APP_VERSION, builtAtLabel, checkLatest, updateNow } from '@/lib/appVersion';
import type { VersionState } from '@/lib/appVersion';

/**
 * Embaixo do menu principal: qual versão está aberta e se já saiu outra.
 * Confere ao abrir e sempre que o app volta para a frente da tela.
 */
export function AppVersion() {
  const [state, setState] = useState<VersionState>('checking');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => void checkLatest().then((s) => alive && setState(s));
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const when = builtAtLabel();
  // commit só quando há um (na Vercel/CI); fora disso a versão já é a data
  const sha = /^[0-9a-f]{7}$/.test(APP_VERSION) ? APP_VERSION : '';
  const update = () => {
    setUpdating(true);
    void updateNow();
  };

  return (
    <p className={'fv-app-version is-' + state} aria-live="polite">
      <span title={`Commit ${APP_VERSION}`}>
        Versão {when || APP_VERSION}
        {when && sha && <span className="fv-app-version-sha"> · {sha}</span>}
      </span>
      {state === 'current' && <span className="fv-app-version-state">✓ atualizada</span>}
      {state === 'outdated' && (
        <button type="button" className="fv-app-version-update" onClick={update} disabled={updating}>
          {updating ? 'Atualizando…' : 'Nova versão disponível · atualizar'}
        </button>
      )}
      {state === 'unknown' && typeof navigator !== 'undefined' && !navigator.onLine && (
        <span className="fv-app-version-state">sem internet para conferir</span>
      )}
    </p>
  );
}
