import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';
import { linkState, mergeOnline } from '@/lib/tableLink';

/** Conexão e presença da mesa inteira: canal da sessão + canal do mapa. */
export function useTableLink() {
  const session = useSessionStore(useShallow((s) => ({ connection: s.connection, online: s.online })));
  const stage = useStageStore(useShallow((s) => ({ connection: s.connection, online: s.online, pending: s.pending })));
  const online = useMemo(() => mergeOnline(session.online, stage.online), [session.online, stage.online]);
  // pending: jogadas feitas sem rede que saem quando a conexão voltar
  return { connection: linkState(session.connection, stage.connection), online, pending: stage.pending };
}
