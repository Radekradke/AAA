import { useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Ally, Character } from '@/types/character';
import { ABILITY_KEYS } from '@/types/dnd';
import { ABILITY_COLORS, ABILITY_SHORT } from '@/data/skills';
import { getAllyBeast } from '@/data/allyBeasts';
import { ALLY_KINDS, alliesOf, beastsFor, damageText } from '@/engine/allies';
import type { AllyAttack, AllyView } from '@/engine/allies';
import { modStr, roll } from '@/engine/dice';
import type { RollOptions } from '@/engine/dice';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { confirmAction } from '@/store/feedbackStore';
import { tiltHandlers } from '@/lib/tilt';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { MonsterIcon } from '@/components/bestiary/MonsterPortrait';
import { PortraitPicker } from '@/components/character/PortraitPicker';

const KIND_ICON: Record<Ally['kind'], IconName> = { companheiro: 'class-ranger', montaria: 'banner', familiar: 'spark' };
const KINDS = Object.keys(ALLY_KINDS) as Ally['kind'][];

const newAllyId = () => `ally-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Grava o patch num aliado da lista (ou no companheiro da classe). */
function useAllyWriter(char: Character) {
  const edit = useCharacterStore((s) => s.editCharacter);
  return (id: string, patch: Partial<Ally>) => {
    if (id === 'class-companion') {
      const { name, portrait, hpCurrent } = patch;
      edit(char.id, { companion: { ...char.companion, ...(name !== undefined && { name }), ...(portrait !== undefined && { portrait }), ...(hpCurrent !== undefined && { hpCurrent }) } });
      return;
    }
    edit(char.id, { allies: (char.allies ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  };
}

/** Arte do aliado (retrato enviado) ou o emblema de fera. */
function AllyArt({ v, size }: { v: AllyView; size: number }) {
  if (v.portrait) return <img src={v.portrait} alt="" />;
  return (
    <span className="fv-ally-emblem" aria-hidden>
      <MonsterIcon type="beast" size={size} />
    </span>
  );
}

/**
 * Companheiros, montarias e familiares do herói: cada um com a mesma carta
 * da vitrine (foil, reflexo, moldura) e uma ficha curta com ataques roláveis.
 */
export function AlliesSection({ char }: { char: Character }) {
  const allies = alliesOf(char);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ally | 'new' | null>(null);
  const open = allies.find((a) => a.id === openId) ?? null;

  return (
    <section className="fv-allies" aria-label="Companheiros do herói">
      <header className="fv-allies-head">
        <h3>Companheiros</h3>
        <button type="button" className="fv-btn-ghost fv-allies-add" onClick={() => setEditing('new')}>
          <Icon name="levelup" size={14} /> Adicionar
        </button>
      </header>
      {allies.length === 0 ? (
        <p className="fv-allies-empty">Montaria, familiar ou fera fiel: dê a eles uma carta também.</p>
      ) : (
        <ul className="fv-allies-grid">
          {allies.map((v) => (
            <li key={v.id}>
              <button type="button" className={`fv-ally-mini is-${v.kind}`} onClick={() => setOpenId(v.id)} aria-label={`Abrir a carta de ${v.name} (${ALLY_KINDS[v.kind].label})`}>
                <span className="fv-ally-mini-art">
                  <AllyArt v={v} size={38} />
                </span>
                <span className="fv-ally-mini-txt">
                  <small>{ALLY_KINDS[v.kind].label}</small>
                  <b>{v.name}</b>
                  <span className="fv-ally-bar" aria-hidden>
                    <i style={{ width: `${(v.hp / v.hpMax) * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <AllySheet
          char={char}
          v={open}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            const raw = (char.allies ?? []).find((a) => a.id === open.id);
            if (raw) setEditing(raw);
          }}
        />
      )}
      {editing && (
        <AllyEditor
          char={char}
          ally={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setOpenId(id);
          }}
        />
      )}
    </section>
  );
}

