import { lazy, Suspense, useState } from 'react';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { hexA } from '@/lib/color';
import { useTheme } from '@/lib/useTheme';

// o modal (com o cálculo de diferença entre versões) só carrega quando há conflito
const ConflictModal = lazy(() => import('./SyncConflictModal').then((m) => ({ default: m.ConflictModal })));

/**
 * Indicador discreto de salvamento/sincronização no topo:
 * Salvando… · Salvo neste aparelho · Nuvem em dia · Offline (pendências)
 * · Conflito (clique para resolver vendo a diferença; a versão descartada
 *   vai para o histórico da ficha).
 */
export function SyncBadge() {
  const t = useTheme();
  const { local, cloud, pendingCount, conflicts, lastError } = useSaveStatusStore();
  const [open, setOpen] = useState(false);

  const view = (() => {
    // conflito vem antes do "Salvando…" (passageiro): o selo não pode deixar de ser clicável
    if (cloud === 'conflict' || conflicts.length) return { dot: t.danger, text: `Conflito (${conflicts.length})`, click: true };
    if (local === 'saving') return { dot: t.acc, text: 'Salvando…', pulse: true };
    if (cloud === 'error') return { dot: t.danger, text: 'Erro ao sincronizar', title: lastError ?? undefined };
    if (cloud === 'offline') return { dot: '#E0A93E', text: pendingCount > 0 ? `Offline · ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Offline' };
    if (cloud === 'syncing') return { dot: t.acc, text: 'Sincronizando…', pulse: true };
    if (cloud === 'synced') return { dot: '#3FC56B', text: 'Nuvem em dia', short: 'Na nuvem', calm: true };
    if (cloud === 'pending') return { dot: t.acc, text: 'Aguardando nuvem' };
    // nuvem desativada (sem Supabase ou convidado): só o estado local
    return { dot: local === 'saved' ? '#3FC56B' : t.muted, text: 'Salvo neste aparelho', short: 'Salvo', calm: true };
  })();

  return (
    <>
      <button
        onClick={view.click ? () => setOpen(true) : undefined}
        title={view.title ?? view.text}
        aria-label={`Estado de salvamento: ${view.text}`}
        style={{
          cursor: view.click ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          minHeight: 38,
          minWidth: 38,
          justifyContent: 'center',
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid ' + (view.click ? hexA(t.danger, 0.55) : 'var(--line)'),
          background: 'var(--panel)',
          backdropFilter: 'blur(8px)',
          color: 'var(--muted)',
          fontSize: 11.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: view.dot,
            boxShadow: `0 0 8px ${hexA(view.dot, 0.7)}`,
            animation: view.pulse ? 'glowPulse 1.1s ease-in-out infinite' : 'none',
          }}
        />
        {/* atenção → texto visível no desktop; tudo certo → rótulo curto só em telas largas (no resto, o ponto e o title) */}
        {'calm' in view && view.calm ? <span className="fv-sync-calm">{view.short}</span> : <span className="fv-hide-mobile">{view.text}</span>}
      </button>

      {open && (
        <Suspense fallback={null}>
          <ConflictModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
