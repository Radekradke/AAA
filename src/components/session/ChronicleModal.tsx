import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/feedbackStore';
import { buildChronicle } from '@/lib/combatLog';
import { sessionService } from '@/services/sessionService';
import type { GameSession, SessionEvent } from '@/types/session';

/**
 * Exporta a crônica da sessão em Markdown (encontros → rodadas, com o
 * placar de cada combate): copiar para colar no grupo ou baixar o arquivo.
 * Busca a sessão inteira (o feed ao vivo só guarda os últimos eventos).
 */
export function ChronicleModal({ session, isMaster, onClose }: { session: GameSession; isMaster: boolean; onClose: () => void }) {
  const [events, setEvents] = useState<SessionEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolls, setRolls] = useState(false);
  const [secret, setSecret] = useState(false);

  useEffect(() => {
    sessionService.events(session.id, 2000).then(setEvents).catch((e: Error) => setError(e.message));
  }, [session.id]);

  const text = useMemo(
    () => (events ? buildChronicle(events, { title: session.name || 'Sessão', includeRolls: rolls, includeSecret: isMaster && secret }) : ''),
    [events, session.name, rolls, secret, isMaster],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Crônica copiada.', { tone: 'ok' });
    } catch {
      toast('Não deu para copiar — use "Baixar".', { tone: 'info' });
    }
  };

  const download = () => {
    const slug = (session.name || 'sessao').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cronica-${slug || 'sessao'}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal
      title="Exportar crônica da sessão"
      icon="quill"
      onClose={onClose}
      maxWidth={680}
      footer={
        <div className="fv-chron-actions">
          <button type="button" className="fv-btn-ghost" disabled={!events} onClick={() => void copy()}>Copiar</button>
          <button type="button" className="fv-btn-gold" disabled={!events} onClick={download}>Baixar .md</button>
        </div>
      }
    >
      <div className="fv-chron">
        <p className="fv-chron-lead">
          Tudo o que aconteceu, por encontro e rodada, com quem atacou quem, a rolagem contra a CA, o dano e o PV — e o placar de cada combate. Cole no grupo da mesa ou guarde o arquivo.
        </p>
        <div className="fv-chron-opts" role="group" aria-label="O que incluir">
          <label><input type="checkbox" checked={rolls} onChange={(e) => setRolls(e.target.checked)} /> Rolagens soltas (perícias, testes)</label>
          {isMaster && <label><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> O que só o mestre vê</label>}
        </div>
        {error && <p className="fv-chron-err" role="alert">{error}</p>}
        {!events && !error && <p className="fv-chron-lead" role="status">Carregando a sessão…</p>}
        {events && <pre className="fv-chron-pre" tabIndex={0} aria-label="Prévia da crônica">{text}</pre>}
      </div>
    </Modal>
  );
}
