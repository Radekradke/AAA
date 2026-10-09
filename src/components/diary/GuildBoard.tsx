import { useEffect, useMemo, useState } from 'react';
import type { Character, DiaryQuest } from '@/types/character';
import type { Mentionable } from '@/engine/diary';
import { CLUE_STATUS, cluesForQuest, diaryOf, norm, questProgress, QUEST_COLUMNS } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { newId } from '@/store/character/ids';
import { Modal } from '@/components/ui/Modal';
import { MentionInput, RichText } from './MentionInput';
import { useDiaryFocus, useDiaryNav } from './DiaryNav';

const PRIORITY_LABEL: Record<NonNullable<DiaryQuest['priority']>, string> = { high: 'Urgente', normal: 'Normal', low: 'Quando der' };

/** Tela estreita: uma coluna por vez, escolhida no seletor. */
function useNarrow(query = '(max-width: 899px)'): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

/**
 * Quadro da Guilda: as missões do herói em quatro colunas — Rumores, Ativas,
 * Concluídas e Falhas. Arraste o cartão (ou use ◀ ▶) para mudar de coluna;
 * clique para abrir os detalhes: quem pediu, recompensa, prazo e objetivos.
 */
export function GuildBoard({ char, people, places, query }: { char: Character; people: Mentionable[]; places: Mentionable[]; query: string }) {
  const store = useCharacterStore();
  const quests = diaryOf(char).quests;
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<DiaryQuest['status'] | null>(null);
  const narrow = useNarrow();
  const [col, setCol] = useState<DiaryQuest['status']>('active');
  useDiaryFocus('board', (id) => {
    const hit = quests.find((x) => x.id === id);
    if (!hit) return;
    setCol(hit.status);
    setOpenId(id);
  });
  const q = norm(query);

  const visible = useMemo(
    () => (q ? quests.filter((x) => norm([x.title, x.giver, x.reward, x.notes, ...x.objectives.map((o) => o.text)].join(' ')).includes(q)) : quests),
    [quests, q],
  );

  const patch = (id: string, p: Partial<DiaryQuest>) =>
    store.updateDiary(char.id, (d) => {
      d.quests = d.quests.map((x) => (x.id === id ? { ...x, ...p } : x));
    });
  const move = (id: string, status: DiaryQuest['status']) => patch(id, { status });
  const create = (status: DiaryQuest['status']) => {
    const id = newId('q');
    store.updateDiary(char.id, (d) => {
      d.quests.unshift({ id, title: '', status, priority: 'normal', objectives: [], at: Date.now() });
    });
    setOpenId(id);
  };

  const columns = narrow ? QUEST_COLUMNS.filter((c) => c.id === col) : QUEST_COLUMNS;
  const open = quests.find((x) => x.id === openId) ?? null;

  return (
    <div className="fv-board-wrap">
      {narrow && (
        <div className="fv-seg fv-board-pick" role="tablist" aria-label="Coluna do quadro">
          {QUEST_COLUMNS.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={col === c.id} className={col === c.id ? 'is-on' : ''} onClick={() => setCol(c.id)}>
              {c.label} <small>{visible.filter((x) => x.status === c.id).length}</small>
            </button>
          ))}
        </div>
      )}
      <div className={'fv-board' + (narrow ? ' is-single' : '')}>
        {columns.map((c) => {
          const list = visible.filter((x) => x.status === c.id).sort((a, b) => prio(b) - prio(a) || b.at - a.at);
          return (
            <section
              key={c.id}
              className={`fv-board-col is-${c.id}` + (over === c.id ? ' is-over' : '')}
              aria-label={c.label}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOver(c.id);
              }}
              onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, c.id);
                setDragId(null);
                setOver(null);
              }}
            >
              <header>
                <b>{c.label}</b>
                <small>{list.length}</small>
                {(c.id === 'rumor' || c.id === 'active' || narrow) && (
                  <button type="button" className="fv-board-add" onClick={() => create(c.id)} aria-label={`Nova missão em ${c.label}`} title="Nova missão">
                    +
                  </button>
                )}
              </header>
              <p className="fv-board-hint">{c.hint}</p>
              <div className="fv-board-list">
                {list.map((x) => {
                  const pr = questProgress(x);
                  const i = QUEST_COLUMNS.findIndex((k) => k.id === x.status);
                  return (
                    <article
                      key={x.id}
                      className={'fv-quest' + (x.priority === 'high' ? ' is-urgent' : '') + (dragId === x.id ? ' is-dragging' : '')}
                      draggable
                      onDragStart={(e) => {
                        setDragId(x.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', x.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                    >
                      <button type="button" className="fv-quest-open" onClick={() => setOpenId(x.id)}>
                        <b>{x.title.trim() || 'Missão sem nome'}</b>
                        {x.giver && <small>pedida por {x.giver.replace(/@/g, '')}</small>}
                        {(x.reward || x.deadline) && (
                          <span className="fv-quest-meta">
                            {x.reward && <span>💰 {x.reward}</span>}
                            {x.deadline && <span>⏳ {x.deadline}</span>}
                          </span>
                        )}
                        {pr.total > 0 && (
                          <span className="fv-quest-progress" aria-label={`${pr.done} de ${pr.total} objetivos`}>
                            <span style={{ width: `${(pr.done / pr.total) * 100}%` }} />
                            <em>{pr.done}/{pr.total}</em>
                          </span>
                        )}
                      </button>
                      <span className="fv-quest-move">
                        <button type="button" disabled={i === 0} aria-label={`Mover para ${QUEST_COLUMNS[i - 1]?.label}`} title={QUEST_COLUMNS[i - 1] ? `← ${QUEST_COLUMNS[i - 1].label}` : undefined} onClick={() => move(x.id, QUEST_COLUMNS[i - 1].id)}>◀</button>
                        {x.priority === 'high' && <span className="fv-quest-flag">Urgente</span>}
                        <button type="button" disabled={i === QUEST_COLUMNS.length - 1} aria-label={`Mover para ${QUEST_COLUMNS[i + 1]?.label}`} title={QUEST_COLUMNS[i + 1] ? `${QUEST_COLUMNS[i + 1].label} →` : undefined} onClick={() => move(x.id, QUEST_COLUMNS[i + 1].id)}>▶</button>
                      </span>
                    </article>
                  );
                })}
                {list.length === 0 && <p className="fv-board-empty">{q ? 'Nada com essa busca.' : c.empty}</p>}
              </div>
            </section>
          );
        })}
      </div>

      {open && <QuestDetail char={char} quest={open} people={people} places={places} onClose={() => setOpenId(null)} />}
    </div>
  );
}

