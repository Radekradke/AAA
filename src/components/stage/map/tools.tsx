import type { ReactNode } from 'react';
import type { MapTool, MarkKind } from '@/types/stage';
import { LIGHT_PRESETS } from '@/engine/vision';
import { SecretGlyph } from '../secretArt';
import { IcoCircle, IcoCone, IcoDoor, IcoEye, IcoEyeOff, IcoLaser, IcoLine, IcoMove, IcoRuler, IcoSquare, IcoWall } from './icons';

/** Ferramentas do mapa: um botão por grupo na doca (como no Foundry); as variações ficam na folha. */
export interface ToolGroup {
  id: 'move' | 'measure' | 'area' | 'laser' | 'fog' | 'walls' | 'secrets';
  label: string;
  key: string;
  master?: boolean;
  tools: { t: MapTool; label: string; key?: string; icon: ReactNode }[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  { id: 'move', label: 'Mover', key: 'V', tools: [{ t: 'move', label: 'Mover', icon: <IcoMove /> }] },
  { id: 'measure', label: 'Régua', key: 'R', tools: [{ t: 'measure', label: 'Régua', icon: <IcoRuler /> }] },
  {
    id: 'area',
    label: 'Moldes de área',
    key: 'C',
    tools: [
      { t: 'circle', label: 'Esfera', key: 'C', icon: <IcoCircle /> },
      { t: 'cone', label: 'Cone', key: 'O', icon: <IcoCone /> },
      { t: 'line', label: 'Linha', key: 'L', icon: <IcoLine /> },
      { t: 'square', label: 'Cubo', key: 'Q', icon: <IcoSquare /> },
    ],
  },
  { id: 'laser', label: 'Caneta-laser', key: 'P', tools: [{ t: 'laser', label: 'Caneta-laser', icon: <IcoLaser /> }] },
  {
    id: 'fog',
    label: 'Névoa',
    key: 'N',
    master: true,
    tools: [
      { t: 'reveal', label: 'Revelar', icon: <IcoEye /> },
      { t: 'cover', label: 'Cobrir', icon: <IcoEyeOff /> },
    ],
  },
  {
    id: 'walls',
    label: 'Paredes e portas',
    key: 'W',
    master: true,
    tools: [
      { t: 'wall', label: 'Parede', key: 'W', icon: <IcoWall /> },
      { t: 'door', label: 'Porta', key: 'D', icon: <IcoDoor /> },
    ],
  },
  {
    id: 'secrets',
    label: 'Segredos',
    key: 'S',
    master: true,
    tools: [{ t: 'secret', label: 'Segredo', icon: <SecretGlyph kind="chest" size={19} /> }],
  },
];

export function groupOf(t: MapTool): ToolGroup {
  return TOOL_GROUPS.find((gr) => gr.tools.some((x) => x.t === t)) ?? TOOL_GROUPS[0];
}

/** Atalhos de teclado (fora de campos de texto). */
export const TOOL_KEYS: Record<string, MapTool> = { v: 'move', r: 'measure', c: 'circle', o: 'cone', l: 'line', q: 'square', p: 'laser' };
export const MASTER_TOOL_KEYS: Record<string, MapTool> = { n: 'reveal', w: 'wall', d: 'door', s: 'secret' };

export const HINTS: Partial<Record<MapTool, string>> = {
  measure: 'Arraste de uma casa a outra · a régua some ao soltar',
  circle: 'Arraste do centro para fora · todos veem quem fica dentro',
  cone: 'Arraste da ponta na direção do sopro',
  line: 'Arraste da origem até o alcance',
  square: 'Arraste de uma quina na diagonal',
  laser: 'Risque o caminho · some sozinho',
  reveal: 'Arraste um retângulo para revelar',
  cover: 'Arraste um retângulo para cobrir',
  wall: 'Arraste de quina a quina · um toque numa parede apaga',
  door: 'Arraste sobre o vão para criar · toque numa porta para trancar',
  secret: 'Toque numa casa para esconder algo · toque num selo para editar',
};
export const MOVE_HINT = {
  master: 'Arraste NPCs e criaturas da lateral para cá · duplo clique aponta',
  player: 'Arraste o seu peão · duplo clique (ou segure o dedo) aponta um lugar',
};

export const MARK_TOOLS: MarkKind[] = ['measure', 'circle', 'cone', 'line', 'square'];
export const MARK_NAME: Record<MarkKind, string> = { measure: 'Régua', circle: 'Esfera / raio', cone: 'Cone', line: 'Linha', square: 'Cubo' };

export const lightLabel = (m: number) => LIGHT_PRESETS.find((l) => l.m === m)?.label ?? (m > 0 ? `${m} m` : 'Sem luz');
