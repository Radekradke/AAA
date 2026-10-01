import { useSessionStore } from '@/store/sessionStore';
import type { ConnectionState } from '@/types/session';

export const CONN: Record<ConnectionState, string> = {
  idle: 'Fora da sessão',
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sem conexão',
};

/** Quem vê as minhas rolagens na mesa (todos, só o mestre ou ninguém). */
export function RollVisibilityToggle({ isMaster }: { isMaster: boolean }) {
  const vis = useSessionStore((s) => s.rollVisibility);
  const setVis = useSessionStore((s) => s.setRollVisibility);
  return (
    <span className="fv-live-vis" title="Quem vê as suas rolagens (ficha, mesa, monstros)">
      Rolagens:
      <span className="fv-live-seg" role="group" aria-label="Visibilidade das rolagens">
        {([['public', 'Todos'], ['master', isMaster ? 'Só eu' : 'Só o mestre'], ['private', 'Não enviar']] as const).map(([v, label]) => (
          <button key={v} type="button" className={vis === v ? 'is-on' : ''} onClick={() => setVis(v)}>
            {label}
          </button>
        ))}
      </span>
    </span>
  );
}

/** Quem está conectado agora (presença). */
export function OnlineList({ compact }: { compact?: boolean }) {
  const online = useSessionStore((s) => s.online);
  return (
    <ul className={'fv-live-online' + (compact ? ' is-compact' : '')} aria-label="Quem está na mesa">
      {online.map((p) => (
        <li key={p.userId} className={p.role === 'master' ? 'is-master' : ''} title={`${p.name}${p.characterName ? ` · ${p.characterName}` : ''}`}>
          <span className="fv-live-avatar">{(p.characterName ?? p.name).slice(0, 1).toUpperCase()}</span>
          {!compact && <small>{p.role === 'master' ? 'Mestre' : p.characterName ?? p.name}</small>}
        </li>
      ))}
    </ul>
  );
}

/** Cabeçalho da mesa do JOGADOR: mesa, sessão, conexão, rolagens e quem está online. */
export function LiveHeader({ campaignName }: { campaignName: string | null }) {
  const s = useSessionStore();
  return (
    <header className="fv-live-head">
      <div className="fv-live-title">
        <div className="fv-label">Mesa ao vivo</div>
        <h1>{campaignName ?? 'Carregando…'}</h1>
        <div className="fv-live-sub">
          <span className={`fv-live-conn is-${s.connection}`}>
            <i className={`fv-live-dot is-${s.connection}`} aria-hidden />
            {CONN[s.connection]}
          </span>
          {s.session && (
            <span>
              {s.session.name}
              {s.session.status === 'paused' ? ' · pausada' : ''}
            </span>
          )}
          {s.session && <RollVisibilityToggle isMaster={false} />}
        </div>
      </div>
      {s.session && <OnlineList />}
    </header>
  );
}
