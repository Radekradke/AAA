import type { SessionEvent } from '@/types/session';

function text(e: SessionEvent): string {
  const p = e.payload as Record<string, string | number | undefined>;
  switch (e.type) {
    case 'session_started': return `Sessão aberta — ${p.name ?? ''}`;
    case 'session_paused': return 'Sessão pausada';
    case 'session_active': return 'Sessão retomada';
    case 'session_finished': return 'Sessão encerrada';
    case 'encounter_created': return `Encontro preparado — ${p.name ?? ''}`;
    case 'initiative_rolled': return `${p.name ?? 'Alguém'} rolou iniciativa: ${p.value}`;
    case 'initiative_batch': return `Mestre rolou ${p.count} iniciativa${Number(p.count) === 1 ? '' : 's'}`;
    case 'combat_started': return `Combate! ${p.name ?? ''}`;
    case 'round_started': return `Rodada ${p.round}`;
    case 'turn_changed': return `Vez de ${p.name ?? '—'}`;
    case 'encounter_paused': return 'Combate pausado';
    case 'encounter_active': return 'Combate retomado';
    case 'encounter_finished': return `Fim do encontro — ${p.round ?? 0} rodada${Number(p.round) === 1 ? '' : 's'}`;
    default: return e.type.replace(/_/g, ' ');
  }
}

/** Crônica curta da sessão (o banco já filtra o que é só do mestre). */
export function EventFeed({ events }: { events: SessionEvent[] }) {
  const recent = events.slice(-12).reverse();
  if (!recent.length) return null;
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-label">Acontecimentos</div>
      <ul className="fv-live-feed">
        {recent.map((e) => (
          <li key={e.id} className={`is-${e.type.split('_')[0]}` + (e.visibility !== 'public' ? ' is-secret' : '')}>
            <time>{new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
            <span>{text(e)}</span>
            {e.visibility === 'master' && <i title="Só o mestre vê">mestre</i>}
          </li>
        ))}
      </ul>
    </section>
  );
}
