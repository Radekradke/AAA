import { Modal } from './Modal';
import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { retryLocalSave } from '@/lib/storage/zustandIdb';
import { downloadCharacterJson } from '@/lib/exportCharacter';

export function LocalSaveErrorModal({ onClose }: { onClose: () => void }) {
  const characters = useCharacterStore((s) => s.characters);
  const error = useSaveStatusStore((s) => s.localError);
  const retry = async () => {
    await retryLocalSave();
    if (useSaveStatusStore.getState().local === 'saved') onClose();
  };
  return (
    <Modal title="Não foi possível salvar neste aparelho" icon="satchel" onClose={onClose} maxWidth={560} footer={<button type="button" className="fv-btn-gold" onClick={() => void retry()}>Tentar novamente</button>}>
      <p role="alert">As alterações continuam em memória. Baixe um backup antes de fechar ou recarregar esta página.</p>
      {error && <p className="fv-step-note">{error}</p>}
      <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'grid', gap: 10 }}>
        {characters.map((char) => <button key={char.id} type="button" className="fv-btn-ghost" onClick={() => downloadCharacterJson(char)}>Baixar JSON de {char.name || 'ficha sem nome'}</button>)}
      </div>
      <p className="fv-step-note">O JSON preserva a ficha e o diário. Você pode restaurá-lo em Heróis → Importar personagem.</p>
    </Modal>
  );
}
