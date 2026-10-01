import { useState } from 'react';
import type { Combatant, SessionEvent } from '@/types/session';

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
    case 'roll': return `${p.who ?? '—'} · ${String(p.label ?? 'rolagem').replace(/^Rolagem /, '')}: ${p.total}${p.crit ? ' (crítico!)' : p.fail ? ' (falha)' : ''}`;
    case 'hero_hp': return p.kind === 'heal' ? `${p.name} recuperou ${p.amount} PV` : `${p.name} sofreu ${p.amount} de dano`;
    case 'hero_condition': return `${p.name} ${p.on ? 'ficou' : 'não está mais'} ${String(p.condition ?? '').toLowerCase()}`;
    case 'attack':
      return `${p.by} atacou ${p.target}: ${p.hit ? (p.crit ? 'CRÍTICO!' : 'acertou') : 'errou'}${p.hit ? ` — ${p.damage} de dano${p.type ? ` ${p.type}` : ''}` : ''}${p.note ? ` (${p.note})` : ''}`;
    case 'hero_item': return `${p.name} recebeu ${Number(p.quantity) > 1 ? `${p.quantity}× ` : ''}${p.item ?? 'um item'}`;
    case 'xp_award': return `+${p.amount} XP para ${((p.names as unknown as string[]) ?? []).join(', ')}${p.note ? ` — ${p.note}` : ''}`;
    default: return e.type.replace(/_/g, ' ');
  }
}

/**
 * Crônica curta da sessão (o banco já filtra o que é só do mestre). Para o
 * mestre, rolagem de dano de qualquer pessoa ganha "aplicar em…": um toque
 * e o PV do alvo cai.
 */
export function EventFeed({ events, targets, onApply }: { events: SessionEvent[]; targets?: Combatant[]; onApply?: (c: Combatant, amount: number) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const recent = events.slice(-16).reverse();
  if (!recent.length) return null;
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-label">Acontecimentos</div>
      <ul className="fv-live-feed">
        {recent.map((e) => {
          const p = e.payload as { crit?: boolean; damage?: boolean; total?: number };
          const canApply = !!onApply && !!targets?.length && e.type === 'roll' && p.damage && typeof p.total === 'number';
          return (
            <li key={e.id} className={`is-${e.type.split('_')[0]}` + (e.visibility !== 'public' ? ' is-secret' : '') + (p.crit ? ' is-crit' : '')}>
              <time>{new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
              <span>{text(e)}</span>
              {e.visibility === 'master' && <i title="Só o mestre vê">mestre</i>}
              {e.visibility === 'private' && <i title="Só você vê">privado</i>}
              {canApply && !done[e.id] && (
                <button type="button" className="fv-feed-apply" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                  aplicar ▸
                </button>
              )}
              {done[e.id] && <em className="fv-feed-done">−{p.total} em {done[e.id]}</em>}
              {canApply && open === e.id && (
                <div className="fv-feed-targets" role="group" aria-label="Aplicar dano em">
                  {targets!.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onApply!(c, p.total!);
                        setDone((d) => ({ ...d, [e.id]: c.name }));
                        setOpen(null);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
