import { useEffect, useState } from 'react';
import type { TabProps } from './tabProps';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/useTheme';
import { HandoutModal } from '@/components/stage/Handouts';
import { stageService } from '@/services/stageService';
import { cloudEnabled } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Handout } from '@/types/stage';
import { diaryOf } from '@/engine/diary';
import { useMentionables } from '@/components/diary/useMentionables';
import { DiaryNotes } from '@/components/diary/DiaryNotes';
import { Chronicle } from '@/components/diary/Chronicle';
import '@/styles/session.css';
import '@/styles/stage.css';
import '@/styles/diary.css';

/** Pistas (handouts) que o mestre entregou nas mesas desta ficha — com cópia offline. */
function useSheetHandouts(sheetId: string): Handout[] {
  const user = useAuthStore((s) => s.user);
  const [list, setList] = useState<Handout[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`fv-handouts-${sheetId}`) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (!cloudEnabled() || !user || user.guest) return;
    let alive = true;
    void stageService.handoutsForSheet(sheetId).then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, [sheetId, user]);
  return list;
}

type Section = 'notes' | 'chronicle' | 'clues';
const SECTION_KEY = 'fv-diary-section';

/**
 * Aba Diário — o caderno de campanha do jogador (pessoal, fica na ficha):
 * Rabiscos (anotação rápida), Crônica (uma página por sessão, com @NPCs,
 * @heróis do grupo e #lugares) e as pistas que o mestre entregou.
 */
export function TabDiario({ char }: TabProps) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const { people, places } = useMentionables(char);
  const clues = useSheetHandouts(char.id);
  const [clue, setClue] = useState<Handout | null>(null);
  const [section, setSection] = useState<Section>(() => {
    try {
      return (localStorage.getItem(SECTION_KEY) as Section) || 'notes';
    } catch {
      return 'notes';
    }
  });
  const go = (s: Section) => {
    setSection(s);
    try {
      localStorage.setItem(SECTION_KEY, s);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  const diary = diaryOf(char);
  const openNotes = diary.notes.filter((n) => !n.done).length;
  const tabs: { id: Section; label: string; count: number }[] = [
    { id: 'notes', label: 'Rabiscos', count: openNotes },
    { id: 'chronicle', label: 'Crônica', count: char.journal.length },
    ...(clues.length ? [{ id: 'clues' as const, label: 'Pistas da mesa', count: clues.length }] : []),
  ];
  const current = tabs.some((x) => x.id === section) ? section : 'notes';

  return (
    <div className="animate-riseIn fv-diary">
      <header className="fv-diary-head">
        <div className="fv-diary-title">
          <Icon name="quill" size={22} color={t.gold} />
          <div>
            <h2>Diário de Campanha</h2>
            <small>pessoal · só você vê</small>
          </div>
        </div>
        <input className="fv-input fv-diary-search" placeholder="Buscar no diário…" aria-label="Buscar no diário" value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>

      <nav className="fv-diary-tabs" role="tablist" aria-label="Seções do diário">
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={current === x.id} className={current === x.id ? 'is-on' : ''} onClick={() => go(x.id)}>
            {x.label}
            {x.count > 0 && <small>{x.count}</small>}
          </button>
        ))}
      </nav>

      {current === 'notes' && <DiaryNotes char={char} people={people} places={places} query={query} />}
      {current === 'chronicle' && <Chronicle char={char} people={people} places={places} query={query} />}
      {current === 'clues' && (
        <div className="fv-diary-clues">
          {clues.map((h) => (
            <button key={h.id} type="button" className="fv-handout-open" onClick={() => setClue(h)}>
              <span className="fv-handout-seal" aria-hidden>✉</span>
              <span>
                <b>{h.title}</b>
                <small>{h.shownAt ? new Date(h.shownAt).toLocaleDateString('pt-BR') : ''}{h.recipients ? ' · só para você' : ''}</small>
              </span>
            </button>
          ))}
          {clue && <HandoutModal handout={clue} onClose={() => setClue(null)} />}
        </div>
      )}
    </div>
  );
}
