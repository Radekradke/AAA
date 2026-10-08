import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PrintStudio } from '@/components/print/PrintStudio';
import { shareService } from '@/services/shareService';
import { cloudEnabled } from '@/services/supabaseClient';
import type { Character } from '@/types/character';

type State = { kind: 'loading' } | { kind: 'ok'; char: Character; updatedAt: number } | { kind: 'missing' } | { kind: 'error'; message: string };

/** /f/:token — ficha compartilhada por link: só leitura, sem conta. */
export function SharedSheet() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token || !cloudEnabled()) {
      setState({ kind: 'error', message: 'Este site não está ligado à nuvem.' });
      return;
    }
    let alive = true;
    shareService
      .get(token)
      .then((r) => alive && setState(r ? { kind: 'ok', ...r } : { kind: 'missing' }))
      .catch((e: Error) => alive && setState({ kind: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (state.kind === 'ok') document.title = `${state.char.name || 'Ficha'} — Ficha Viva`;
  }, [state]);

  if (state.kind !== 'ok') {
    return (
      <main className="fv-printpage">
        <div className="fv-printpage-msg" role={state.kind === 'loading' ? 'status' : 'alert'}>
          {state.kind === 'loading' && <h1>Abrindo a ficha…</h1>}
          {state.kind === 'missing' && (
            <>
              <h1>Link sem ficha</h1>
              <p>O link pode ter sido revogado pelo dono, ou está incompleto.</p>
            </>
          )}
          {state.kind === 'error' && (
            <>
              <h1>Não deu para abrir</h1>
              <p>{state.message}</p>
            </>
          )}
          <div className="fv-printpage-bar" style={{ justifyContent: 'center', margin: 0 }}>
            <a className="is-primary" href="/">Conhecer o Ficha Viva</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <PrintStudio
      char={state.char}
      lead={<p>Ficha compartilhada · só leitura · atualizada em {new Date(state.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
    />
  );
}
