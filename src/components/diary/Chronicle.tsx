import { useMemo, useState } from 'react';
import type { Character, JournalEntry } from '@/types/character';
import type { Mentionable } from '@/engine/diary';
import { entryBody, entrySession, norm, sessionDigest } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { MentionChip, MentionInput, PlaceChip, RichText } from './MentionInput';
import { useDiaryFocus } from './DiaryNav';

function excerpt(text: string, max = 150): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s\S*$/, '') + '…' : t;
}

/**
 * Crônica: uma página por sessão, com texto livre. "@" cita NPCs e heróis do
 * grupo, "#" marca lugares; ao lado, quem apareceu e por onde o grupo passou.
 * Modo leitura deixa a história com cara de livro.
 */
export function Chronicle({ char, people, places, query }: { char: Character; people: Mentionable[]; places: Mentionable[]; query: string }) {
  const store = useCharacterStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<'write' | 'read'>('read');
  useDiaryFocus('chronicle', (id) => {
    setOpenId(id);
    setMode('read');
  });
  const total = char.journal.length;
  const sessions = useMemo(
    () => char.journal.map((e, i) => ({ e, n: entrySession(e, total - i), body: entryBody(e) })),
    [char.journal, total],
  );
  const q = norm(query);
  const shown = q ? sessions.filter((s) => norm(`${s.e.title}\n${s.body}`).includes(q)) : sessions;
  const open = sessions.find((s) => s.e.id === openId);

  const patch = (e: JournalEntry, p: Partial<JournalEntry>) => store.updateJournalEntry(char.id, e.id, p);

  const create = () => {
    const id = store.addJournalEntry(char.id);
    setOpenId(id);
    setMode('write');
  };

  if (open) {
    const digest = sessionDigest(`${open.e.title}\n${open.body}`, people);
    return (
      <article className="fv-chron-page">
        <header className="fv-chron-head">
          <button type="button" className="fv-link-btn" onClick={() => setOpenId(null)}>
            ← Todas as sessões
          </button>
          <div className="fv-seg" role="radiogroup" aria-label="Modo">
            {(['read', 'write'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)}>
                {m === 'read' ? 'Ler' : 'Escrever'}
              </button>
            ))}
          </div>
        </header>

        <div className="fv-chron-layout">
          <div className="fv-chron-main">
            <div className="fv-chron-eyebrow">
              Sessão
              <input
                type="number"
                min={1}
                className="fv-chron-num"
                aria-label="Número da sessão"
                value={open.n}
                onChange={(ev) => patch(open.e, { session: Math.max(1, Number(ev.target.value) || 1) })}
              />
              ·
              <input className="fv-chron-date" aria-label="Data" value={open.e.date} onChange={(ev) => patch(open.e, { date: ev.target.value })} />
            </div>
            <input
              className="fv-chron-title"
              aria-label="Título da sessão"
              placeholder="Título (ex.: A emboscada na ponte)"
              value={open.e.title}
              onChange={(ev) => patch(open.e, { title: ev.target.value })}
            />
            {mode === 'write' ? (
              <MentionInput
                value={open.body}
                onChange={(v) => patch(open.e, { body: v })}
                people={people}
                places={places}
                rows={16}
                className="fv-input fv-chron-text"
                ariaLabel="O que aconteceu na sessão"
                placeholder={'Conte com calma o que aconteceu…\n\n@ cita um NPC ou herói do grupo · # marca um lugar (#Porto Sombrio)'}
                autoFocus={!open.body}
              />
            ) : open.body.trim() ? (
              <RichText text={open.body} people={people} className="fv-chron-read" />
            ) : (
              <p className="fv-diary-empty">
                Página em branco. <button type="button" className="fv-link-btn" onClick={() => setMode('write')}>Escrever a sessão</button>
              </p>
            )}
          </div>

          <aside className="fv-chron-side" aria-label="Nesta sessão">
            <div className="fv-facts-title">Nesta sessão</div>
            {digest.people.length + digest.places.length === 0 && <small>Cite alguém com @ ou um lugar com # e eles aparecem aqui.</small>}
            {digest.people.length > 0 && (
              <div className="fv-chron-side-group">
                <span>Quem apareceu</span>
                <div>{digest.people.map((p) => <MentionChip key={p.key} who={p} />)}</div>
              </div>
            )}
            {digest.places.length > 0 && (
              <div className="fv-chron-side-group">
                <span>Por onde passamos</span>
                <div>{digest.places.map((p) => <PlaceChip key={p} name={p} />)}</div>
              </div>
            )}
            <button
              type="button"
              className="fv-link-btn is-danger"
              onClick={() => {
                if (!confirm(`Apagar a Sessão ${open.n}? Não dá para desfazer.`)) return;
                store.deleteJournalEntry(char.id, open.e.id);
                setOpenId(null);
              }}
            >
              Apagar sessão
            </button>
          </aside>
        </div>
      </article>
    );
  }

  return (
    <div className="fv-chron">
      <button type="button" className="fv-chron-new" onClick={create}>
        <b>+ Nova sessão</b>
        <small>Sessão {Math.max(0, ...sessions.map((s) => s.n)) + 1} · escreva com calma o que aconteceu</small>
      </button>
      {shown.map(({ e, n, body }) => {
        const d = sessionDigest(`${e.title}\n${body}`, people);
        return (
          <button key={e.id} type="button" className="fv-chron-card" onClick={() => { setOpenId(e.id); setMode('read'); }}>
            <span className="fv-chron-card-n">{n}</span>
            <span className="fv-chron-card-text">
              <b>{e.title.trim() || `Sessão ${n}`}</b>
              <small>{e.date}</small>
              <span className="fv-chron-card-ex">{body.trim() ? excerpt(body.replace(/[@#]/g, '')) : 'Ainda em branco — toque para escrever.'}</span>
              {(d.people.length > 0 || d.places.length > 0) && (
                <span className="fv-chron-card-tags">
                  {d.people.slice(0, 5).map((p) => <span key={p.key} className={'fv-mini-tag' + (p.kind === 'hero' ? ' is-hero' : '')}>@{p.name}</span>)}
                  {d.places.slice(0, 3).map((p) => <span key={p} className="fv-mini-tag is-place">⌖ {p}</span>)}
                </span>
              )}
            </span>
          </button>
        );
      })}
      {q && shown.length === 0 && <p className="fv-diary-empty">Nenhuma sessão com essa busca.</p>}
    </div>
  );
}
