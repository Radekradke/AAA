import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { RACES } from '@/data/races';
import { RACE_PRESETS } from '@/data/racePresets';
import { SKILLS } from '@/data/skills';
import { ABILITY_SHORT } from '@/data/skills';
import { blankRace, blankSubrace, bonusText, customLineage, finalizeRace, validateRace } from '@/engine/homebrew';
import { useHomebrewStore } from '@/store/homebrewStore';
import { useCharacterStore } from '@/store/characterStore';
import { useAuthStore } from '@/store/authStore';
import type { AbilityKey, Race, SkillKey, Subrace } from '@/types/dnd';

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const DAMAGE = ['ácido', 'concussão', 'cortante', 'elétrico', 'energia', 'fogo', 'frio', 'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno'];
const SPEEDS = [6, 7.5, 9, 10.5, 12];
const COLORS = ['#B5651D', '#3E78C8', '#2E9D6E', '#C2483A', '#8E5CC9', '#C9A227', '#2A9CA8', '#B0466E', '#6B7A8F'];
const LANGS = ['Comum', 'Anão', 'Élfico', 'Gigante', 'Gnômico', 'Goblin', 'Halfling', 'Orc', 'Abissal', 'Celestial', 'Dracônico', 'Infernal', 'Primordial', 'Silvestre', 'Subcomum', '1 idioma à escolha'];
const fmt = (n: number) => String(n).replace('.', ',');

/**
 * Formulário de RAÇA HOMEBREW: tudo que o sistema precisa para a raça
 * funcionar na ficha (atributos, deslocamento, visão, idiomas, perícias,
 * resistências e traços). Compara com o Livro do Jogador e avisa — quem
 * decide é o mestre.
 */
