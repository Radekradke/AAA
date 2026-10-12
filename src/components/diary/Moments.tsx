import { useState } from 'react';
import type { Character, Diary } from '@/types/character';
import { diaryOf, norm } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { confirmAction } from '@/store/feedbackStore';
import { Modal } from '@/components/ui/Modal';

type Moment = NonNullable<Diary['moments']>[number];
export function RememberMoment({ char, rollId, title }: { char: Character; rollId: string; title: string }) {
  const [editing, setEditing] = useState<Moment | null>(null);
  const saved = diaryOf(char).moments?.find((m) => m.rollId === rollId);
  return <><button type="button" className="fv-link-btn" aria-label={saved ? `Editar momento: ${title}` : `Marcar como memorável: ${title}`} onClick={() => setEditing(saved ? structuredClone(saved) : { id: crypto.randomUUID(), at: Date.now(), title, text: '', rollId, sessionId: char.journal[0]?.id })}>{saved ? '★' : '☆'}</button>{editing && <MomentEditor char={char} initial={editing} onClose={() => setEditing(null)} />}</>;
}
export function Moments({ char, sessionId, query = '' }: { char: Character; sessionId?: string; query?: string }) {
  const [editing, setEditing] = useState<Moment | null>(null);
  const moments = (diaryOf(char).moments ?? []).filter((m) => (!sessionId || m.sessionId === sessionId) && (!query.trim() || norm(`${m.title} ${m.text}`).includes(norm(query))));
  return <section className="fv-experience" aria-label="Momentos memoráveis"><div className="fv-experience-actions"><h3>Momentos memoráveis</h3><button type="button" className="fv-link-btn" onClick={() => setEditing({ id: crypto.randomUUID(), title: '', text: '', at: Date.now(), sessionId })}>+ Guardar momento</button></div>
    {!moments.length && <p>Guarde uma cena aqui ou marque uma rolagem com ☆ no histórico.</p>}
    {moments.map((m) => <article className="fv-effect-card" key={m.id}><b>★ {m.title}</b><p style={{ whiteSpace: 'pre-wrap' }}>{m.text || 'Sem frase do jogador.'}</p><small>{new Date(m.at).toLocaleDateString('pt-BR')} · {char.journal.find((s) => s.id === m.sessionId)?.title || 'Sem sessão vinculada'}</small><div className="fv-experience-actions"><button type="button" className="fv-link-btn" onClick={() => setEditing(structuredClone(m))}>Editar</button><button type="button" className="fv-link-btn" onClick={async () => { if (await confirmAction({ title: 'Apagar este momento?', message: m.title, confirmLabel: 'Apagar' })) useCharacterStore.getState().updateDiary(char.id, (d) => { d.moments = d.moments?.filter((x) => x.id !== m.id); }); }}>Apagar</button></div></article>)}
    {editing && <MomentEditor char={char} initial={editing} onClose={() => setEditing(null)} />}
  </section>;
}
function MomentEditor({ char, initial, onClose }: { char: Character; initial: Moment; onClose: () => void }) {
  const [value, setValue] = useState(initial);
  return <Modal title="Guardar momento memorável" onClose={onClose} footer={<button type="button" className="fv-btn-gold" disabled={!value.title.trim()} onClick={() => { useCharacterStore.getState().updateDiary(char.id, (d) => { d.moments = [value, ...(d.moments ?? []).filter((m) => m.id !== value.id && (!value.rollId || m.rollId !== value.rollId))]; }); onClose(); }}>Salvar momento</button>}><div className="fv-experience">
    <label className="fv-field">Acontecimento<input className="fv-input" maxLength={200} value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} /></label>
    <label className="fv-field">Sua frase<textarea className="fv-input" rows={4} maxLength={2000} placeholder="O que tornou esse momento especial para você?" value={value.text} onChange={(e) => setValue({ ...value, text: e.target.value })} /></label>
    <label className="fv-field">Sessão<select className="fv-input" value={value.sessionId ?? ''} onChange={(e) => setValue({ ...value, sessionId: e.target.value || undefined })}><option value="">Sem sessão vinculada</option>{char.journal.map((s) => <option key={s.id} value={s.id}>{s.title || s.date || 'Sessão'}</option>)}</select></label>
    <p>Você pode criar uma sessão na Crônica e vincular o momento depois.</p>
  </div></Modal>;
}
