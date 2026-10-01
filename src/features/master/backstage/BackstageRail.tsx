import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useSessionStore } from '@/store/sessionStore';
import { useMasterStore } from '../masterStore';
import type { BackstagePanel } from '../masterStore';
import { SessionPanel } from './SessionPanel';
import { NpcsPanel } from './NpcsPanel';
import { CreaturesPanel } from './CreaturesPanel';
import { EncounterPanel } from './EncounterPanel';
import { ScenesPanel } from './ScenesPanel';
import { HandoutsPanel } from './HandoutsPanel';
import { MasterNotesPanel } from './MasterNotesPanel';

const PANELS: { id: BackstagePanel; label: string; icon: IconName }[] = [
  { id: 'sessao', label: 'Sessão', icon: 'spark' },
  { id: 'npcs', label: 'NPCs', icon: 'crest' },
  { id: 'criaturas', label: 'Criaturas', icon: 'swords' },
  { id: 'encontro', label: 'Encontro', icon: 'd20' },
  { id: 'cenas', label: 'Cenas', icon: 'image' },
  { id: 'pistas', label: 'Pistas', icon: 'quill' },
  { id: 'notas', label: 'Notas', icon: 'book' },
];

/**
 * BASTIDORES: tudo o que o mestre tem à mão sem sair da sessão. Uma coluna
 * de abas (ícone + nome) e o painel aberto ao lado; no celular vira gaveta.
 */
export function BackstageRail() {
  const panel = useMasterStore((m) => m.panel);
  const setPanel = useMasterStore((m) => m.setPanel);
  const combat = useSessionStore((s) => s.encounter?.status === 'active');
  const live = useSessionStore((s) => !!s.session);

  return (
    <div className="fv-backstage">
      <nav className="fv-backstage-tabs" role="tablist" aria-label="Bastidores">
        {PANELS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={panel === p.id} className={panel === p.id ? 'is-on' : ''} onClick={() => setPanel(p.id)}>
            <Icon name={p.icon} size={18} />
            <span>{p.label}</span>
            {p.id === 'sessao' && live && <i className="fv-backstage-dot" aria-label="sessão ao vivo" />}
            {p.id === 'encontro' && combat && <i className="fv-backstage-dot is-combat" aria-label="combate rolando" />}
          </button>
        ))}
      </nav>
      <div className="fv-backstage-panel" role="tabpanel" aria-label={PANELS.find((p) => p.id === panel)?.label}>
        {panel === 'sessao' && <SessionPanel />}
        {panel === 'npcs' && <NpcsPanel />}
        {panel === 'criaturas' && <CreaturesPanel />}
        {panel === 'encontro' && <EncounterPanel />}
        {panel === 'cenas' && <ScenesPanel />}
        {panel === 'pistas' && <HandoutsPanel />}
        {panel === 'notas' && <MasterNotesPanel />}
      </div>
    </div>
  );
}
