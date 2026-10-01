import type { DragEvent } from 'react';

/**
 * Arrastar para o mapa: NPCs, criaturas do bestiário, heróis e quem está no
 * encontro podem ser soltos direto numa casa do mapa (mouse/caneta; no
 * celular continua o toque em "Pôr no palco"/"Pôr no mapa").
 */
export const STAGE_DROP_MIME = 'application/x-fichaviva-token';

export type StageDrop =
  | { kind: 'npc'; id: string }
  | { kind: 'monster'; ref: string; qty?: number }
  | { kind: 'combatant'; id: string }
  | { kind: 'hero'; sheetId: string };

/** Props para tornar um elemento arrastável até o mapa. */
export function stageDragProps(item: StageDrop, label: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData(STAGE_DROP_MIME, JSON.stringify(item));
      e.dataTransfer.setData('text/plain', label);
      e.dataTransfer.effectAllowed = 'copyMove';
      document.body.classList.add('fv-dragging-token');
    },
    onDragEnd: () => document.body.classList.remove('fv-dragging-token'),
    title: `Arraste para o mapa: ${label}`,
  };
}

export function hasStageDrop(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(STAGE_DROP_MIME);
}

export function readStageDrop(e: DragEvent): StageDrop | null {
  try {
    const raw = JSON.parse(e.dataTransfer.getData(STAGE_DROP_MIME)) as StageDrop;
    return raw && typeof raw === 'object' && 'kind' in raw ? raw : null;
  } catch {
    return null;
  }
}