/** A carta grande do aliado (mesmos efeitos da carta do herói). */
function AllyCard({ v }: { v: AllyView }) {
  const tilt = tiltHandlers(0.8);
  return (
    <div className={`fv-vitrine-card fv-ally-card is-${v.kind}`} {...tilt}>
      <AllyArt v={v} size={120} />
      <span className="fv-vitrine-foil" aria-hidden />
      <span className="fv-hero-sheen" aria-hidden />
      <span className="fv-vitrine-frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      {v.cr && (
        <span className="fv-vitrine-level" aria-hidden>
          <small>ND</small>
          {v.cr}
        </span>
      )}
      <span className="fv-vitrine-sigil" aria-hidden title={ALLY_KINDS[v.kind].label}>
        <Icon name={KIND_ICON[v.kind]} size={24} />
      </span>
      <span className="fv-vitrine-caption">
        <b>{v.name}</b>
        <span>
          {ALLY_KINDS[v.kind].label}
          {v.base && v.base !== v.name ? ` · ${v.base}` : ''}
        </span>
        {v.size && <small>{v.size}</small>}
      </span>
    </div>
  );
}

/** Ficha do aliado: carta à esquerda, números e ataques à direita. */
function AllySheet({ char, v, onClose, onEdit }: { char: Character; v: AllyView; onClose: () => void; onEdit: () => void }) {
  const write = useAllyWriter(char);
  const edit = useCharacterStore((s) => s.editCharacter);
  const pushRoll = useUiStore((s) => s.pushRoll);
  // rolagem do aliado: entra no histórico da ficha, mas não conta como crítico do herói
  const doRoll = (sides: number, opts: RollOptions) => pushRoll({ ...roll(sides, opts), ally: v.name });
  const setHp = (hp: number) => write(v.id, { hpCurrent: Math.max(0, Math.min(v.hpMax, hp)) });
  const pct = v.hpMax ? v.hp / v.hpMax : 0;

  const remove = async () => {
    const ok = await confirmAction({ title: `Dispensar ${v.name}?`, message: 'A carta e as anotações deste aliado saem da ficha.', confirmLabel: 'Dispensar', danger: true });
    if (!ok) return;
    edit(char.id, { allies: (char.allies ?? []).filter((a) => a.id !== v.id) });
    onClose();
  };

  const attack = (a: AllyAttack) => doRoll(20, { label: `${v.name} · ${a.name}`, modifier: a.toHit });
  const damage = (a: AllyAttack) => doRoll(a.die, { count: a.dice, modifier: a.bonus, label: `${v.name} · dano de ${a.name}`, damage: true });

  return (
    <Modal title={v.name} icon={KIND_ICON[v.kind]} onClose={onClose} maxWidth={880} dismissOnBackdrop>
      <div className="fv-ally-sheet">
        <div className="fv-ally-sheet-card">
          <AllyCard v={v} />
          <PortraitPicker portrait={v.portrait} onChange={(p) => write(v.id, { portrait: p })} />
        </div>

        <div className="fv-ally-sheet-info">
          <p className="fv-ally-line">
            {ALLY_KINDS[v.kind].label}
            {v.base ? ` · ${v.base}` : ' · criatura livre'}
            {v.size ? ` · ${v.size}` : ''}
            {v.cr ? ` · ND ${v.cr}` : ''}
          </p>

          <div className="fv-ally-stats">
            <div>
              <b>{v.ac}</b>
              <span>CA</span>
            </div>
            <div className="fv-ally-hp">
              <div className="fv-ally-hp-row">
                <button type="button" onClick={() => setHp(v.hp - 1)} aria-label={`Menos 1 PV de ${v.name}`}>
                  −
                </button>
                <b className={pct <= 0.25 ? 'is-low' : ''} aria-live="polite" aria-label={`${v.hp} de ${v.hpMax} PV`}>
                  {v.hp}
                  <small>/{v.hpMax}</small>
                </b>
                <button type="button" onClick={() => setHp(v.hp + 1)} aria-label={`Mais 1 PV de ${v.name}`}>
                  +
                </button>
              </div>
              <span className="fv-ally-bar" aria-hidden>
                <i style={{ width: `${pct * 100}%` }} />
              </span>
              <span>PV</span>
            </div>
            <div>
              <b className="fv-ally-speed">{v.speed}</b>
              <span>Desloc.</span>
            </div>
          </div>

          {v.mods && v.abilities && (
            <div className="fv-ally-abils" aria-label="Atributos">
              {ABILITY_KEYS.map((k) => (
                <button key={k} type="button" style={{ '--abil-color': ABILITY_COLORS[k] } as CSSProperties} onClick={() => doRoll(20, { label: `${v.name} · ${ABILITY_SHORT[k]}`, modifier: v.mods![k] })} aria-label={`Teste de ${ABILITY_SHORT[k]} de ${v.name}: ${modStr(v.mods![k])}`}>
                  <span>{ABILITY_SHORT[k]}</span>
                  <b>{v.abilities![k]}</b>
                  <small>{modStr(v.mods![k])}</small>
                </button>
              ))}
            </div>
          )}

          {v.attacks.length > 0 && (
            <section className="fv-vitrine-sec">
              <h3>Ataques</h3>
              <ul className="fv-ally-attacks">
                {v.attacks.map((a) => (
                  <li key={a.name}>
                    <span>
                      <b>{a.name}</b>
                      <small>
                        {damageText(a)} {a.type}
                        {a.note ? ` · ${a.note}` : ''}
                      </small>
                    </span>
                    <button type="button" className="fv-ally-hit" onClick={() => attack(a)} aria-label={`Atacar com ${a.name}: ${modStr(a.toHit)}`}>
                      {modStr(a.toHit)}
                    </button>
                    {a.die > 1 ? (
                      <button type="button" className="fv-ally-dmg" onClick={() => damage(a)} aria-label={`Dano de ${a.name}: ${damageText(a)}`}>
                        {damageText(a)}
                      </button>
                    ) : (
                      <span className="fv-ally-dmg is-flat">{damageText(a)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(v.skills.length > 0 || v.senses) && (
            <p className="fv-ally-note">
              {v.skills.length > 0 && <>Perícias: {v.skills.map((s) => `${s.label} ${modStr(s.bonus)}`).join(' · ')}</>}
              {v.skills.length > 0 && v.senses ? ' · ' : ''}
              {v.senses}
            </p>
          )}

          {v.traits.length > 0 && (
            <ul className="fv-ally-traits">
              {v.traits.map((t, i) => (
                <li key={`${t.name}-${i}`}>
                  <b>{t.name}.</b> {t.desc}
                </li>
              ))}
            </ul>
          )}

          {v.notes.trim() && <p className="fv-ally-notes">{v.notes}</p>}

          <div className="fv-ally-actions">
            {v.fromClass ? (
              <p className="fv-ally-note">Companheiro do Mestre das Feras: nome e fera ficam no painel de Combate.</p>
            ) : (
              <>
                <button type="button" className="fv-btn-ghost" onClick={onEdit}>
                  <Icon name="edit" size={14} /> Editar
                </button>
                <button type="button" className="fv-btn-ghost is-danger" onClick={remove}>
                  <Icon name="close" size={13} /> Dispensar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Rótulo + campo ligados por id (nome acessível limpo). */
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="fv-ally-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

/** Novo aliado / editar: tipo, nome, fera de base (ou livre) e anotações. */
function AllyEditor({ char, ally, onClose, onSaved }: { char: Character; ally: Ally | null; onClose: () => void; onSaved: (id: string) => void }) {
  const edit = useCharacterStore((s) => s.editCharacter);
  const [kind, setKind] = useState<Ally['kind']>(ally?.kind ?? 'montaria');
  const [name, setName] = useState(ally?.name ?? '');
  const [beastId, setBeastId] = useState<string>(ally ? ally.beastId ?? '' : 'ridingHorse');
  const [ac, setAc] = useState(String(ally?.ac ?? ''));
  const [hpMax, setHpMax] = useState(String(ally?.hpMax ?? ''));
  const [speed, setSpeed] = useState(ally?.speed ?? '');
  const [notes, setNotes] = useState(ally?.notes ?? '');
  const [portrait, setPortrait] = useState<string | null>(ally?.portrait ?? null);
  const free = !beastId;
  const base = getAllyBeast(beastId);
  const num = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? Math.max(0, Math.round(Number(s))) : undefined);

  const changeKind = (k: Ally['kind']) => {
    setKind(k);
    // fera ainda na sugestão padrão: troca pela primeira do novo tipo
    if (!ally && ['ridingHorse', 'owl', 'wolf'].includes(beastId)) setBeastId(k === 'montaria' ? 'ridingHorse' : k === 'familiar' ? 'owl' : 'wolf');
  };

  const save = () => {
    const next: Ally = {
      id: ally?.id ?? newAllyId(),
      kind,
      name: name.trim(),
      beastId: beastId || null,
      portrait,
      // trocou a fera: PV voltam ao máximo da nova
      hpCurrent: ally && (ally.beastId ?? null) === (beastId || null) ? ally.hpCurrent : undefined,
      notes: notes.trim() || undefined,
      ...(free ? { ac: num(ac), hpMax: num(hpMax), speed: speed.trim() || undefined } : {}),
    };
    const list = char.allies ?? [];
    edit(char.id, { allies: ally ? list.map((a) => (a.id === ally.id ? next : a)) : [...list, next] });
    onSaved(next.id);
  };

  return (
    <Modal
      title={ally ? `Editar ${ally.name || ALLY_KINDS[ally.kind].label}` : 'Novo companheiro'}
      icon="levelup"
      onClose={onClose}
      maxWidth={560}
      footer={
        <div className="fv-ally-editor-foot">
          <button type="button" className="fv-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="fv-ally-form" className="fv-btn-gold">
            {ally ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      }
    >
      <form
        id="fv-ally-form"
        className="fv-ally-editor"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="fv-seg" role="radiogroup" aria-label="Tipo de aliado">
          {KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'is-on' : ''} onClick={() => changeKind(k)}>
              {ALLY_KINDS[k].label}
            </button>
          ))}
        </div>

        {/* retrato: a arte da carta do aliado (opcional) */}
        <div className="fv-forge-art">
          {portrait ? (
            <span className="fv-ally-editor-art">
              <img src={portrait} alt="" />
            </span>
          ) : (
            <span className="fv-forge-art-empty" aria-hidden>
              <MonsterIcon type="beast" size={26} />
            </span>
          )}
          <div>
            <span className="fv-ally-editor-label">Retrato (opcional)</span>
            <p>A arte da carta {kind === 'montaria' ? 'da montaria' : kind === 'familiar' ? 'do familiar' : 'do companheiro'}. Sem retrato, a carta usa o emblema de fera.</p>
            <PortraitPicker portrait={portrait} onChange={setPortrait} labels={{ add: 'Enviar retrato', change: 'Trocar retrato' }} />
          </div>
        </div>

        <Field label="Nome">{(id) => <input id={id} className="fv-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={base?.label ?? 'Ex.: Relâmpago'} />}</Field>

        <Field label="Criatura de base">
          {(id) => (
            <select id={id} className="fv-input" value={beastId} onChange={(e) => setBeastId(e.target.value)}>
              {beastsFor(kind).map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.beasts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} · ND {b.cr}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="">Livre (sem base — números à mão)</option>
            </select>
          )}
        </Field>

        {base && (
          <p className="fv-ally-note">
            {base.size} · CA {base.ac} · {base.hp} PV · {base.speed}
          </p>
        )}

        {free && (
          <div className="fv-ally-free">
            <Field label="CA">{(id) => <input id={id} className="fv-input" inputMode="numeric" value={ac} onChange={(e) => setAc(e.target.value)} placeholder="10" />}</Field>
            <Field label="PV máx.">{(id) => <input id={id} className="fv-input" inputMode="numeric" value={hpMax} onChange={(e) => setHpMax(e.target.value)} placeholder="10" />}</Field>
            <Field label="Deslocamento">{(id) => <input id={id} className="fv-input" value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder="9 m" />}</Field>
          </div>
        )}

        <Field label="Anotações">{(id) => <textarea id={id} className="fv-input" rows={3} value={notes} maxLength={600} onChange={(e) => setNotes(e.target.value)} placeholder="Personalidade, truques que sabe, de onde veio…" />}</Field>
      </form>
    </Modal>
  );
}
