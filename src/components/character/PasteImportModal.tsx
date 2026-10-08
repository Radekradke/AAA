import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { importHeroText } from '@/lib/heroImport';

/**
 * Colar ficha: o texto que o ChatGPT devolveu (formato do guia
 * docs/CRIAR-COM-CHATGPT.md) ou o JSON exportado de outra ficha. O app monta
 * o herói com as regras da criação e mostra o que precisou ajustar.
 */
export function PasteImportModal({ ownerId, onClose, onOpen }: { ownerId: string; onClose: () => void; onOpen: (id: string) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; warnings: string[] } | null>(null);

  const run = () => {
    const res = importHeroText(text, ownerId);
    if (!res.ok || !res.id) return setError(res.error ?? 'Não consegui importar.');
    setError(null);
    if (!res.warnings?.length) return onOpen(res.id);
    setDone({ id: res.id, warnings: res.warnings });
  };

  return (
    <Modal
      title={done ? 'Herói importado' : 'Colar ficha'}
      icon="quill"
      onClose={onClose}
      maxWidth={640}
      footer={
        done ? (
          <button type="button" className="fv-btn-gold fv-paste-btn" onClick={() => onOpen(done.id)}>
            Abrir a ficha
          </button>
        ) : (
          <button type="button" className="fv-btn-gold fv-paste-btn" disabled={!text.trim()} onClick={run}>
            Importar herói
          </button>
        )
      }
    >
      {done ? (
        <div className="fv-paste-done">
          <p>O herói foi criado. Ajustei alguns pontos — confira na ficha:</p>
          <ul>
            {done.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="fv-paste">
          <p className="fv-paste-lead">
            Cole aqui o JSON que o ChatGPT gerou com o guia <b>CRIAR-COM-CHATGPT</b> (pode colar a resposta inteira — eu acho a ficha no meio do texto) ou o
            JSON exportado de outra ficha.
          </p>
          <textarea
            className="fv-input fv-paste-text"
            aria-label="Texto da ficha"
            placeholder={'{\n  "formato": "ficha-viva/simples-1",\n  "nome": "…",\n  …\n}'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoFocus
          />
          {error && (
            <p className="fv-paste-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
