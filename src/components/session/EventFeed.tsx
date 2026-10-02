import { lazy, Suspense, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { eventText as text } from '@/lib/combatLog';
import type { Combatant, SessionEvent } from '@/types/session';

const ChronicleModal = lazy(() => import('./ChronicleModal').then((m) => ({ default: m.ChronicleModal })));

/**
 * Crônica curta da sessão (o banco já filtra o que é só do mestre). Para o
 * mestre, rolagem de dano de qualquer pessoa ganha "aplicar em…": um toque
 * e o PV do alvo cai. "Exportar" gera a crônica inteira em Markdown.
 */
export function EventFeed({ events, targets, onApply }: { events: SessionEvent[]; targets?: Combatant[]; onApply?: (c: Combatant, amount: number) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const session = useSessionStore((st) => st.session);
  const isMaster = useSessionStore((st) => !!st.me?.isMaster);
  const recent = events.slice(-16).reverse();
  if (!recent.length) return null;
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-live-card-head">
        <div className="fv-label">Acontecimentos</div>
        {session && (
          <button type="button" className="fv-btn-ghost fv-feed-export" onClick={() => setExporting(true)}>
            Exportar crônica
          </button>
        )}
      </div>
      {exporting && session && (
        <Suspense fallback={null}>
          <ChronicleModal session={session} isMaster={isMaster} onClose={() => setExporting(false)} />
        </Suspense>
      )}
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
