import { useState } from 'react';
import { Modal } from './Modal';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { resolveConflict } from '@/services/offlineSyncService';
import { diff, summarize } from '@/lib/sheetDiff';
import type { SyncConflict } from '@/types/models';

const stamp = (at: number) => new Date(at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Conflito: as duas versões lado a lado, com o que cada escolha muda. */
export function ConflictModal({ onClose }: { onClose: () => void }) {
  const conflicts = useSaveStatusStore((s) => s.conflicts);
  return (
    <Modal title="Conflito de sincronização" icon="crest" onClose={onClose} maxWidth={620}>
      <p className="fv-conflict-lead">
        Estas fichas mudaram neste aparelho <b>e</b> na nuvem (outro aparelho) desde a última sincronização. Escolha qual manter — a outra não se perde: vai para o <b>Histórico</b> da ficha.
      </p>
      <div className="fv-conflict-list">
        {conflicts.map((c) => <ConflictCard key={c.sheetId} c={c} />)}
        {conflicts.length === 0 && <p className="fv-conflict-lead">Tudo resolvido — nenhuma pendência.</p>}
      </div>
    </Modal>
  );
}

function ConflictCard({ c }: { c: SyncConflict }) {
  const user = useAuthStore((s) => s.user);
  const local = useCharacterStore((s) => s.characters.find((x) => x.id === c.sheetId));
  const [busy, setBusy] = useState(false);
  const choose = async (keep: 'local' | 'cloud') => {
    if (!user) return;
    setBusy(true);
    await resolveConflict(user.id, c.sheetId, keep);
    setBusy(false);
  };
  // "o que muda" = o que a ficha passa a ser ao escolher o outro lado
  const toCloud = local && c.remote ? diff(local, c.remote) : [];
  return (
    <section className="fv-conflict" aria-label={`Conflito: ${c.name}`}>
      <h3>{c.name || 'Ficha sem nome'}</h3>
      <div className="fv-conflict-sides">
        <div className="fv-conflict-side">
          <span className="fv-conflict-k">Neste aparelho</span>
          <time>{stamp(c.localUpdatedAt)}</time>
          {local && <p>{summarize(local)}</p>}
          <button type="button" className="fv-btn-gold" disabled={busy} onClick={() => void choose('local')}>Manter esta</button>
        </div>
        <div className="fv-conflict-side">
          <span className="fv-conflict-k">Na nuvem</span>
          <time>{stamp(c.remoteUpdatedAt)}</time>
          {c.remote && <p>{summarize(c.remote)}</p>}
          <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void choose('cloud')}>Usar a da nuvem</button>
        </div>
      </div>
      {toCloud.length > 0 && (
        <div className="fv-conflict-diff">
          <span className="fv-conflict-k">Diferença (deste aparelho → nuvem)</span>
          <ul>{toCloud.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
