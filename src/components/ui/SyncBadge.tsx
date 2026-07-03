import { useState } from 'react';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { useAuthStore } from '@/store/authStore';
import { resolveConflict } from '@/services/offlineSyncService';
import { cloudEnabled } from '@/services/supabaseClient';
import { Modal } from './Modal';
import { hexA } from '@/lib/color';
import { useTheme } from '@/lib/useTheme';

/**
 * Indicador discreto de salvamento/sincronização no topo:
 * Salvando… · Salvo neste aparelho · Nuvem em dia · Offline (pendências)
 * · Conflito (clique para resolver: manter local ou usar a nuvem).
 */
export function SyncBadge() {
  const t = useTheme();
  const { local, cloud, pendingCount, conflicts, lastError } = useSaveStatusStore();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const view = (() => {
    if (local === 'saving') return { dot: t.acc, text: 'Salvando…', pulse: true };
    if (cloud === 'conflict') return { dot: t.danger, text: `Conflito (${conflicts.length})`, click: true };
    if (cloud === 'error') return { dot: t.danger, text: 'Erro ao sincronizar', title: lastError ?? undefined };
    if (cloud === 'offline') return { dot: '#E0A93E', text: pendingCount > 0 ? `Offline · ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Offline' };
    if (cloud === 'syncing') return { dot: t.acc, text: 'Sincronizando…', pulse: true };
    if (cloud === 'synced') return { dot: '#3FC56B', text: 'Nuvem em dia' };
    if (cloud === 'pending') return { dot: t.acc, text: 'Aguardando nuvem' };
    // nuvem desativada (sem Supabase ou convidado): só o estado local
    return { dot: local === 'saved' ? '#3FC56B' : t.muted, text: cloudEnabled() ? 'Salvo neste aparelho' : 'Salvo neste aparelho' };
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
          minHeight: 36,
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
        {view.text}
      </button>

      {open && (
        <Modal title="Conflito de sincronização" icon="crest" onClose={() => setOpen(false)} maxWidth={480}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
            Estas fichas mudaram aqui e na nuvem desde a última sincronização. Escolha qual versão manter.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {conflicts.map((c) => (
              <div key={c.sheetId} style={{ padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.danger, 0.4), background: 'rgba(0,0,0,.24)' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{c.name}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                  local {new Date(c.localUpdatedAt).toLocaleString('pt-BR')} · nuvem {new Date(c.remoteUpdatedAt).toLocaleString('pt-BR')}
                </div>
                <div style={{ marginTop: 9, display: 'flex', gap: 8 }}>
                  <button
                    className="fv-btn-gold"
                    style={{ flex: 1, minHeight: 38, fontSize: 12.5 }}
                    onClick={() => user && void resolveConflict(user.id, c.sheetId, 'local')}
                  >
                    Manter esta versão
                  </button>
                  <button
                    className="fv-btn-ghost"
                    style={{ flex: 1, minHeight: 38, fontSize: 12.5 }}
                    onClick={() => user && void resolveConflict(user.id, c.sheetId, 'cloud')}
                  >
                    Usar a da nuvem
                  </button>
                </div>
              </div>
            ))}
            {conflicts.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Tudo resolvido — nenhuma pendência.</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
