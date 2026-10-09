import { useMemo, useState } from 'react';
import type { Character, DiaryPersonNote } from '@/types/character';
import type { DiaryItem, Mentionable } from '@/engine/diary';
import { diaryItems, diaryOf, findMentions, norm, PERSON_OPINION, personKey, whereMentioned } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { Modal } from '@/components/ui/Modal';
import { NpcAvatar } from '@/components/campaign/NpcGallery';
import { MentionInput } from './MentionInput';
import { useDiaryFocus, useDiaryNav } from './DiaryNav';

type Kind = 'all' | 'npc' | 'hero';

const SECTION_LABEL: Record<DiaryItem['section'], string> = { notes: 'Rabisco', chronicle: 'Sessão', board: 'Missão', clues: 'Pista' };
const OPINION_LABEL = Object.fromEntries(PERSON_OPINION.map((o) => [o.id, o.label])) as Record<NonNullable<DiaryPersonNote['opinion']>, string>;

function excerptAround(text: string, name: string, max = 110): string {
  const flat = text.replace(/[@#](?=\S)/g, '').replace(/\s+/g, ' ').trim();
  const i = norm(flat).indexOf(norm(name));
  if (i < 0 || flat.length <= max) return flat.length > max ? flat.slice(0, max) + '…' : flat;
  const start = Math.max(0, i - 40);
  const cut = flat.slice(start, start + max);
  return (start > 0 ? '…' : '') + cut + (start + max < flat.length ? '…' : '');
}

/**
 * Pessoas: todo NPC revelado e herói do grupo, com quantas vezes aparece no
 * diário, o que o herói acha dele (aliado, suspeito…) e onde foi citado —
 * cada citação abre o rabisco, a sessão, a missão ou a pista.
 */
export function People({ char, people, places, query }: { char: Character; people: Mentionable[]; places: Mentionable[]; query: string }) {
  const notes = diaryOf(char).people;
  const [kind, setKind] = useState<Kind>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const q = norm(query);

  // abre a pessoa pedida por uma menção (vem pelo nome)
  useDiaryFocus('people', (name) => {
    const hit = people.find((p) => norm(p.name) === norm(name));
    if (hit) setOpenKey(hit.key);
  });

  const items = useMemo(() => diaryItems(char), [char]);
  const rows = useMemo(
    () =>
      people
        .map((p) => ({ p, count: items.filter((it) => findMentions([it.text], [p]).length > 0).length, note: notes[personKey(p.name)] }))
        .filter((r) => kind === 'all' || r.p.kind === kind)
        .filter((r) => !q || norm([r.p.name, r.p.role, r.p.summary, r.note?.note].filter(Boolean).join(' ')).includes(q))
        .sort((a, b) => b.count - a.count || a.p.name.localeCompare(b.p.name)),
    [people, items, notes, kind, q],
  );
  const open = people.find((p) => p.key === openKey) ?? null;
  const heroes = people.filter((p) => p.kind === 'hero').length;

  if (!people.length)
    return (
      <p className="fv-diary-empty">
        Ninguém por aqui ainda. Os NPCs que o mestre revelar e os heróis dos outros jogadores das suas mesas aparecem nesta página — e tudo o que você escrever sobre eles com @ fica ligado a cada um.
      </p>
    );

  return (
    <div className="fv-people">
      <div className="fv-seg fv-people-kind" role="radiogroup" aria-label="Mostrar pessoas">
        {([['all', 'Todos', people.length], ['npc', 'NPCs', people.length - heroes], ['hero', 'Heróis', heroes]] as const).map(([id, label, n]) => (
          <button key={id} type="button" role="radio" aria-checked={kind === id} className={kind === id ? 'is-on' : ''} onClick={() => setKind(id)}>
            {label} <small>{n}</small>
          </button>
        ))}
      </div>

      {rows.length ? (
        <ul className="fv-people-grid">
          {rows.map(({ p, count, note }) => (
            <li key={p.key}>
              <button type="button" className={'fv-person' + (p.kind === 'hero' ? ' is-hero' : '') + (note?.opinion ? ` is-${note.opinion}` : '')} onClick={() => setOpenKey(p.key)}>
                <NpcAvatar npc={{ name: p.name, portrait: p.portrait ?? null }} size={52} />
                <span className="fv-person-text">
                  <b>{p.name}</b>
                  <small>{p.kind === 'hero' ? 'Herói' : 'NPC'}{p.role ? ` · ${p.role}` : ''}</small>
                  <span className="fv-person-tags">
                    {note?.opinion && <span className={`fv-opinion is-${note.opinion}`}>{OPINION_LABEL[note.opinion]}</span>}
                    <span className="fv-person-count">{count ? `citado em ${count}` : 'ainda não citado'}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fv-diary-empty">Ninguém com essa busca.</p>
      )}

      {open && <PersonDetail char={char} who={open} people={people} places={places} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

function PersonDetail({ char, who, people, places, onClose }: { char: Character; who: Mentionable; people: Mentionable[]; places: Mentionable[]; onClose: () => void }) {
  const store = useCharacterStore();
  const nav = useDiaryNav();
  const key = personKey(who.name);
  const mine = diaryOf(char).people[key] ?? {};
  const set = (p: Partial<DiaryPersonNote>) =>
    store.updateDiary(char.id, (d) => {
      d.people = { ...d.people, [key]: { ...d.people[key], ...p } };
    });
  const cited = whereMentioned(char, who);

  return (
    <Modal title={who.name} onClose={onClose} maxWidth={680} footer={<div className="fv-quest-foot"><span /><button type="button" className="fv-btn-gold" onClick={onClose}>Pronto</button></div>}>
      <div className="fv-person-detail">
        <div className={'fv-person-portrait' + (who.kind === 'hero' ? ' is-hero' : '')}>
          {who.portrait ? <img src={who.portrait} alt="" /> : <NpcAvatar npc={{ name: who.name, portrait: null }} size={120} />}
          <small>{who.kind === 'hero' ? 'Herói do grupo' : 'NPC'}{who.role ? ` · ${who.role}` : ''}</small>
        </div>

        <div className="fv-person-body">
          {who.summary?.trim() && (
            <section>
              <div className="fv-facts-title">{who.kind === 'hero' ? 'Da ficha' : 'O que o mestre revelou'}</div>
              <p className="fv-person-summary">{who.summary}</p>
            </section>
          )}

          <section>
            <div className="fv-facts-title">O que eu acho</div>
            <div className="fv-seg fv-person-opinion" role="radiogroup" aria-label="O que eu acho">
              {PERSON_OPINION.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={mine.opinion === o.id} className={(mine.opinion === o.id ? 'is-on ' : '') + `is-${o.id}`} onClick={() => set({ opinion: mine.opinion === o.id ? undefined : o.id })}>
                  {o.label}
                </button>
              ))}
            </div>
            <MentionInput value={mine.note ?? ''} onChange={(v) => set({ note: v })} people={people} places={places} rows={3} ariaLabel={`Minhas notas sobre ${who.name}`} placeholder="Promessas, dívidas, desconfianças… (@ e # funcionam)" />
          </section>

          <section>
            <div className="fv-facts-title">Onde aparece {cited.length > 0 && <small className="fv-person-cited-n">{cited.length}</small>}</div>
            {cited.length ? (
              <ul className="fv-backlinks">
                {cited.map((it) => (
                  <li key={`${it.section}:${it.id}`}>
                    <button type="button" onClick={() => nav?.go(it.section, it.id)}>
                      <span className={`fv-backlink-kind is-${it.section}`}>{SECTION_LABEL[it.section]}</span>
                      {it.section === 'notes' ? (
                        <b className="is-note">{excerptAround(it.text, who.name)}</b>
                      ) : (
                        <>
                          <b>{it.title.replace(/[@#](?=\S)/g, '')}</b>
                          <small>{excerptAround(it.text, who.name)}</small>
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fv-diary-empty">Ainda não foi citado. Escreva @{who.name.split(' ')[0]} num rabisco, sessão, missão ou pista.</p>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}