const prio = (x: DiaryQuest) => (x.priority === 'high' ? 2 : x.priority === 'low' ? 0 : 1);

/** Detalhes da missão (no modal padrão: Esc e ✕ fecham, clique fora não perde nada). */
function QuestDetail({ char, quest, people, places, onClose }: { char: Character; quest: DiaryQuest; people: Mentionable[]; places: Mentionable[]; onClose: () => void }) {
  const store = useCharacterStore();
  const [newObj, setNewObj] = useState('');
  const [readNotes, setReadNotes] = useState(!!quest.notes?.trim());
  const set = (p: Partial<DiaryQuest>) =>
    store.updateDiary(char.id, (d) => {
      d.quests = d.quests.map((x) => (x.id === quest.id ? { ...x, ...p } : x));
    });
  const addObjective = () => {
    const t = newObj.trim();
    if (!t) return;
    set({ objectives: [...quest.objectives, { id: newId('o'), text: t, done: false }] });
    setNewObj('');
  };
  const remove = () => {
    if (!confirm('Apagar esta missão do quadro?')) return;
    store.updateDiary(char.id, (d) => {
      d.quests = d.quests.filter((x) => x.id !== quest.id);
    });
    onClose();
  };

  const pr = questProgress(quest);
  const linked = cluesForQuest(diaryOf(char).clues, quest.id);
  const nav = useDiaryNav();
  const prioNow = quest.priority ?? 'normal';
  return (
    <Modal
      title={quest.title.trim() || 'Nova missão'}
      icon="banner"
      onClose={onClose}
      maxWidth={640}
      footer={
        <div className="fv-quest-foot">
          <button type="button" className="fv-link-btn is-danger" onClick={remove}>Apagar missão</button>
          <button type="button" className="fv-btn-gold" onClick={onClose}>Pronto</button>
        </div>
      }
    >
      <div className="fv-quest-detail">
        <div className="fv-seg fv-quest-status" role="radiogroup" aria-label="Situação da missão">
          {QUEST_COLUMNS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={quest.status === c.id} className={quest.status === c.id ? 'is-on' : ''} onClick={() => set({ status: c.id })}>
              {c.short}
            </button>
          ))}
        </div>

        <input className="fv-quest-title" aria-label="Nome da missão" placeholder="Nome da missão (ex.: Resgatar o filho do moleiro)" value={quest.title} autoFocus={!quest.title} onChange={(e) => set({ title: e.target.value })} />

        <div className="fv-quest-fields">
          <label>
            <span>Quem pediu</span>
            <MentionInput value={quest.giver ?? ''} onChange={(v) => set({ giver: v })} people={people} places={places} ariaLabel="Quem pediu" placeholder="@NPC ou nome" />
          </label>
          <label>
            <span>Recompensa</span>
            <input className="fv-input" value={quest.reward ?? ''} onChange={(e) => set({ reward: e.target.value })} placeholder="200 po, um favor, a espada…" />
          </label>
          <label>
            <span>Prazo</span>
            <input className="fv-input" value={quest.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value })} placeholder="antes da lua cheia" />
          </label>
          <div className="fv-quest-field">
            <span>Prioridade</span>
            <div className="fv-seg" role="radiogroup" aria-label="Prioridade">
              {(['high', 'normal', 'low'] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={prioNow === p} className={prioNow === p ? 'is-on' : ''} onClick={() => set({ priority: p })}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="fv-quest-objs">
          <div className="fv-facts-title">
            Objetivos {pr.total > 0 && <small>{pr.done} de {pr.total}</small>}
          </div>
          {quest.objectives.length > 0 && (
            <ul>
              {quest.objectives.map((o) => (
                <li key={o.id} className={o.done ? 'is-done' : ''}>
                  <label>
                    <input type="checkbox" checked={o.done} onChange={() => set({ objectives: quest.objectives.map((x) => (x.id === o.id ? { ...x, done: !x.done } : x)) })} />
                    <RichText text={o.text} people={people} />
                  </label>
                  <button type="button" aria-label={`Tirar objetivo: ${o.text}`} onClick={() => set({ objectives: quest.objectives.filter((x) => x.id !== o.id) })}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <MentionInput value={newObj} onChange={setNewObj} people={people} places={places} onSubmit={addObjective} ariaLabel="Novo objetivo" placeholder="+ objetivo (Enter adiciona)" />
        </section>

        <section>
          <div className="fv-facts-title fv-quest-notes-title">
            Anotações
            {quest.notes?.trim() && (
              <button type="button" className="fv-link-btn" onClick={() => setReadNotes(!readNotes)}>
                {readNotes ? 'editar' : 'ver'}
              </button>
            )}
          </div>
          {readNotes && quest.notes?.trim() ? (
            <RichText text={quest.notes} people={people} className="fv-quest-notes-read" />
          ) : (
            <MentionInput value={quest.notes ?? ''} onChange={(v) => set({ notes: v })} people={people} places={places} rows={5} ariaLabel="Anotações da missão" placeholder="O que sabemos, suspeitas, onde procurar… (@ e # funcionam)" />
          )}
        </section>

        {linked.length > 0 && (
          <section>
            <div className="fv-facts-title">Pistas ligadas</div>
            <ul className="fv-quest-clues">
              {linked.map((c) => (
                <li key={c.id} className={`is-${c.status}`}>
                  <button type="button" onClick={() => nav?.go('clues', c.id)} disabled={!nav}>
                    <span className="fv-quest-clue-dot" aria-hidden />
                    <b>{c.title.trim() || 'Pista sem nome'}</b>
                    <small>{CLUE_STATUS.find((s) => s.id === c.status)?.label}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