export function HomebrewRaceEditor({ race, onClose, onSaved }: { race: Race | null; onClose: () => void; onSaved: (r: Race) => void }) {
  const store = useHomebrewStore();
  const author = useAuthStore((s) => (s.user && !s.user.guest ? s.user.name : undefined));
  const inUse = useCharacterStore((s) => (race ? s.characters.filter((c) => c.raceId === race.id).length : 0));
  const [r, setR] = useState<Race>(() => (race ? { ...race, traitDetails: race.traitDetails ?? race.traits.map((t) => ({ name: t, desc: '' })) } : blankRace()));
  const [lang, setLang] = useState('');
  const warnings = useMemo(() => validateRace(finalizeRace(r)), [r]);
  const blocking = !r.label.trim();
  const total = KEYS.reduce((a, k) => a + (r.abilityBonus[k] ?? 0), 0);

  const set = (patch: Partial<Race>) => setR((c) => ({ ...c, ...patch }));
  const setBonus = (k: AbilityKey, v: number) => set({ abilityBonus: { ...r.abilityBonus, [k]: v || undefined } });
  const toggle = <T,>(list: T[] | undefined, v: T) => (list ?? []).includes(v) ? (list ?? []).filter((x) => x !== v) : [...(list ?? []), v];

  const fromPreset = (p: Race) =>
    setR({
      ...blankRace(),
      ...p,
      id: '',
      homebrew: true,
      traitDetails: (p.traitDetails ?? []).map((t) => ({ ...t })),
      subraces: (p.subraces ?? []).map((sb) => ({ ...sb, id: '', traitDetails: (sb.traitDetails ?? []).map((t) => ({ ...t })) })),
    });

  const fromTemplate = (t: string) => {
    if (t === 'blank') return setR(blankRace());
    if (t === 'tasha') return setR(customLineage());
    const base = RACES.find((x) => x.id === t);
    if (base)
      setR({
        ...blankRace(),
        ...base,
        id: '',
        label: `${base.label} (variante)`,
        homebrew: true,
        traitDetails: base.traits.map((name) => ({ name, desc: '' })),
        size: base.id === 'halfling' || base.id === 'gnome' ? 'Pequeno' : 'Médio',
      });
  };

  const save = () => {
    const done = finalizeRace(r, author);
    store.saveRace(done);
    onSaved(done);
  };

  return (
    <Modal
      title={race ? `Editar ${race.label}` : 'Nova raça homebrew'}
      icon="crest"
      onClose={onClose}
      maxWidth={760}
      footer={
        <div className="fv-npc-editor-foot">
          {race && (
            <button
              type="button"
              className="fv-btn-ghost is-danger"
              onClick={() => {
                if (!window.confirm(inUse ? `Tirar "${race.label}" da sua biblioteca? As ${inUse} ficha(s) que usam continuam funcionando com a cópia delas.` : `Apagar "${race.label}"?`)) return;
                store.removeRace(race.id);
                onClose();
              }}
            >
              Apagar
            </button>
          )}
          {race && inUse > 0 && <span className="fv-hb-note">Salvar atualiza {inUse} ficha(s) que usam esta raça.</span>}
          <button type="button" className="fv-btn-gold" disabled={blocking} onClick={save}>Salvar raça</button>
        </div>
      }
    >
      <div className="fv-hb">
        {!race && (
          <div className="fv-hb-templates" role="group" aria-label="Começar de">
            <span>Começar de</span>
            <button type="button" onClick={() => fromTemplate('blank')}>Do zero</button>
            <button type="button" onClick={() => fromTemplate('tasha')} title="Tasha's Cauldron of Everything — compatível com 2014">Linhagem Personalizada</button>
            <select className="fv-input" defaultValue="" onChange={(e) => e.target.value && fromTemplate(e.target.value)} aria-label="Copiar uma raça do livro">
              <option value="">Copiar raça do livro…</option>
              {RACES.map((x) => <option key={x.id} value={x.id} style={{ color: '#111' }}>{x.label}</option>)}
            </select>
          </div>
        )}

        {!race && (
          <div className="fv-hb-templates is-presets" role="group" aria-label="Raças prontas">
            <span>Prontas</span>
            {RACE_PRESETS.map((p) => (
              <button key={p.id} type="button" className={r.label === p.label ? 'is-on' : ''} onClick={() => fromPreset(p)} title={`${p.source} — ${p.desc}`}>
                {p.label}
                {!!p.subraces?.length && <small> · {p.subraces.length} sub-raças</small>}
              </button>
            ))}
          </div>
        )}
        {r.source && <p className="fv-hb-source">Base oficial: <b>{r.source}</b> — textos resumidos pelo Ficha Viva.</p>}

        <section className="fv-hb-sec">
          <h4>Identidade</h4>
          <div className="fv-hb-row">
            <input className="fv-input fv-hb-name" placeholder="Nome (ex.: Povo da Névoa)" value={r.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} />
            <div className="fv-hb-colors" role="radiogroup" aria-label="Cor da raça">
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={r.jewel === c} aria-label={`Cor ${c}`} className={r.jewel === c ? 'is-on' : ''} style={{ background: c }} onClick={() => set({ jewel: c })} />
              ))}
            </div>
          </div>
          <textarea className="fv-input" rows={2} placeholder="Como é esse povo, de onde vem, o que o move…" value={r.desc} maxLength={600} onChange={(e) => set({ desc: e.target.value })} />
        </section>

        <section className="fv-hb-sec">
          <h4>Aumento de atributo <small className={total > 3 ? 'is-warn' : ''}>{bonusText(r.abilityBonus)} · total +{total}</small></h4>
          <div className="fv-hb-abil">
            {KEYS.map((k) => (
              <div key={k} className="fv-hb-step">
                <span>{ABILITY_SHORT[k]}</span>
                <button type="button" onClick={() => setBonus(k, Math.max(-2, (r.abilityBonus[k] ?? 0) - 1))} aria-label={`Menos ${ABILITY_SHORT[k]}`}>−</button>
                <b>{(r.abilityBonus[k] ?? 0) > 0 ? '+' : ''}{r.abilityBonus[k] ?? 0}</b>
                <button type="button" onClick={() => setBonus(k, Math.min(3, (r.abilityBonus[k] ?? 0) + 1))} aria-label={`Mais ${ABILITY_SHORT[k]}`}>+</button>
              </div>
            ))}
          </div>
          <p className="fv-live-hint">Padrão do livro: +2 em um e +1 em outro (Humano: +1 em todos).</p>
        </section>

        <section className="fv-hb-sec fv-hb-grid">
          <label>Tamanho
            <span className="fv-live-seg">
              {(['Pequeno', 'Médio'] as const).map((sz) => (
                <button key={sz} type="button" className={r.size === sz ? 'is-on' : ''} onClick={() => set({ size: sz })}>{sz}</button>
              ))}
            </span>
          </label>
          <label>Deslocamento
            <span className="fv-live-seg">
              {SPEEDS.map((v) => (
                <button key={v} type="button" className={r.speed === v ? 'is-on' : ''} onClick={() => set({ speed: v })}>{fmt(v)} m</button>
              ))}
            </span>
          </label>
          <label>Visão no escuro
            <span className="fv-live-seg">
              {[0, 18, 36].map((v) => (
                <button key={v} type="button" className={(r.darkvision ?? 0) === v ? 'is-on' : ''} onClick={() => set({ darkvision: v || undefined })}>{v ? `${v} m` : 'não'}</button>
              ))}
            </span>
          </label>
        </section>

        <section className="fv-hb-sec">
          <h4>Idiomas</h4>
          <div className="fv-hb-chips">
            {(r.languages ?? []).map((l) => (
              <button key={l} type="button" className="fv-hb-chip is-on" onClick={() => set({ languages: (r.languages ?? []).filter((x) => x !== l) })} aria-label={`Tirar ${l}`}>{l} ×</button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); if (lang.trim()) set({ languages: [...new Set([...(r.languages ?? []), lang.trim()])] }); setLang(''); }}>
              <input className="fv-input" list="fv-hb-langs" placeholder="+ idioma" value={lang} onChange={(e) => setLang(e.target.value)} maxLength={30} />
              <datalist id="fv-hb-langs">{LANGS.map((l) => <option key={l} value={l} />)}</datalist>
            </form>
          </div>
        </section>

        <section className="fv-hb-sec">
          <h4>Perícias <small>automáticas + livres à escolha do jogador</small></h4>
          <div className="fv-hb-chips">
            {SKILLS.map((sk) => (
              <button key={sk.key} type="button" className={'fv-hb-chip' + ((r.skillProfs ?? []).includes(sk.key) ? ' is-on' : '')} aria-pressed={(r.skillProfs ?? []).includes(sk.key)} onClick={() => set({ skillProfs: toggle<SkillKey>(r.skillProfs, sk.key) })}>
                {sk.label}
              </button>
            ))}
          </div>
          <label className="fv-hb-inline">Perícias livres
            <span className="fv-live-seg">
              {[0, 1, 2].map((n) => (
                <button key={n} type="button" className={(r.extraSkillPicks ?? 0) === n ? 'is-on' : ''} onClick={() => set({ extraSkillPicks: n })}>{n}</button>
              ))}
            </span>
          </label>
        </section>

        <section className="fv-hb-sec">
          <h4>Resistência a dano</h4>
          <div className="fv-hb-chips">
            {DAMAGE.map((d) => (
              <button key={d} type="button" className={'fv-hb-chip' + ((r.resistances ?? []).includes(d) ? ' is-on' : '')} aria-pressed={(r.resistances ?? []).includes(d)} onClick={() => set({ resistances: toggle(r.resistances, d) })}>
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="fv-hb-sec">
          <h4>Traços <small>aparecem na ficha com a descrição</small></h4>
          {(r.traitDetails ?? []).map((t, i) => (
            <div key={i} className="fv-hb-trait">
              <input className="fv-input" placeholder="Nome do traço (ex.: Fôlego Gélido)" value={t.name} maxLength={60} onChange={(e) => set({ traitDetails: (r.traitDetails ?? []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <textarea className="fv-input" rows={2} placeholder="O que ele faz — alcance, usos, recarga, dano…" value={t.desc} maxLength={800} onChange={(e) => set({ traitDetails: (r.traitDetails ?? []).map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
              <button type="button" className="fv-hb-x" onClick={() => set({ traitDetails: (r.traitDetails ?? []).filter((_, j) => j !== i) })} aria-label="Apagar traço">×</button>
            </div>
          ))}
          {(r.traitDetails?.length ?? 0) < 8 && (
            <button type="button" className="fv-btn-ghost" onClick={() => set({ traitDetails: [...(r.traitDetails ?? []), { name: '', desc: '' }] })}>+ Traço</button>
          )}
        </section>

        <section className="fv-hb-sec">
          <h4>Sub-raças <small>opcional — o jogador escolhe uma (ex.: Protetor, Flagelo, Caído)</small></h4>
          {(r.subraces ?? []).map((sb, i) => (
            <SubraceEditor
              key={i}
              sub={sb}
              onChange={(next) => set({ subraces: (r.subraces ?? []).map((x, j) => (j === i ? next : x)) })}
              onRemove={() => set({ subraces: (r.subraces ?? []).filter((_, j) => j !== i) })}
            />
          ))}
          {(r.subraces?.length ?? 0) < 6 && (
            <button type="button" className="fv-btn-ghost" onClick={() => set({ subraces: [...(r.subraces ?? []), blankSubrace()] })}>+ Sub-raça</button>
          )}
        </section>

        {warnings.length > 0 && (
          <ul className="fv-hb-warn" aria-label="Comparação com o Livro do Jogador">
            {warnings.map((w) => <li key={w.text} className={`is-${w.level}`}>{w.text}</li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Uma sub-raça: nome, bônus extra, ajustes e traços próprios. */
function SubraceEditor({ sub, onChange, onRemove }: { sub: Subrace; onChange: (s: Subrace) => void; onRemove: () => void }) {
  const set = (patch: Partial<Subrace>) => onChange({ ...sub, ...patch });
  const bonus = sub.abilityBonus ?? {};
  const setBonus = (k: AbilityKey, v: number) => set({ abilityBonus: { ...bonus, [k]: v || undefined } });
  const traits = sub.traitDetails ?? [];
  return (
    <div className="fv-hb-sub">
      <button type="button" className="fv-hb-x" onClick={onRemove} aria-label="Apagar sub-raça">×</button>
      <input className="fv-input fv-hb-name" placeholder="Nome da sub-raça (ex.: Aasimar Protetor)" value={sub.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} />
      <div className="fv-hb-abil is-mini">
        {KEYS.map((k) => (
          <div key={k} className="fv-hb-step">
            <span>{ABILITY_SHORT[k]}</span>
            <button type="button" onClick={() => setBonus(k, Math.max(-2, (bonus[k] ?? 0) - 1))} aria-label={`Menos ${ABILITY_SHORT[k]} na sub-raça`}>−</button>
            <b>{(bonus[k] ?? 0) > 0 ? '+' : ''}{bonus[k] ?? 0}</b>
            <button type="button" onClick={() => setBonus(k, Math.min(3, (bonus[k] ?? 0) + 1))} aria-label={`Mais ${ABILITY_SHORT[k]} na sub-raça`}>+</button>
          </div>
        ))}
      </div>
      <div className="fv-hb-grid">
        <label>Deslocamento extra
          <span className="fv-live-seg">
            {[0, 1.5, 3].map((v) => (
              <button key={v} type="button" className={(sub.speedBonus ?? 0) === v ? 'is-on' : ''} onClick={() => set({ speedBonus: v || undefined })}>{v ? `+${fmt(v)} m` : '—'}</button>
            ))}
          </span>
        </label>
        <label>Visão no escuro
          <span className="fv-live-seg">
            {[0, 18, 36].map((v) => (
              <button key={v} type="button" className={(sub.darkvision ?? 0) === v ? 'is-on' : ''} onClick={() => set({ darkvision: v || undefined })}>{v ? `${v} m` : 'da raça'}</button>
            ))}
          </span>
        </label>
        <label>Vida extra
          <span className="fv-live-seg">
            {[0, 1].map((v) => (
              <button key={v} type="button" className={(sub.hpPerLevel ?? 0) === v ? 'is-on' : ''} onClick={() => set({ hpPerLevel: v || undefined })}>{v ? '+1 PV/nível' : '—'}</button>
            ))}
          </span>
        </label>
      </div>
      <div className="fv-hb-chips">
        {DAMAGE.map((d) => (
          <button key={d} type="button" className={'fv-hb-chip' + ((sub.resistances ?? []).includes(d) ? ' is-on' : '')} aria-pressed={(sub.resistances ?? []).includes(d)} onClick={() => set({ resistances: (sub.resistances ?? []).includes(d) ? (sub.resistances ?? []).filter((x) => x !== d) : [...(sub.resistances ?? []), d] })}>
            {d}
          </button>
        ))}
      </div>
      {traits.map((t, i) => (
        <div key={i} className="fv-hb-trait">
          <input className="fv-input" placeholder="Traço da sub-raça" value={t.name} maxLength={60} onChange={(e) => set({ traitDetails: traits.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
          <textarea className="fv-input" rows={2} placeholder="O que ele faz…" value={t.desc} maxLength={800} onChange={(e) => set({ traitDetails: traits.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
          <button type="button" className="fv-hb-x" onClick={() => set({ traitDetails: traits.filter((_, j) => j !== i) })} aria-label="Apagar traço">×</button>
        </div>
      ))}
      {traits.length < 5 && (
        <button type="button" className="fv-btn-ghost" onClick={() => set({ traitDetails: [...traits, { name: '', desc: '' }] })}>+ Traço da sub-raça</button>
      )}
    </div>
  );
}
