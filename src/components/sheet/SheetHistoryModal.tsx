import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { confirmAction, toast } from '@/store/feedbackStore';
import { useCharacterStore } from '@/store/characterStore';
import { diff, summarize } from '@/lib/sheetDiff';
import { listHistory, onHistoryChange, recordVersion } from '@/services/sheetHistory';
import type { HistoryEntry, HistoryReason } from '@/services/sheetHistory';
import type { Character } from '@/types/character';

const REASON: Record<HistoryReason, string> = {
  auto: 'Início de sessão',
  levelup: 'Antes de subir de nível',
  conflict: 'Conflito de sincronização',
  restore: 'Antes de restaurar',
  manual: 'Guardada à mão',
};

/** Campos que pertencem à ficha "viva" (identidade e sincronização), não à versão restaurada. */
const KEEP = ['id', 'ownerId', 'createdAt', 'lastSyncedAt', 'syncBase', 'syncStatus'] as const;

const when = (at: number) => {
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  return today ? `hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Linha do tempo da ficha: versões guardadas neste aparelho, com o que muda
 * se voltar para cada uma. Restaurar guarda a atual antes (dá para desfazer).
 */
export function SheetHistoryModal({ char, onClose }: { char: Character; onClose: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  useEffect(() => {
    let alive = true;
    const load = () => void listHistory(char.id).then((l) => alive && setEntries(l));
    load();
    const off = onHistoryChange((id) => id === char.id && load());
    return () => {
      alive = false;
      off();
    };
  }, [char.id]);

  const saveNow = async () => {
    await recordVersion(char, 'manual', 'Guardada à mão');
    toast('Versão guardada no histórico.', { tone: 'ok' });
  };

  const restore = async (e: HistoryEntry) => {
    const ok = await confirmAction({
      title: `Voltar para a versão de ${when(e.at)}?`,
      message: 'A versão atual vai para o histórico antes — dá para voltar a ela depois.',
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    const live = useCharacterStore.getState().characters.find((c) => c.id === char.id);
    if (!live) return;
    await recordVersion(live, 'restore', 'Antes de restaurar uma versão');
    updateCharacter(char.id, (c) => {
      const keep = Object.fromEntries(KEEP.map((k) => [k, c[k]]));
      for (const k of Object.keys(c)) delete (c as unknown as Record<string, unknown>)[k];
      Object.assign(c, structuredClone(e.char), keep);
    });
    toast('Versão restaurada.', { tone: 'ok' });
    onClose();
  };

  return (
    <Modal title="Histórico da ficha" icon="book" onClose={onClose} maxWidth={600}>
      <div className="fv-hist">
        <p className="fv-hist-lead">
          Versões de <b>{char.name || 'esta ficha'}</b> guardadas neste aparelho: no começo de cada sessão de edição, antes de subir de nível e quando um conflito de sincronização descarta uma versão. Ficam as 30 mais recentes.
        </p>
        <div className="fv-hist-now">
          <div>
            <span className="fv-hist-tag">Agora</span>
            <p>{summarize(char)}</p>
          </div>
          <button type="button" className="fv-btn-ghost" onClick={() => void saveNow()}>Guardar versão agora</button>
        </div>
        {entries === null && <p className="fv-hist-empty" role="status">Carregando…</p>}
        {entries?.length === 0 && <p className="fv-hist-empty">Ainda não há versões guardadas. A primeira entra sozinha na próxima vez que você mexer na ficha.</p>}
        {entries && entries.length > 0 && (
          <ol className="fv-hist-list" aria-label="Versões guardadas">
            {entries.map((e) => {
              const changes = diff(char, e.char);
              return (
                <li key={e.id} className={'is-' + e.reason}>
                  <div className="fv-hist-head">
                    <time dateTime={new Date(e.at).toISOString()}>{when(e.at)}</time>
                    <span className="fv-hist-tag">{REASON[e.reason]}</span>
                  </div>
                  <p className="fv-hist-sum">{summarize(e.char)}</p>
                  {e.label && e.label !== REASON[e.reason] && <p className="fv-hist-label">{e.label}</p>}
                  {changes.length > 0 ? (
                    <ul className="fv-hist-diff" aria-label="O que muda se restaurar">
                      {changes.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  ) : (
                    <p className="fv-hist-same">Igual à ficha atual.</p>
                  )}
                  <button type="button" className="fv-btn-ghost fv-hist-restore" disabled={changes.length === 0} onClick={() => void restore(e)}>
                    Restaurar esta versão
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
}
