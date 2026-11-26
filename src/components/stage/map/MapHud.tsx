import { useState } from 'react';
import type { MapTool, SceneSecret, Token } from '@/types/stage';
import { LIGHT_PRESETS } from '@/engine/vision';
import { rulesSummary } from '@/engine/secrets';
import { SecretGlyph } from '../secretArt';
import type { ToolGroup } from './tools';
import { lightLabel } from './tools';
import { IcoExpand, IcoFlame, IcoGrid, IcoMinus, IcoPlus, IcoPull, IcoShrink, IcoTrash } from './icons';

/* =====================================================================
   DOCA — um botão por grupo; dica com atalho; luz do herói (jogador)
   ===================================================================== */
export function MapDock(p: {
  groups: ToolGroup[];
  active: ToolGroup;
  /** Ícone a mostrar no botão do grupo (a última variação usada). */
  iconFor: (g: ToolGroup) => React.ReactNode;
  onPick: (g: ToolGroup) => void;
  /** Jogador no escuro: luz que o herói carrega. */
  light?: { meters: number; onSet: (m: number) => void } | null;
  marks: number;
  isMaster: boolean;
  onClearMarks: () => void;
}) {
  const [lightMenu, setLightMenu] = useState(false);
  return (
    <div className="fv-map-dock" role="toolbar" aria-label="Ferramentas do mapa" aria-orientation="vertical">
      {p.groups.map((gr, i) => (
        <span key={gr.id} className="fv-map-dock-slot">
          {gr.master && !p.groups[i - 1]?.master && <i className="fv-map-dock-sep" aria-hidden />}
          <button type="button" className={p.active.id === gr.id ? 'is-on' : ''} onClick={() => p.onPick(gr)} aria-pressed={p.active.id === gr.id} aria-label={`${gr.label} (${gr.key})`}>
            {p.iconFor(gr)}
            {gr.tools.length > 1 && <i className="fv-map-dock-more" aria-hidden />}
            <span className="fv-map-tip" aria-hidden>
              {gr.label} <kbd>{gr.key}</kbd>
            </span>
          </button>
        </span>
      ))}
      {p.light && (
        <span className="fv-map-dock-slot">
          <i className="fv-map-dock-sep" aria-hidden />
          <button
            type="button"
            className={'fv-map-lightbtn' + (p.light.meters > 0 ? ' is-lit' : '') + (lightMenu ? ' is-on' : '')}
            onClick={() => setLightMenu((v) => !v)}
            aria-expanded={lightMenu}
            aria-label={`Luz do herói: ${lightLabel(p.light.meters)}`}
          >
            <IcoFlame />
            <span className="fv-map-tip" aria-hidden>Luz <kbd>{lightLabel(p.light.meters)}</kbd></span>
          </button>
          {lightMenu && (
            <span className="fv-map-lightmenu" role="group" aria-label="Luz do herói">
              {[{ id: 'none', label: 'Sem luz', m: 0 }, ...LIGHT_PRESETS].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={p.light!.meters === l.m ? 'is-on' : ''}
                  aria-pressed={p.light!.meters === l.m}
                  onClick={() => {
                    p.light!.onSet(l.m);
                    setLightMenu(false);
                  }}
                >
                  <b>{l.label}</b>
                  {l.m > 0 && <small>{l.m} m</small>}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
      {p.marks > 0 && (
        <span className="fv-map-dock-slot">
          <i className="fv-map-dock-sep" aria-hidden />
          <button type="button" className="is-clear" onClick={p.onClearMarks} aria-label={p.isMaster ? 'Apagar todos os moldes' : 'Apagar meus moldes'}>
            <IcoTrash />
            <span className="fv-map-tip" aria-hidden>{p.isMaster ? 'Apagar todos os moldes' : 'Apagar meus moldes'}</span>
          </button>
        </span>
      )}
    </div>
  );
}

/* =====================================================================
   FOLHA DA FERRAMENTA — variações, ajustes da névoa/paredes, segredos
   ===================================================================== */
export interface FogControls {
  on: boolean;
  vision: boolean;
  onAll: (mode: 'reveal' | 'cover' | 'off') => void;
  onForget?: () => void;
}
export interface WallControls {
  vision: boolean;
  dark: boolean;
  count: number;
  /** Falta rodar o SQL: paredes antigas aparecem, mas não editam. */
  readOnly: boolean;
  onVision: () => void;
  onDark: () => void;
  onUndo: () => void;
  onClear: () => void;
}
export interface SecretControls {
  list: SceneSecret[];
  missing: boolean;
  tokens: Token[];
  selectedId?: string | null;
  onOpen: (token: Token) => void;
}

export function ToolSheet(p: { active: ToolGroup; tool: MapTool; onTool: (t: MapTool) => void; hint: string | null; fog?: FogControls; walls?: WallControls; secrets?: SecretControls }) {
  const { active } = p;
  return (
    <div className="fv-map-sheet" role="toolbar" aria-label={active.label}>
      <div className="fv-map-sheet-row">
        <b>{active.label}</b>
        {active.tools.length > 1 && (
          <span className="fv-map-seg" role="group" aria-label={`Tipo de ${active.label.toLowerCase()}`}>
            {active.tools.map((x) => (
              <button key={x.t} type="button" className={p.tool === x.t ? 'is-on' : ''} aria-pressed={p.tool === x.t} onClick={() => p.onTool(x.t)} title={x.key ? `${x.label} (${x.key})` : x.label}>
                {x.icon}
                <span>{x.label}</span>
              </button>
            ))}
          </span>
        )}
      </div>

      {active.id === 'fog' && p.fog && (
        <div className="fv-map-sheet-row">
          <button
            type="button"
            className="fv-map-act"
            onClick={() => {
              p.fog!.onAll('cover');
              p.fog!.onForget?.();
            }}
          >
            Cobrir tudo
          </button>
          <button type="button" className="fv-map-act" onClick={() => p.fog!.onAll('reveal')}>Revelar tudo</button>
          {p.fog.on && <button type="button" className="fv-map-act is-quiet" onClick={() => p.fog!.onAll('off')}>Desligar névoa</button>}
          {p.fog.vision && p.fog.onForget && (
            <button type="button" className="fv-map-act is-quiet" onClick={p.fog.onForget} title="Os jogadores esquecem o que já exploraram nesta cena">
              Apagar a memória
            </button>
          )}
        </div>
      )}

      {active.id === 'walls' && p.walls && (
        <>
          <div className="fv-map-sheet-row">
            <button type="button" className="fv-map-switch" role="switch" aria-checked={p.walls.vision} onClick={p.walls.onVision}>
              <i aria-hidden /> Visão dinâmica
            </button>
            <button type="button" className="fv-map-switch" role="switch" aria-checked={p.walls.dark} disabled={!p.walls.vision} onClick={p.walls.onDark}>
              <i aria-hidden /> Cena no escuro
            </button>
          </div>
          {p.walls.readOnly ? (
            <p className="fv-secret-empty">Rode <code>supabase/portas_luz.sql</code> no Supabase para desenhar paredes e portas.</p>
          ) : (
            p.walls.count > 0 && (
              <div className="fv-map-sheet-row">
                <span className="fv-map-count">{p.walls.count} {p.walls.count === 1 ? 'traço' : 'traços'}</span>
                <button type="button" className="fv-map-act" onClick={p.walls.onUndo}>Desfazer</button>
                <button type="button" className="fv-map-act is-danger" onClick={p.walls.onClear}>Apagar todas</button>
              </div>
            )
          )}
        </>
      )}

      {active.id === 'secrets' && p.secrets && (
        <div className="fv-secret-list" aria-label="Segredos desta cena">
          {p.secrets.missing && <p className="fv-secret-empty">Rode <code>supabase/segredos.sql</code> no Supabase para guardar segredos.</p>}
          {!p.secrets.missing && !p.secrets.list.length && <p className="fv-secret-empty">Nada escondido nesta cena ainda.</p>}
          {p.secrets.list.map((sc) => {
            const tk = p.secrets!.tokens.find((t) => t.id === sc.tokenId);
            return (
              <button
                key={sc.id}
                type="button"
                className={'fv-secret-row' + (sc.foundAt ? ' is-found' : '') + (tk && p.secrets!.selectedId === tk.id ? ' is-on' : '')}
                onClick={() => tk && p.secrets!.onOpen(tk)}
              >
                <span className={`fv-secret-row-ico is-${sc.kind}`} aria-hidden><SecretGlyph kind={sc.kind} size={16} /></span>
                <span className="fv-secret-row-txt">
                  <b>{sc.title}</b>
                  <small>{sc.foundAt ? `Achado por ${sc.foundBy ?? '—'}` : rulesSummary(sc.rules)}</small>
                </span>
                <span className={'fv-secret-row-state' + (sc.foundAt ? ' is-found' : '')}>{sc.foundAt ? 'Achado' : 'Escondido'}</span>
              </button>
            );
          })}
        </div>
      )}

      {p.hint && <small className="fv-map-sheet-hint">{p.hint}</small>}
    </div>
  );
}

/* =====================================================================
   CONTROLES DE VISÃO — trazer todos · zoom · grade · tela cheia
   ===================================================================== */
export function ViewTools(p: { zoom: number; onZoom: (factor: number) => void; onFit: () => void; onPull?: () => void; grid?: { on: boolean; onToggle: () => void }; full?: { on: boolean; onToggle: () => void } }) {
  return (
    <div className="fv-map-tools" role="toolbar" aria-label="Zoom do mapa">
      {p.onPull && (
        <>
          <button type="button" onClick={p.onPull} aria-label="Trazer todos para a minha visão" title="Trazer todos para a minha visão (ou Shift + duplo clique)">
            <IcoPull />
          </button>
          <i className="fv-map-tools-sep" aria-hidden />
        </>
      )}
      <button type="button" onClick={() => p.onZoom(0.8)} aria-label="Afastar" title="Afastar">
        <IcoMinus />
      </button>
      <button type="button" className="fv-map-zoom" onClick={p.onFit} aria-label="Enquadrar o mapa" title="Enquadrar o mapa">
        {Math.round(p.zoom * 100)}%
      </button>
      <button type="button" onClick={() => p.onZoom(1.25)} aria-label="Aproximar" title="Aproximar">
        <IcoPlus />
      </button>
      <i className="fv-map-tools-sep" aria-hidden />
      {p.grid && (
        <button type="button" className={p.grid.on ? 'is-on' : ''} onClick={p.grid.onToggle} aria-pressed={p.grid.on} aria-label="Mostrar grade" title="Grade">
          <IcoGrid />
        </button>
      )}
      {p.full && (
        <button
          type="button"
          className={'fv-map-fullbtn' + (p.full.on ? ' is-on' : '')}
          onClick={p.full.onToggle}
          aria-pressed={p.full.on}
          aria-label={p.full.on ? 'Sair da tela cheia' : 'Mapa em tela cheia'}
          title={p.full.on ? 'Sair da tela cheia (Esc)' : 'Mapa em tela cheia (F)'}
        >
          {p.full.on ? <IcoShrink /> : <IcoExpand />}
        </button>
      )}
    </div>
  );
}
