import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CLASSES } from '@/data/classes';
import { QUICK_STYLES, quickHero, type QuickStyle } from '@/engine/quickHero';
import { firstActions } from '@/engine/creationConcepts';
import { useCharacterStore } from '@/store/characterStore';
import '@/styles/session.css';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/**
 * Herói rápido para one-shot: escolha o nível e, se quiser, a classe ou o
 * estilo. Sai uma ficha válida pelas regras (escolhas, níveis e magias
 * prontas); "Sortear de novo" troca o herói.
 */
export function QuickHeroModal({ ownerId, onClose, onOpen }: { ownerId: string; onClose: () => void; onOpen: (id: string) => void }) {
  const [level, setLevel] = useState(3);
  const [classId, setClassId] = useState('');
  const [style, setStyle] = useState<QuickStyle | ''>('');
  const [seed, setSeed] = useState(newSeed);
  const hero = useMemo(() => quickHero(ownerId, { level, classId: classId || undefined, style: style || undefined, seed }), [ownerId, level, classId, style, seed]);
  const s = hero.summary;

  const create = () => {
    const res = useCharacterStore.getState().importCharacter(JSON.stringify(hero.char), ownerId);
    if (res.ok && res.id) onOpen(res.id);
  };

  return (
    <Modal
      title="Herói rápido"
      icon="d20"
      onClose={onClose}
      maxWidth={620}
      footer={
        <div className="fv-ddb-foot">
          <button type="button" className="fv-btn-ghost" onClick={() => setSeed(newSeed())}>Sortear de novo</button>
          <button type="button" className="fv-btn-gold" onClick={create}>Criar herói</button>
        </div>
      }
    >
      <div className="fv-quick">
        <div className="fv-quick-opts">
          <label>Nível
            <select className="fv-input" aria-label="Nível do herói" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}º</option>)}
            </select>
          </label>
          <label>Classe
            <select className="fv-input" aria-label="Classe do herói" value={classId} onChange={(e) => { setClassId(e.target.value); if (e.target.value) setStyle(''); }}>
              <option value="">Qualquer</option>
              {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          {!classId && (
            <div className="fv-quick-style">
              <span>Estilo</span>
              <span className="fv-live-seg" role="radiogroup" aria-label="Estilo do herói">
                <button type="button" role="radio" aria-checked={!style} className={!style ? 'is-on' : ''} onClick={() => setStyle('')}>Qualquer</button>
                {QUICK_STYLES.map((st) => (
                  <button key={st.id} type="button" role="radio" aria-checked={style === st.id} className={style === st.id ? 'is-on' : ''} onClick={() => setStyle(st.id)}>{st.label}</button>
                ))}
              </span>
            </div>
          )}
        </div>

        <article className="fv-quick-card" aria-label="Herói sorteado">
          <header>
            <h3>{s.name}</h3>
            <p>{s.race} · {s.className}{s.subclass ? ` (${s.subclass})` : ''} · nível {s.level}</p>
          </header>
          <dl className="fv-ddb-sum">
            <div><dt>PV</dt><dd>{s.hp}</dd></div>
            <div><dt>CA</dt><dd>{s.ac}</dd></div>
            {s.attack && <div><dt>Ataque</dt><dd>{s.attack}</dd></div>}
          </dl>
          {s.spells.length > 0 && <p className="fv-quick-spells"><b>Magias de destaque:</b> {s.spells.join(', ')}</p>}
          <ul className="fv-quick-actions">
            {firstActions(hero.char.classId).map((a) => <li key={a.title}><b>{a.title}.</b> {a.text}</li>)}
          </ul>
        </article>
        <p className="fv-live-hint">Tudo pelas regras: perícias, idiomas, escolhas de classe, níveis (como na aba Evoluir) e magias até o limite. Dá para mudar o que quiser depois, na ficha.</p>
      </div>
    </Modal>
  );
}
