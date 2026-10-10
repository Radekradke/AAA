import { createContext, useContext, useEffect, useRef } from 'react';
import type { DiarySection } from '@/engine/diary';

/** Ir para um item do diário (de qualquer seção) — as ligações entre rabiscos, sessões, missões, pistas e pessoas. */
export interface DiaryNavApi {
  /** Abre a seção e, se vier `id`, o item (sessão, missão, pista, rabisco ou pessoa pelo nome). */
  go: (section: DiarySection, id?: string) => void;
  focus: { section: DiarySection; id: string } | null;
  clearFocus: () => void;
}

export const DiaryNavContext = createContext<DiaryNavApi | null>(null);

/** Navegação do diário (null fora da aba Diário, ex.: no botão Anotar). */
export const useDiaryNav = () => useContext(DiaryNavContext);

/** Quando alguém pedir para abrir um item desta seção, `apply(id)` roda uma vez. */
export function useDiaryFocus(section: DiarySection, apply: (id: string) => void) {
  const nav = useDiaryNav();
  const id = nav?.focus?.section === section ? nav.focus.id : null;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    if (!id) return;
    applyRef.current(id);
    nav?.clearFocus();
  }, [id, nav]);
}
