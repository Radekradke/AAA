import { useEffect, useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/useTheme';
import { stageService } from '@/services/stageService';
import { cloudEnabled } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Handout } from '@/types/stage';
import type { DiarySection } from '@/engine/diary';
import { diaryOf, sectionHits } from '@/engine/diary';
import { useMentionables } from '@/components/diary/useMentionables';
import { DiaryNotes } from '@/components/diary/DiaryNotes';
import { Chronicle } from '@/components/diary/Chronicle';
import { GuildBoard } from '@/components/diary/GuildBoard';
import { Clues } from '@/components/diary/Clues';
import { People } from '@/components/diary/People';
import { DiaryNavContext } from '@/components/diary/DiaryNav';
import type { DiaryNavApi } from '@/components/diary/DiaryNav';
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

/** Aba ativa visível na barra (rola só a barra, nunca a página). */
function centerTab(el: HTMLButtonElement | null) {
  const nav = el?.parentElement;
  if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return;
  nav.scrollLeft = el.offsetLeft - nav.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
}

type Section = DiarySection;
const SECTION_KEY = 'fv-diary-section';

/**
 * Aba Diário — o caderno de campanha do jogador (pessoal, fica na ficha):
 * Rabiscos (anotação rápida), Crônica (uma página por sessão, com @NPCs,
 * @heróis do grupo e #lugares), Quadro da Guilda (missões) e Pistas (com
 * imagem, verificação e as entregas do mestre).
 */
export function TabDiario({ char }: TabProps) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const { people, places } = useMentionables(char);
  const handouts = useSheetHandouts(char.id);
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
    { id: 'board', label: 'Quadro da Guilda', count: diary.quests.filter((q) => q.status === 'active').length },
    { id: 'clues', label: 'Pistas', count: diary.clues.filter((c) => c.status === 'unverified').length },
    { id: 'people', label: 'Pessoas', count: 0 },
  ];
  const current = tabs.some((x) => x.id === section) ? section : 'notes';

  // ligações: qualquer item pode abrir outro (menção → pessoa, pista → missão…)
  const [focus, setFocus] = useState<DiaryNavApi['focus']>(null);
  const nav = useMemo<DiaryNavApi>(
    () => ({
      go: (s, id) => {
        go(s);
        if (id) {
          setQuery('');
          setFocus({ section: s, id });
        }
      },
      focus,
      clearFocus: () => setFocus(null),
    }),
    [focus],
  );

  // a busca vale para o diário inteiro: mostra onde mais há resultado
  const hits = useMemo(() => sectionHits(char, query), [char, query]);
  const elsewhere = query.trim() ? tabs.filter((x) => x.id !== current && x.id !== 'people' && hits[x.id as keyof typeof hits] > 0) : [];

  return (
    <DiaryNavContext.Provider value={nav}>
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
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={current === x.id}
            className={current === x.id ? 'is-on' : ''}
            ref={current === x.id ? centerTab : undefined}
            onClick={() => go(x.id)}
          >
            {x.label}
            {x.count > 0 && <small>{x.count}</small>}
          </button>
        ))}
      </nav>

      {elsewhere.length > 0 && (
        <p className="fv-diary-elsewhere" role="status">
          Também em:
          {elsewhere.map((x) => (
            <button key={x.id} type="button" className="fv-mini-tag" onClick={() => go(x.id)}>
              {x.label} <b>{hits[x.id as keyof typeof hits]}</b>
            </button>
          ))}
        </p>
      )}

      {current === 'notes' && <DiaryNotes char={char} people={people} places={places} query={query} />}
      {current === 'chronicle' && <Chronicle char={char} people={people} places={places} query={query} />}
      {current === 'board' && <GuildBoard char={char} people={people} places={places} query={query} />}
      {current === 'clues' && <Clues char={char} people={people} places={places} query={query} handouts={handouts} />}
      {current === 'people' && <People char={char} people={people} places={places} query={query} />}
    </div>
    </DiaryNavContext.Provider>
  );
}
