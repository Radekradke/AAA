import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { heroRescue } from '@/lib/localProfiles';
import { shortSubtitle } from '@/lib/summary';
import { GUEST_ID } from '@/lib/identity';

const DISMISS_KEY = 'fv-rescue-dismissed';

/** "Agora não" vale até fechar o app — os heróis continuam salvos e o aviso volta. */
function dismissedNow(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Aviso na lista de heróis: há fichas salvas neste aparelho que não aparecem
 * para quem está logado (criadas como convidado, ou de um perfil que não
 * existe mais). Um toque traz para cá. Heróis de outra conta local só são
 * apontados — continuam daquela conta.
 */
export function HeroRescueNotice() {
  const user = useAuthStore((s) => s.user);
  const accounts = useAuthStore((s) => s.accounts);
  const characters = useCharacterStore((s) => s.characters);
  const [hidden, setHidden] = useState(dismissedNow);
  const [expanded, setExpanded] = useState(false);

  const rescue = useMemo(
    () => (user ? heroRescue(characters, user.id, accounts) : { claimable: [], elsewhere: [] }),
    [characters, user, accounts],
  );
  if (!user || hidden || (!rescue.claimable.length && !rescue.elsewhere.length)) return null;

  const bring = (ids: string[]) => {
    useCharacterStore.getState().adoptCharacters(ids, user.id);
    toast(ids.length === 1 ? 'Herói trazido para o seu perfil.' : `${ids.length} heróis trazidos para o seu perfil.`, { tone: 'ok' });
  };
  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sem sessionStorage: some só nesta tela */
    }
    setHidden(true);
  };

  const { claimable, elsewhere } = rescue;
  const fromGuest = claimable.every((c) => c.ownerId === GUEST_ID);
  const shown = expanded ? claimable : claimable.slice(0, 3);

  return (
    <section className="fv-panel fv-rescue" aria-labelledby="fv-rescue-title">
      {claimable.length > 0 && (
        <>
          <div className="fv-rescue-head">
            <div>
              <h2 id="fv-rescue-title">
                {claimable.length === 1 ? '1 herói' : `${claimable.length} heróis`} deste aparelho fora da sua lista
              </h2>
              <p>
                {fromGuest
                  ? 'Foram criados no modo convidado. Continuam salvos — traga para o seu perfil para vê-los aqui.'
                  : 'Pertenciam a um perfil que não existe mais neste aparelho. Continuam salvos — traga para o seu perfil.'}
              </p>
            </div>
            <div className="fv-rescue-actions">
              {claimable.length > 1 && (
                <button type="button" className="fv-btn-gold fv-rescue-btn" onClick={() => bring(claimable.map((c) => c.id))}>
                  Trazer todos
                </button>
              )}
              <button type="button" className="fv-btn-ghost fv-rescue-btn" onClick={dismiss}>
                Agora não
              </button>
            </div>
          </div>
          <ul className="fv-rescue-list">
            {shown.map((c) => (
              <li key={c.id}>
                <span className="fv-rescue-name">
                  <b>{c.name || 'Herói sem nome'}</b>
                  <small>
                    {shortSubtitle(c)} · {c.ownerId === GUEST_ID ? 'Convidado' : 'perfil removido'}
                  </small>
                </span>
                <button type="button" className="fv-btn-ghost fv-rescue-btn" onClick={() => bring([c.id])} aria-label={`Trazer ${c.name || 'herói'} para o meu perfil`}>
                  Trazer para mim
                </button>
              </li>
            ))}
          </ul>
          {claimable.length > shown.length && (
            <button type="button" className="fv-rescue-more" onClick={() => setExpanded(true)}>
              Ver os outros {claimable.length - shown.length}
            </button>
          )}
        </>
      )}
      {elsewhere.length > 0 && (
        <p className="fv-rescue-elsewhere" id={claimable.length ? undefined : 'fv-rescue-title'}>
          {elsewhere
            .map((e) => `${e.count === 1 ? '1 herói está' : `${e.count} heróis estão`} no perfil “${e.name}”`)
            .join('; ')}
          {' '}— entre nesse perfil para jogar com {elsewhere.length === 1 && elsewhere[0].count === 1 ? 'ele' : 'eles'}.
          {!claimable.length && (
            <button type="button" className="fv-rescue-more" onClick={dismiss}>
              Entendi
            </button>
          )}
        </p>
      )}
    </section>
  );
}
