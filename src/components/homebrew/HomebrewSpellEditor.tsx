import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/store/feedbackStore';
import { useHomebrewStore } from '@/store/homebrewStore';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { getClass } from '@/data/classes';
import { ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import { blankSpell, CASTER_CLASSES, finalizeSpell, upcastText, validateSpell } from '@/engine/homebrewContent';
import { upcastDice } from '@/engine/spellCast';
import { AUTOMATION_KIND_LABEL, AUTOMATION_LEVEL_LABEL, spellAutomation } from '@/engine/spellAutomation';
import type { AbilityKey, CasterClass, Spell } from '@/types/dnd';
import '@/styles/session.css';

const SCHOOLS = ['Abjuração', 'Adivinhação', 'Conjuração', 'Encantamento', 'Evocação', 'Ilusão', 'Necromancia', 'Transmutação'];
const DAMAGE = ['ácido', 'concussão', 'cortante', 'elétrico', 'energia', 'fogo', 'frio', 'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno'];
const TIMES = ['1 ação', '1 ação bônus', 'Reação', '1 minuto', '10 minutos'];
const RANGES = ['Pessoal', 'Toque', '9 m', '18 m', '36 m', '45 m', '90 m'];
const DURATIONS = ['Instantânea', '1 rodada', 'Concentração, até 1 min', 'Concentração, até 10 min', 'Concentração, até 1 hora', '1 hora', '8 horas'];
type Effect = 'none' | 'attack' | 'save';

/** Dados por círculo guardados à parte do texto livre de "círculos superiores". */
const splitHigher = (sp: Spell) => {
  const up = upcastDice(sp);
  const auto = up && sp.higher?.startsWith(`+${up.n}d${up.d} de dano por círculo acima`) ? `${up.n}d${up.d}` : '';
  const rest = auto ? (sp.higher ?? '').replace(/^[^.]*\.\s*/, '') : sp.higher ?? '';
  return { upDice: auto, extra: rest };
};

/**
 * Formulário de MAGIA HOMEBREW: o que a ficha precisa para conjurar de
 * verdade (espaço, ataque ou salvaguarda, dano/cura e aumento por círculo).
 * Compara o dano com a tabela do Guia do Mestre e avisa; quem decide é o mestre.
 */
export function HomebrewSpellEditor({ spell, defaultClass, onClose, onSaved }: { spell: Spell | null; defaultClass?: string; onClose: () => void; onSaved?: (s: Spell) => void }) {
  const store = useHomebrewStore();
  const author = useAuthStore((s) => (s.user && !s.user.guest ? s.user.name : undefined));
  const inUse = useCharacterStore((s) => (spell ? s.characters.filter((c) => c.customSpells?.some((x) => x.id === spell.id)).length : 0));
  const [sp, setSp] = useState<Spell>(() => spell ?? { ...blankSpell(author), classes: CASTER_CLASSES.includes(defaultClass as CasterClass) ? [defaultClass as CasterClass] : [] });
  const [effect, setEffect] = useState<Effect>(spell?.attack ? 'attack' : spell?.save ? 'save' : 'none');
  const initial = useMemo(() => splitHigher(sp), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [upDice, setUpDice] = useState(initial.upDice);
  const [extraHigher, setExtraHigher] = useState(initial.extra);

  const set = (patch: Partial<Spell>) => setSp((c) => ({ ...c, ...patch }));
  const comps = (sp.components ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const toggleComp = (c: string) => {
    const next = comps.includes(c) ? comps.filter((x) => x !== c) : [...comps, c];
    set({ components: ['V', 'S', 'M'].filter((x) => next.includes(x)).join(', ') });
  };

  const draft = useMemo(() => {
    const higher = [upDice.trim() && sp.level > 0 ? upcastText(sp.level, upDice) : '', extraHigher.trim()].filter(Boolean).join(' ');
    return finalizeSpell(
      {
        ...sp,
        attack: effect === 'attack' ? sp.attack ?? 'ranged' : undefined,
        save: effect === 'save' ? sp.save ?? 'dex' : undefined,
        higher,
        concentration: sp.concentration || /concentra/i.test(sp.duration ?? ''),
      },
      author,
    );
  }, [sp, effect, upDice, extraHigher, author]);
  const warnings = useMemo(() => validateSpell(draft), [draft]);
  const blocking = warnings.some((w) => w.level === 'error');
  const auto = useMemo(() => spellAutomation(draft), [draft]);

  const save = () => {
    store.saveSpell(draft);
    onSaved?.(draft);
    onClose();
  };

  return (
    <Modal
      title={spell ? `Editar ${spell.name}` : 'Nova magia homebrew'}
      icon="spark"
      onClose={onClose}
      maxWidth={760}
      footer={
        <div className="fv-npc-editor-foot">
          {spell && (
            <button
              type="button"
              className="fv-btn-ghost is-danger"
              onClick={async () => {
                const ok = await confirmAction(
                  inUse
                    ? { title: `Tirar "${spell.name}" da biblioteca?`, message: `As ${inUse} ficha(s) que conhecem a magia continuam com a cópia delas.`, confirmLabel: 'Tirar', danger: true }
                    : { title: `Apagar "${spell.name}"?`, confirmLabel: 'Apagar', danger: true },
                );
                if (!ok) return;
                store.removeSpell(spell.id);
                onClose();
              }}
            >
              Apagar
            </button>
          )}
          {spell && inUse > 0 && <span className="fv-hb-note">Salvar atualiza {inUse} ficha(s) que usam esta magia.</span>}
          <button type="button" className="fv-btn-gold" disabled={blocking} onClick={save}>Salvar magia</button>
        </div>
      }
    >
      <div className="fv-hb">
        <section className="fv-hb-sec">
          <h4>Identidade</h4>
          <div className="fv-hb-row">
            <input className="fv-input fv-hb-name" aria-label="Nome da magia" placeholder="Nome (ex.: Lança de Brasas)" value={sp.name} maxLength={48} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="fv-hb-inline">Círculo
            <span className="fv-live-seg" role="radiogroup" aria-label="Círculo">
              {Array.from({ length: 10 }, (_, lv) => (
                <button key={lv} type="button" role="radio" aria-checked={sp.level === lv} className={sp.level === lv ? 'is-on' : ''} onClick={() => set({ level: lv })}>{lv === 0 ? 'Truque' : `${lv}º`}</button>
              ))}
            </span>
          </div>
          <div className="fv-hb-grid">
            <label>Escola
              <select className="fv-input" value={sp.school} onChange={(e) => set({ school: e.target.value })}>
                {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="fv-hb-chips" role="group" aria-label="Classes que têm a magia">
            {CASTER_CLASSES.map((c) => {
              const on = (sp.classes ?? []).includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} className={`fv-hb-chip${on ? ' is-on' : ''}`} onClick={() => set({ classes: on ? (sp.classes ?? []).filter((x) => x !== c) : [...(sp.classes ?? []), c] })}>
                  {getClass(c).label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="fv-hb-sec fv-hb-grid">
          <label>Tempo
            <input className="fv-input" list="fv-hbs-times" value={sp.castingTime ?? ''} onChange={(e) => set({ castingTime: e.target.value })} />
          </label>
          <label>Alcance
            <input className="fv-input" list="fv-hbs-ranges" value={sp.range ?? ''} onChange={(e) => set({ range: e.target.value })} />
          </label>
          <label>Duração
            <input className="fv-input" list="fv-hbs-durations" value={sp.duration ?? ''} onChange={(e) => set({ duration: e.target.value })} />
          </label>
          <label>Componentes
            <span className="fv-live-seg">
              {['V', 'S', 'M'].map((c) => (
                <button key={c} type="button" aria-pressed={comps.includes(c)} className={comps.includes(c) ? 'is-on' : ''} onClick={() => toggleComp(c)}>{c}</button>
              ))}
            </span>
          </label>
          {comps.includes('M') && (
            <label>Material
              <input className="fv-input" value={sp.material ?? ''} maxLength={120} placeholder="ex.: uma pitada de enxofre" onChange={(e) => set({ material: e.target.value })} />
            </label>
          )}
          <label className="fv-hb-check"><input type="checkbox" checked={!!sp.concentration || /concentra/i.test(sp.duration ?? '')} onChange={(e) => set({ concentration: e.target.checked })} /> Concentração</label>
          <label className="fv-hb-check"><input type="checkbox" checked={!!sp.ritual} onChange={(e) => set({ ritual: e.target.checked })} /> Ritual</label>
          <datalist id="fv-hbs-times">{TIMES.map((x) => <option key={x} value={x} />)}</datalist>
          <datalist id="fv-hbs-ranges">{RANGES.map((x) => <option key={x} value={x} />)}</datalist>
          <datalist id="fv-hbs-durations">{DURATIONS.map((x) => <option key={x} value={x} />)}</datalist>
        </section>

        <section className="fv-hb-sec">
          <h4>O que a ficha resolve</h4>
          <div className="fv-hb-grid">
            <label>Como acerta
              <span className="fv-live-seg" role="radiogroup" aria-label="Como acerta">
                {([['none', 'Automático'], ['attack', 'Ataque de magia'], ['save', 'Salvaguarda']] as const).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={effect === k} className={effect === k ? 'is-on' : ''} onClick={() => setEffect(k)}>{l}</button>
                ))}
              </span>
            </label>
            {effect === 'attack' && (
              <label>Alcance do ataque
                <span className="fv-live-seg">
                  {([['melee', 'Corpo a corpo'], ['ranged', 'À distância']] as const).map(([k, l]) => (
                    <button key={k} type="button" className={(sp.attack ?? 'ranged') === k ? 'is-on' : ''} onClick={() => set({ attack: k })}>{l}</button>
                  ))}
                </span>
              </label>
            )}
            {effect === 'save' && (
              <label>Salvaguarda de
                <select className="fv-input" aria-label="Atributo da salvaguarda" value={sp.save ?? 'dex'} onChange={(e) => set({ save: e.target.value as AbilityKey })}>
                  {ABILITY_KEYS.map((k) => <option key={k} value={k}>{ABILITY_SHORT[k]}</option>)}
                </select>
              </label>
            )}
            <label>Dano
              <span className="fv-hb-pair">
                <input className="fv-input" aria-label="Dados de dano" placeholder="ex.: 3d8" value={sp.damage?.dice ?? ''} maxLength={24} onChange={(e) => set({ damage: { dice: e.target.value, type: sp.damage?.type ?? 'fogo' } })} />
                <select className="fv-input" aria-label="Tipo de dano" value={sp.damage?.type ?? 'fogo'} onChange={(e) => set({ damage: { dice: sp.damage?.dice ?? '', type: e.target.value } })}>
                  {DAMAGE.map((d) => <option key={d}>{d}</option>)}
                </select>
              </span>
            </label>
            <label>Cura
              <input className="fv-input" aria-label="Dados de cura" placeholder="ex.: 2d8 + mod." value={sp.heal ?? ''} maxLength={24} onChange={(e) => set({ heal: e.target.value })} />
            </label>
            <label>Área
              <input className="fv-input" placeholder="ex.: esfera de 6 m" value={sp.area ?? ''} maxLength={40} onChange={(e) => set({ area: e.target.value })} />
            </label>
            {sp.level > 0 && (
              <label>Dados extras por círculo acima
                <input className="fv-input" aria-label="Dados extras por círculo" placeholder="ex.: 1d8" value={upDice} maxLength={8} onChange={(e) => setUpDice(e.target.value)} />
              </label>
            )}
          </div>
          <p className="fv-live-hint">Escreva “+ mod.” na cura (ou no dano) para somar o atributo de conjuração.</p>
        </section>

        <section className="fv-hb-sec">
          <h4>Descrição</h4>
          <textarea className="fv-input" rows={3} aria-label="Descrição da magia" placeholder="O que acontece, em quem, por quanto tempo…" value={sp.desc ?? ''} maxLength={1200} onChange={(e) => set({ desc: e.target.value })} />
          <input className="fv-input" aria-label="Círculos superiores (texto)" placeholder="Círculos superiores: outros efeitos (opcional)" value={extraHigher} maxLength={300} onChange={(e) => setExtraHigher(e.target.value)} />
        </section>

        <section className="fv-hb-sec">
          <h4>Na mesa <small>{AUTOMATION_LEVEL_LABEL[auto.level]}</small></h4>
          <ul className="fv-hb-auto">
            {auto.lines.filter((l) => !l.generic).map((l) => (
              <li key={l.text}><b>{AUTOMATION_KIND_LABEL[l.kind]}:</b> {l.text}</li>
            ))}
            {!auto.lines.some((l) => !l.generic) && <li>Só desconta o espaço; o efeito fica com a mesa.</li>}
          </ul>
        </section>

        {warnings.length > 0 && (
          <ul className="fv-hb-warn" aria-label="Comparação com o padrão do livro">
            {warnings.map((w) => <li key={w.text} className={`is-${w.level}`}>{w.text}</li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}
