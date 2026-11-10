import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ddbIdFromUrl, ddbToCharacter, type DdbImport } from '@/engine/ddbImport';
import { fetchDdbCharacter } from '@/lib/ddbFetch';
import { useCharacterStore } from '@/store/characterStore';

/**
 * Importar do D&D Beyond: cola o link do personagem público, o app busca,
 * monta o herói pelas regras e mostra o que precisou adaptar ANTES de criar.
 */
export function DdbImportModal({ ownerId, onClose, onOpen }: { ownerId: string; onClose: () => void; onOpen: (id: string) => void }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DdbImport | null>(null);
  const id = ddbIdFromUrl(link);

  const search = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    const res = await fetchDdbCharacter(id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    try {
      setPreview(ddbToCharacter(res.data, ownerId));
    } catch {
      setError('Não consegui ler esse personagem. O D&D Beyond pode ter mudado o formato.');
    }
  };

  const create = () => {
    if (!preview) return;
    const res = useCharacterStore.getState().importCharacter(JSON.stringify(preview.char), ownerId);
    if (!res.ok || !res.id) return setError(res.error ?? 'Não consegui criar o herói.');
    onOpen(res.id);
  };

  return (
    <Modal
      title={preview ? `Importar ${preview.summary.name || 'herói'}` : 'Importar do D&D Beyond'}
      icon="download"
      onClose={onClose}
      maxWidth={640}
      footer={
        preview ? (
          <div className="fv-ddb-foot">
            <button type="button" className="fv-btn-ghost" onClick={() => setPreview(null)}>Voltar</button>
            <button type="button" className="fv-btn-gold" onClick={create}>Criar herói</button>
          </div>
        ) : (
          <button type="button" className="fv-btn-gold" disabled={!id || busy} onClick={() => void search()}>
            {busy ? 'Buscando…' : 'Buscar personagem'}
          </button>
        )
      }
    >
      {preview ? (
        <div className="fv-ddb">
          <dl className="fv-ddb-sum">
            <div><dt>Nome</dt><dd>{preview.summary.name}</dd></div>
            <div><dt>Raça</dt><dd>{preview.summary.race}</dd></div>
            <div><dt>Classe</dt><dd>{preview.summary.classes}</dd></div>
          </dl>
          {preview.warnings.length > 0 ? (
            <>
              <p>Antes de criar, confira o que precisou ser adaptado:</p>
              <ul className="fv-ddb-warn" aria-label="Avisos da importação">
                {preview.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </>
          ) : (
            <p>Tudo encontrado no app. É só criar.</p>
          )}
        </div>
      ) : (
        <div className="fv-ddb">
          <p className="fv-paste-lead">
            Cole o link do personagem. Ele precisa estar <b>público</b> no D&D Beyond (Character Settings → Privacy → Public).
          </p>
          <input className="fv-input" aria-label="Link do D&D Beyond" placeholder="https://www.dndbeyond.com/characters/12345678" value={link} onChange={(e) => setLink(e.target.value)} autoFocus />
          {link.trim() && !id && <small className="fv-discord-bad">Esse não parece um link de personagem do D&D Beyond.</small>}
          <p className="fv-live-hint">Integração não oficial: usa o mesmo endereço público que o site do D&D Beyond usa e pode parar se eles mudarem. O que o app não tiver vira homebrew ou aviso.</p>
          {error && <p className="fv-paste-error" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
