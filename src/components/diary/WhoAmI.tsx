import { useState } from 'react';
import type { Character, Diary } from '@/types/character';
import { diaryOf } from '@/engine/diary';
import { useCharacterStore } from '@/store/characterStore';
import { Modal } from '@/components/ui/Modal';

const FIELDS = [['goal', 'Objetivo atual', 'O que quero conquistar agora?'], ['bond', 'Vínculo', 'Por quem ou pelo que eu me importo?'], ['fear', 'Medo', 'O que temo perder ou enfrentar?'], ['trait', 'Traço', 'Como ajo quando estou sob pressão?'], ['phrase', 'Frase de interpretação', 'Uma frase que me ajuda a entrar no personagem.']] as const;
type Identity = NonNullable<Diary['identity']>;
const EMPTY: Identity = { goal: '', bond: '', fear: '', trait: '', phrase: '' };

export function WhoAmI({ char }: { char: Character }) {
  const [open, setOpen] = useState(false);
  const identity = diaryOf(char).identity;
  return <div className="fv-identity-access"><button type="button" className="fv-btn-ghost" onClick={() => setOpen(true)}>Quem sou eu?</button>{identity?.goal && <small>Objetivo: {identity.goal}</small>}
    {open && <IdentityCard char={char} onClose={() => setOpen(false)} />}
  </div>;
}
function IdentityCard({ char, onClose }: { char: Character; onClose: () => void }) {
  const initial = diaryOf(char).identity;
  const [value, setValue] = useState<Identity>({ ...EMPTY, ...initial });
  const [edit, setEdit] = useState(!initial || !Object.values(initial).some((v) => v.trim()));
  return <Modal title={`Quem sou eu? · ${char.name || 'Meu herói'}`} onClose={onClose} footer={edit ? <button type="button" className="fv-btn-gold" onClick={() => { useCharacterStore.getState().updateDiary(char.id, (d) => { d.identity = value; }); setEdit(false); }}>Salvar cartão</button> : <button type="button" className="fv-btn-ghost" onClick={() => setEdit(true)}>Editar cartão</button>}>
    <div className="fv-experience"><p>Seu lembrete pessoal para interpretar durante a sessão. Fica no diário privado.</p>{FIELDS.map(([key, label, placeholder]) => edit ? <label className="fv-field" key={key}>{label}<textarea className="fv-input" rows={2} maxLength={600} placeholder={placeholder} value={value[key]} onChange={(e) => setValue({ ...value, [key]: e.target.value })} /></label> : <div className="fv-identity-line" key={key}><b>{label}</b><p>{value[key].trim() || 'Ainda não definido.'}</p></div>)}</div>
  </Modal>;
}
