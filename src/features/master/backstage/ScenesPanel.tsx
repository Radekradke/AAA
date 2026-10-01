import { useState } from 'react';
import { liveScene, useStageStore } from '@/store/stageStore';
import { SceneLibrary } from '@/components/stage/SceneLibrary';
import { useMasterStore } from '../masterStore';
import { useMaster } from '../context';
import { TrayStar } from './SessionPanel';
import { BackstageOverlay } from './BackstageOverlay';

const KIND: Record<string, string> = { map: 'Mapa', image: 'Ambiente', cutscene: 'Cutscene' };

/**
 * CENAS: lista curta para o meio da sessão (ver sem mostrar, pôr no ar,
 * separar na bandeja). Criar, enviar imagem e editar ficam na biblioteca
 * completa, aberta por cima sem sair da sessão.
 */
export function ScenesPanel() {
  const { campaign } = useMaster();
  const scenes = useStageStore((st) => st.scenes);
  const live = useStageStore((st) => liveScene(st));
  const view = useStageStore((st) => st.viewSceneId);
  const viewScene = useStageStore((st) => st.viewScene);
  const goLive = useStageStore((st) => st.goLive);
  const select = useMasterStore((m) => m.select);
  const [library, setLibrary] = useState(false);

  return (
    <div className="fv-bs-stack">
      <button type="button" className="fv-btn-gold fv-bs-btn" onClick={() => setLibrary(true)}>
        Biblioteca de cenas (criar, imagens, cutscenes)
      </button>
      {!scenes.length && <p className="fv-bs-hint">Nenhuma cena ainda. Crie mapas, ambientes e cutscenes na biblioteca.</p>}
      <ul className="fv-bs-list">
        {scenes.map((sc) => {
          const isLive = live?.id === sc.id;
          return (
            <li key={sc.id} className={view === sc.id ? 'is-on' : ''}>
              <button
                type="button"
                className="fv-bs-item"
                onClick={() => {
                  viewScene(sc.id);
                  select({ kind: 'scene', id: sc.id });
                }}
                title="Ver no seu palco (sem mostrar aos jogadores)"
              >
                <b>
                  {sc.name}
                  {isLive && <em className="fv-bs-tag is-live">no ar</em>}
                </b>
                <small>{KIND[sc.kind] ?? sc.kind}</small>
              </button>
              <div className="fv-bs-item-acts">
                <TrayStar kind="scenes" id={sc.id} label={sc.name} />
                <button type="button" className={'fv-bs-mini ' + (isLive ? 'fv-btn-ghost' : 'fv-btn-gold')} onClick={() => void goLive(isLive ? null : sc.id)}>
                  {isLive ? 'Tirar' : 'No ar'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {library && (
        <BackstageOverlay title="Biblioteca de cenas" onClose={() => setLibrary(false)}>
          <SceneLibrary campaignId={campaign.id} onShow={() => setLibrary(false)} />
        </BackstageOverlay>
      )}
    </div>
  );
}
