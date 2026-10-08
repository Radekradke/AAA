import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { confirmAction, toast } from '@/store/feedbackStore';
import { useAuthStore } from '@/store/authStore';
import { cloudEnabled } from '@/services/supabaseClient';
import { syncNow } from '@/services/offlineSyncService';
import { shareService, shareUrl } from '@/services/shareService';
import type { SheetShare } from '@/services/shareService';
import type { Character } from '@/types/character';
import { characterFileName, downloadCharacterJson } from '@/lib/exportCharacter';

/**
 * Compartilhar a ficha (botão de corrente no cabeçalho): primeiro a escolha —
 * por link ou em PDF. Link: quem recebe vê a ficha ilustrada (só leitura, sem
 * conta, a última versão na nuvem); dá para ter mais de um e revogar cada um.
 * PDF: abre a ficha pronta para imprimir / salvar em PDF. JSON: baixa a ficha
 * inteira num arquivo (backup ou para importar em outra conta).
 */
export function ShareSheetModal({ char, onClose }: { char: Character; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const canCloud = cloudEnabled() && !!user && !user.guest;
  const [links, setLinks] = useState<SheetShare[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<'choose' | 'link'>('choose');
  const navigate = useNavigate();

  useEffect(() => {
    if (!canCloud || mode !== 'link') return;
    shareService.list(char.id).then(setLinks).catch((e: Error) => setError(e.message));
  }, [canCloud, char.id, mode]);

  const create = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await syncNow(user.id); // o link mostra a versão da nuvem: sobe a atual antes
      const s = await shareService.create(char.id);
      setLinks((l) => [s, ...(l ?? [])]);
      await copy(s.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      window.prompt('Copie o link:', shareUrl(token));
    }
  };

  const revoke = async (token: string) => {
    const ok = await confirmAction({ title: 'Revogar este link?', message: 'Quem tiver o link deixa de ver a ficha na hora.', confirmLabel: 'Revogar', danger: true });
    if (!ok) return;
    try {
      await shareService.revoke(token);
      setLinks((l) => (l ?? []).filter((x) => x.token !== token));
      toast('Link revogado.', { tone: 'ok' });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (mode === 'choose') {
    return (
      <Modal title="Compartilhar a ficha" icon="quill" onClose={onClose} maxWidth={520}>
        <p className="fv-share-lead">Como você quer mandar <b>{char.name || 'esta ficha'}</b>?</p>
        <div className="fv-share-choices">
          <button type="button" className="fv-share-choice" onClick={() => setMode('link')}>
            <span className="fv-share-choice-ico" aria-hidden><Icon name="link" size={22} /></span>
            <span>
              <b>Por link</b>
              <small>Quem abrir vê a ficha ilustrada, só leitura, sem precisar de conta. Dá para revogar.</small>
            </span>
          </button>
          <button
            type="button"
            className="fv-share-choice"
            onClick={() => {
              onClose();
              navigate(`/ficha/${char.id}/imprimir`);
            }}
          >
            <span className="fv-share-choice-ico" aria-hidden><Icon name="book" size={22} /></span>
            <span>
              <b>Em PDF</b>
              <small>A ficha pronta para imprimir no visual do tema, com a arte em destaque — salve em PDF ou imprima para a mesa.</small>
            </span>
          </button>
          <button
            type="button"
            className="fv-share-choice"
            onClick={() => {
              downloadCharacterJson(char);
              toast(`Ficha salva em ${characterFileName(char)}.`, { tone: 'ok' });
              onClose();
            }}
          >
            <span className="fv-share-choice-ico" aria-hidden><Icon name="download" size={22} /></span>
            <span>
              <b>Em arquivo (JSON)</b>
              <small>Baixa a ficha inteira num arquivo — serve de backup e abre em outra conta com “Importar personagem (JSON)”.</small>
            </span>
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Compartilhar por link" icon="quill" onClose={onClose} maxWidth={560}>
      <div className="fv-share">
        <button type="button" className="fv-textlink fv-share-back" onClick={() => setMode('choose')}>‹ Voltar</button>
        <p className="fv-share-lead">
          Gera um link para ver <b>{char.name || 'esta ficha'}</b> como ficha ilustrada — só leitura, sem precisar de conta. Mostra a última versão sincronizada com a nuvem.
        </p>
        {!canCloud ? (
          <p className="fv-share-note">Compartilhar por link precisa de uma conta na nuvem. Para mandar a ficha sem conta, volte e escolha <b>Em PDF</b>.</p>
        ) : (
          <>
            <button type="button" className="fv-btn-gold fv-share-new" disabled={busy} onClick={() => void create()}>
              {busy ? 'Criando…' : 'Criar link e copiar'}
            </button>
            {error && <p className="fv-share-err" role="alert">{error}</p>}
            {links && links.length > 0 && (
              <ul className="fv-share-list" aria-label="Links ativos">
                {links.map((l) => (
                  <li key={l.token}>
                    <span className="fv-share-url">{shareUrl(l.token)}</span>
                    <small>criado em {new Date(l.createdAt).toLocaleDateString('pt-BR')}</small>
                    <div className="fv-share-acts">
                      <button type="button" className="fv-btn-ghost" onClick={() => void copy(l.token)}>{copied === l.token ? '✓ Copiado' : 'Copiar'}</button>
                      <a className="fv-btn-ghost" href={shareUrl(l.token)} target="_blank" rel="noreferrer">Abrir</a>
                      <button type="button" className="fv-btn-ghost is-danger" onClick={() => void revoke(l.token)}>Revogar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {links && links.length === 0 && !error && <p className="fv-share-note">Nenhum link ativo.</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
