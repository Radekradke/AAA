import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/store/feedbackStore';
import { useHomebrewStore } from '@/store/homebrewStore';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import { blankFeat, finalizeFeat, validateFeat } from '@/engine/homebrewContent';
import type { Feat } from '@/types/dnd';
import '@/styles/session.css';

const DAMAGE = ['ácido', 'concussão', 'cortante', 'elétrico', 'energia', 'fogo', 'frio', 'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno'];

/**
 * Formulário de TALENTO HOMEBREW: os bônus que a ficha soma sozinha (PV,
 * deslocamento, iniciativa, Percepção passiva, resistências, +1 em atributo)
 * e um uso por descanso que vira recurso. O resto fica descrito para a mesa.
 */
export function HomebrewFeatEditor({ feat, onClose, onSaved }: { feat: Feat | null; onClose: () => void; onSaved?: (f: Feat) => void }) {
  const store = useHomebrewStore();
  const author = useAuthStore((s) => (s.user && !s.user.guest ? s.user.name : undefined));
  const inUse = useCharacterStore((s) => (feat ? s.characters.filter((c) => c.feats.includes(feat.id)).length : 0));
  const [f, setF] = useState<Feat>(() => feat ?? blankFeat(author));
  const set = (patch: Partial<Feat>) => setF((c) => ({ ...c, ...patch }));
  const draft = useMemo(() => finalizeFeat(f, author), [f, author]);
  const warnings = useMemo(() => validateFeat(draft), [draft]);
  const blocking = warnings.some((w) => w.level === 'error');

  const seg = <T extends number>(label: string, value: T | undefined, options: T[], fmt: (v: T) => string, on: (v: T) => void) => (
    <label>{label}
      <span className="fv-live-seg" role="radiogroup" aria-label={label}>
        {options.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={(value ?? 0) === v} className={(value ?? 0) === v ? 'is-on' : ''} onClick={() => on(v)}>{fmt(v)}</button>
        ))}
      </span>
    </label>
  );

  const save = () => {
    store.saveFeat(draft);
    onSaved?.(draft);
    onClose();
  };

  return (
    <Modal
      title={feat ? `Editar ${feat.label}` : 'Novo talento homebrew'}
      icon="crest"
      onClose={onClose}
      maxWidth={720}
      footer={
        <div className="fv-npc-editor-foot">
          {feat && (
            <button
              type="button"
              className="fv-btn-ghost is-danger"
              onClick={async () => {
                const ok = await confirmAction(
                  inUse
                    ? { title: `Tirar "${feat.label}" da biblioteca?`, message: `As ${inUse} ficha(s) com o talento continuam com a cópia delas.`, confirmLabel: 'Tirar', danger: true }
                    : { title: `Apagar "${feat.label}"?`, confirmLabel: 'Apagar', danger: true },
                );
                if (!ok) return;
                store.removeFeat(feat.id);
                onClose();
              }}
            >
              Apagar
            </button>
          )}
          {feat && inUse > 0 && <span className="fv-hb-note">Salvar atualiza {inUse} ficha(s) com este talento.</span>}
          <button type="button" className="fv-btn-gold" disabled={blocking} onClick={save}>Salvar talento</button>
        </div>
      }
    >
      <div className="fv-hb">
        <section className="fv-hb-sec">
          <h4>Identidade</h4>
          <div className="fv-hb-row">
            <input className="fv-input fv-hb-name" aria-label="Nome do talento" placeholder="Nome (ex.: Sangue de Tempestade)" value={f.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} />
          </div>
          <textarea className="fv-input" rows={3} aria-label="Descrição do talento" placeholder="O que o talento faz na mesa…" value={f.desc} maxLength={900} onChange={(e) => set({ desc: e.target.value })} />
          <input className="fv-input" aria-label="Pré-requisito" placeholder="Pré-requisito (opcional, ex.: Força 13)" value={f.prereq ?? ''} maxLength={60} onChange={(e) => set({ prereq: e.target.value })} />
        </section>

        <section className="fv-hb-sec">
          <h4>+1 em atributo <small>meio-talento: o jogador escolhe um destes</small></h4>
          <div className="fv-hb-chips" role="group" aria-label="+1 em atributo">
            {ABILITY_KEYS.map((k) => {
              const on = (f.abilityChoice ?? []).includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} className={`fv-hb-chip${on ? ' is-on' : ''}`} onClick={() => set({ abilityChoice: on ? (f.abilityChoice ?? []).filter((x) => x !== k) : [...(f.abilityChoice ?? []), k] })}>
                  {ABILITY_SHORT[k]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="fv-hb-sec">
          <h4>Bônus que a ficha soma</h4>
          <div className="fv-hb-grid">
            {seg('PV por nível', f.hpPerLevel, [0, 1, 2], (v) => (v ? `+${v}` : 'não'), (v) => set({ hpPerLevel: v }))}
            {seg('Deslocamento', f.speedBonus, [0, 1.5, 3], (v) => (v ? `+${String(v).replace('.', ',')} m` : 'não'), (v) => set({ speedBonus: v }))}
            {seg('Iniciativa', f.initiativeBonus, [0, 1, 2, 5], (v) => (v ? `+${v}` : 'não'), (v) => set({ initiativeBonus: v }))}
            {seg('Percepção passiva', f.passivePerceptionBonus, [0, 5], (v) => (v ? `+${v}` : 'não'), (v) => set({ passivePerceptionBonus: v }))}
          </div>
          <div className="fv-hb-chips" role="group" aria-label="Resistências">
            <span className="fv-hb-note">Resistência a</span>
            {DAMAGE.map((d) => {
              const on = (f.resistances ?? []).includes(d);
              return (
                <button key={d} type="button" aria-pressed={on} className={`fv-hb-chip${on ? ' is-on' : ''}`} onClick={() => set({ resistances: on ? (f.resistances ?? []).filter((x) => x !== d) : [...(f.resistances ?? []), d] })}>
                  {d}
                </button>
              );
            })}
          </div>
        </section>

        <section className="fv-hb-sec">
          <h4>Uso por descanso <small>vira um contador na ficha</small></h4>
          <div className="fv-hb-grid">
            <label>Nome do uso
              <input className="fv-input" aria-label="Nome do uso" placeholder="ex.: Rugido (deixe vazio se não tiver)" value={f.uses?.label ?? ''} maxLength={40} onChange={(e) => set({ uses: { id: f.uses?.id ?? '', label: e.target.value, desc: f.uses?.desc ?? '', recharge: f.uses?.recharge ?? 'long', max: f.uses?.max ?? 1 } })} />
            </label>
            {f.uses?.label.trim() && (
              <>
                {seg('Vezes', f.uses.max, [1, 2, 3], String, (v) => set({ uses: { ...f.uses!, max: v } }))}
                <label>Volta no
                  <span className="fv-live-seg">
                    {(['short', 'long'] as const).map((r) => (
                      <button key={r} type="button" className={f.uses!.recharge === r ? 'is-on' : ''} onClick={() => set({ uses: { ...f.uses!, recharge: r } })}>{r === 'short' ? 'descanso curto' : 'descanso longo'}</button>
                    ))}
                  </span>
                </label>
              </>
            )}
          </div>
        </section>

        <section className="fv-hb-sec">
          <h4>Notas para a mesa</h4>
          <textarea className="fv-input" rows={2} aria-label="Notas" placeholder="Regras especiais que a ficha não automatiza (opcional)" value={f.notes ?? ''} maxLength={600} onChange={(e) => set({ notes: e.target.value })} />
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
