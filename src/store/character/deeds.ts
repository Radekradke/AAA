import type { CharacterState, StoreCtx } from './types';
import { newId } from './ids';

/** Carta do herói: feitos (calculados em lib/deedTracker) e cicatrizes. */
export function deedActions({ mutate }: StoreCtx): Pick<CharacterState, 'setDeeds' | 'addScar' | 'removeScar' | 'recordSession'> {
  return {
    setDeeds(id, deeds) {
      mutate(id, (c) => {
        c.deeds = deeds;
      });
    },
    addScar(id, scar) {
      const text = scar.text.trim().slice(0, 200);
      if (!text) return;
      mutate(id, (c) => {
        const sid = scar.id ?? newId('scar');
        if ((c.scars ?? []).some((s) => s.id === sid)) return;
        c.scars = [...(c.scars ?? []), { ...scar, id: sid, text }].slice(-24);
      });
    },
    removeScar(id, scarId) {
      mutate(id, (c) => {
        c.scars = (c.scars ?? []).filter((s) => s.id !== scarId);
      });
    },
    recordSession(id, session) {
      mutate(id, (c) => {
        if ((c.sessions ?? []).some((s) => s.id === session.id)) return;
        c.sessions = [...(c.sessions ?? []), { ...session, name: session.name.slice(0, 80) }].slice(-200);
      });
    },
  };
}
