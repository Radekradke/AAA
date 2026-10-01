import { Modal } from '@/components/ui/Modal';
import { CONTENT_PACKS } from '@/data/contentPacks';
import { useUiStore } from '@/store/uiStore';

/** Liga/desliga os livros além do Livro do Jogador (vale neste aparelho). */
export function ContentPacksModal({ onClose }: { onClose: () => void }) {
  const packs = useUiStore((s) => s.packs);
  const toggle = useUiStore((s) => s.togglePack);
  return (
    <Modal title="Pacotes de conteúdo" icon="quill" onClose={onClose} maxWidth={520}>
      <p className="fv-packs-intro">
        O <b>Livro do Jogador 2014</b> está sempre ligado. Ligue os outros livros que a sua mesa usa — o que estiver
        desligado não aparece nas escolhas. Fichas que já usam algo de um pacote continuam funcionando.
      </p>
      <ul className="fv-packs">
        {CONTENT_PACKS.map((p) => {
          const on = !!packs?.[p.id];
          return (
            <li key={p.id} className={'fv-pack' + (on ? ' is-on' : '')}>
              <div className="fv-pack-text">
                <b>{p.label}</b>
                <small>{p.year} · {p.contents.join(' · ')}</small>
              </div>
              <button type="button" role="switch" aria-checked={on} aria-label={`${on ? 'Desligar' : 'Ligar'} ${p.short}`} className="fv-switch" onClick={() => toggle(p.id)}>
                <span aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="fv-packs-note">Textos resumidos pelo Ficha Viva — tenha o livro em mãos para os detalhes.</p>
    </Modal>
  );
}
