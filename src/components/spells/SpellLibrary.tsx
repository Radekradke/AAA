import { SOURCE_SHORT } from '@/data/contentPacks';
import { useMemo, useState } from 'react';
import type { Spell, SpellTag } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { ABILITY_SHORT } from '@/data/skills';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useInk } from '@/lib/contrast';
import { SchoolIcon } from '@/components/ui/RuleIcon';
import { SpellThumb } from './SpellThumb';
import { AUTOMATION_CHIP, spellAutomation } from '@/engine/spellAutomation';

interface SpellLibraryProps {
  title: string;
  /** Pool de magias já filtrado (lista da classe, grimório, ou tudo). */
  spells: Spell[];
  /** Ids já selecionados (conhecidas/preparadas). */
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  /** Texto do botão de ação por magia. */
  actionLabel?: string;
  /** Custo em ouro para aprender (mostra chip "X po" nas não-selecionadas). */
  costOf?: (s: Spell) => number | undefined;
  /** Bloqueia adicionar (ex.: sem ouro) — desabilita o botão +. */
  blockedAdd?: (s: Spell) => boolean;
  /** Motivo pelo qual NÃO pode adicionar (regras); null = pode. */
  blockReason?: (s: Spell) => string | null;
}

const SCHOOLS = ['Abjuração', 'Adivinhação', 'Conjuração', 'Encantamento', 'Evocação', 'Ilusão', 'Necromancia', 'Transmutação'];
const TAG_LABELS: Record<SpellTag, string> = {
  dano: 'Dano', cura: 'Cura', controle: 'Controle', utilidade: 'Utilidade',
  buff: 'Buff', debuff: 'Debuff', invocação: 'Invocação', movimento: 'Movimento', defesa: 'Defesa',
};
const TAG_COLOR: Record<SpellTag, string> = {
  dano: '#FF6A3D', cura: '#3FC56B', controle: '#C24DFF', utilidade: '#8B99B0',
  buff: '#E0A93E', debuff: '#B43A5E', invocação: '#4FA37A', movimento: '#46C8FF', defesa: '#9BB0CC',
};

type View = 'available' | 'chosen' | 'all';
const circleLabel = (lv: number) => (lv === 0 ? 'Truques' : `${lv}º círculo`);

/**
 * Biblioteca de magias: busca + círculo sempre à mão; efeito, escola e
 * propriedades num painel "Filtros" que dobra. Os filtros ligados viram
 * etiquetas removíveis, e a lista vem separada por círculo.
 */
export function SpellLibrary({ title, spells, selected, onToggle, onClose, actionLabel = 'Adicionar', costOf, blockedAdd, blockReason }: SpellLibraryProps) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [tag, setTag] = useState<SpellTag | null>(null);
  const [flags, setFlags] = useState<{ conc: boolean; ritual: boolean }>({ conc: false, ritual: false });
  const [panel, setPanel] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // com regras: por padrão mostra só o que dá para pegar agora (+ o que já tem)
  const [view, setView] = useState<View>(blockReason ? 'available' : 'all');
  const sel = new Set(selected);
  const reasonOf = (s: Spell) => (sel.has(s.id) || !blockReason ? null : blockReason(s));

  const levels = useMemo(() => Array.from(new Set(spells.map((s) => s.level))).sort((a, b) => a - b), [spells]);

  // tudo menos a aba (Disponíveis/Escolhidas/Todas), para contar cada aba
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spells.filter((s) => {
      if (level !== null && s.level !== level) return false;
      if (school && s.school !== school) return false;
      if (tag && !(s.tags ?? []).includes(tag)) return false;
      if (flags.conc && !s.concentration) return false;
      if (flags.ritual && !s.ritual) return false;
      if (q && !(s.name.toLowerCase().includes(q) || (s.desc ?? '').toLowerCase().includes(q) || (s.damage?.type ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [spells, query, level, school, tag, flags]);

  const counts = useMemo(
    () => ({
      available: filtered.filter((s) => !reasonOf(s)).length,
      chosen: filtered.filter((s) => sel.has(s.id)).length,
      all: filtered.length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, selected, blockReason],
  );
  const list = view === 'all' ? filtered : filtered.filter((s) => (view === 'chosen' ? sel.has(s.id) : !reasonOf(s)));
  const groups = levels.map((lv) => ({ lv, spells: list.filter((s) => s.level === lv) })).filter((g) => g.spells.length);

  // filtros do painel que estão ligados, como etiquetas removíveis
  const active: { key: string; label: React.ReactNode; clear: () => void }[] = [];
  if (tag) active.push({ key: 'tag', label: TAG_LABELS[tag], clear: () => setTag(null) });
  if (school) active.push({ key: 'school', label: school, clear: () => setSchool(null) });
  if (flags.conc) active.push({ key: 'conc', label: 'Concentração', clear: () => setFlags((f) => ({ ...f, conc: false })) });
  if (flags.ritual) active.push({ key: 'ritual', label: 'Ritual', clear: () => setFlags((f) => ({ ...f, ritual: false })) });
  const clearAll = () => {
    setTag(null);
    setSchool(null);
    setFlags({ conc: false, ritual: false });
    setLevel(null);
    setQuery('');
  };

  const views: { id: View; label: string }[] = blockReason
    ? [
        { id: 'available', label: 'Disponíveis' },
        { id: 'chosen', label: 'Escolhidas' },
        { id: 'all', label: 'Todas' },
      ]
    : [
        { id: 'all', label: 'Todas' },
        { id: 'chosen', label: 'Escolhidas' },
      ];

  return (
    <Modal title={title} icon="spark" onClose={onClose} maxWidth={640}>
      <div className="fv-lib-bar">
        <div className="fv-lib-searchrow">
          <label className="fv-lib-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Buscar por nome, efeito ou dano…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar magia" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                ✕
              </button>
            )}
          </label>
          <button type="button" className={'fv-lib-filterbtn' + (panel || active.length ? ' is-on' : '')} onClick={() => setPanel((v) => !v)} aria-expanded={panel} aria-controls="fv-lib-panel">
            <span aria-hidden>☰</span> Filtros{active.length > 0 && <b>{active.length}</b>}
          </button>
        </div>

        <div className="fv-lib-views" role="group" aria-label="Mostrar">
          {views.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} className={view === v.id ? 'is-on' : ''} onClick={() => setView(v.id)}>
              {v.label} <span>{counts[v.id]}</span>
            </button>
          ))}
        </div>

        <div className="fv-lib-circles" role="group" aria-label="Círculo">
          <button type="button" aria-pressed={level === null} className={level === null ? 'is-on' : ''} onClick={() => setLevel(null)}>
            Todos
          </button>
          {levels.map((lv) => (
            <button key={lv} type="button" aria-pressed={level === lv} aria-label={circleLabel(lv)} title={circleLabel(lv)} className={level === lv ? 'is-on' : ''} onClick={() => setLevel(level === lv ? null : lv)}>
              {lv === 0 ? 'T' : lv}
            </button>
          ))}
        </div>

        {panel && (
          <div id="fv-lib-panel" className="fv-lib-panel">
            <FilterGroup label="Efeito">
              {(Object.keys(TAG_LABELS) as SpellTag[]).map((tg) => (
                <button key={tg} type="button" aria-pressed={tag === tg} className={tag === tg ? 'is-on' : ''} style={{ '--c': TAG_COLOR[tg] } as React.CSSProperties} onClick={() => setTag(tag === tg ? null : tg)}>
                  <i aria-hidden />
                  {TAG_LABELS[tg]}
                </button>
              ))}
            </FilterGroup>
            <FilterGroup label="Escola">
              {SCHOOLS.map((sc) => (
                <button key={sc} type="button" aria-pressed={school === sc} className={school === sc ? 'is-on' : ''} style={{ '--c': t.gold } as React.CSSProperties} onClick={() => setSchool(school === sc ? null : sc)}>
                  <SchoolIcon school={sc} size={13} />
                  {sc}
                </button>
              ))}
            </FilterGroup>
            <FilterGroup label="Propriedades">
              <button type="button" aria-pressed={flags.conc} className={flags.conc ? 'is-on' : ''} style={{ '--c': '#C24DFF' } as React.CSSProperties} onClick={() => setFlags((f) => ({ ...f, conc: !f.conc }))}>
                ◎ Concentração
              </button>
              <button type="button" aria-pressed={flags.ritual} className={flags.ritual ? 'is-on' : ''} style={{ '--c': '#4FA37A' } as React.CSSProperties} onClick={() => setFlags((f) => ({ ...f, ritual: !f.ritual }))}>
                ❖ Ritual
              </button>
            </FilterGroup>
          </div>
        )}

        {active.length > 0 && (
          <div className="fv-lib-active">
            {active.map((a) => (
              <button key={a.key} type="button" onClick={a.clear} aria-label={`Tirar filtro ${typeof a.label === 'string' ? a.label : ''}`}>
                {a.label} <span aria-hidden>✕</span>
              </button>
            ))}
            <button type="button" className="fv-lib-clear" onClick={clearAll}>
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.lv} className="fv-lib-group" aria-label={circleLabel(g.lv)}>
          {level === null && (
            <h3 className="fv-lib-group-head">
              {circleLabel(g.lv)} <span>{g.spells.length}</span>
            </h3>
          )}
          <div className="fv-lib-list">
        {g.spells.map((sp) => {
          const on = sel.has(sp.id);
          const expanded = open === sp.id;
          return (
            <div key={sp.id} className={'fv-lib-row' + (reasonOf(sp) ? ' is-locked' : '')} style={{ borderRadius: 12, border: '1px solid ' + (on ? t.gold : t.line), background: on ? hexA(t.gold, 0.06) : 'var(--sunk)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <button onClick={() => setOpen(expanded ? null : sp.id)} aria-expanded={expanded} style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', minWidth: 0 }}>
                  <SpellThumb spell={sp} size={34} showLevel />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</span>
                    {reasonOf(sp) && <span className="fv-spell-block-reason">🔒 {reasonOf(sp)}</span>}
                    <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                      <MiniChip>
                        <SchoolIcon school={sp.school} size={10} />
                        {sp.school}
                      </MiniChip>
                      {sp.source && <MiniChip color="var(--acc)">{SOURCE_SHORT[sp.source]}</MiniChip>}
                      {sp.damage && <MiniChip color="#FF6A3D">{sp.damage.dice} {sp.damage.type}</MiniChip>}
                      {sp.heal && <MiniChip color="#3FC56B">cura</MiniChip>}
                      {sp.save && <MiniChip color="#9BB0CC">save {ABILITY_SHORT[sp.save]}</MiniChip>}
                      {sp.area && <MiniChip color="#C24DFF">{sp.area}</MiniChip>}
                      {sp.concentration && <MiniChip color="#C24DFF">conc.</MiniChip>}
                      {sp.ritual && <MiniChip color="#4FA37A">ritual</MiniChip>}
                      <AutoChip sp={sp} />
                      {!on && costOf && costOf(sp) !== undefined && <MiniChip color="#FFE08A">{costOf(sp)} po</MiniChip>}
                    </span>
                  </span>
                </button>
                {(() => {
                  const reason = reasonOf(sp);
                  const blocked = (!on && !!blockedAdd && blockedAdd(sp)) || !!reason;
                  return (
                    <button
                      onClick={() => { if (!blocked) onToggle(sp.id); }}
                      disabled={blocked}
                      title={on ? 'Remover' : reason ?? (blocked ? 'Ouro insuficiente' : actionLabel)}
                      aria-label={`${on ? 'Remover' : actionLabel} ${sp.name}`}
                      style={{ cursor: blocked ? 'not-allowed' : 'pointer', flex: 'none', minHeight: 34, padding: '5px 12px', borderRadius: 999, border: '1px solid ' + (on ? t.gold : blocked ? t.line : t.acc), color: on ? t.gold : blocked ? 'var(--muted)' : t.acc, background: on ? hexA(t.gold, 0.14) : blocked ? 'transparent' : 'var(--lift)', opacity: blocked ? 0.5 : 1, fontWeight: 700, fontSize: 12.5 }}
                    >
                      {on ? '✓' : '+'}
                    </button>
                  );
                })()}
              </div>
              {expanded && (
                <div style={{ padding: '0 12px 12px 52px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {sp.desc && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink)' }}>{sp.desc}</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '3px 12px', fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-num)' }}>
                    {sp.castingTime && <span>⏱ {sp.castingTime}</span>}
                    {sp.range && <span>◎ {sp.range}</span>}
                    {sp.duration && <span>⧗ {sp.duration}</span>}
                    {sp.components && <span>✶ {sp.components}</span>}
                    {sp.conditions?.length ? <span>☠ {sp.conditions.join(', ')}</span> : null}
                  </div>
                  {sp.higher && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--acc)' }}>Círculos superiores: {sp.higher}</p>}
                </div>
              )}
            </div>
          );
        })}
          </div>
        </section>
      ))}
      {list.length === 0 && (
        <div className="fv-lib-empty">
          {view === 'available' && counts.all > 0 ? (
            <>
              Nada disponível agora com esses filtros (limite atingido ou círculo alto).{' '}
              <button type="button" onClick={() => setView('all')}>
                Ver todas e o motivo
              </button>
            </>
          ) : view === 'chosen' && counts.all > 0 ? (
            'Nenhuma escolhida com esses filtros.'
          ) : (
            <>
              Nenhuma magia com esses filtros.{' '}
              <button type="button" onClick={clearAll}>
                Limpar filtros
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fv-lib-fgroup" role="group" aria-label={label}>
      <span className="fv-lib-flabel">{label}</span>
      <div className="fv-lib-fchips">{children}</div>
    </div>
  );
}

function MiniChip({ children, color }: { children: React.ReactNode; color?: string }) {
  const ink = useInk();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '.02em', padding: '2px 6px', borderRadius: 5, color: color ? ink(color) : 'var(--muted)', border: '1px solid ' + hexA(color ?? '#8B99B0', 0.4), background: hexA(color ?? '#8B99B0', 0.08), whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

/** Quanto da magia a ficha resolve (detalhe completo na dica). */
function AutoChip({ sp }: { sp: Spell }) {
  const level = spellAutomation(sp).level;
  // totalmente automática não precisa de aviso: só as que ainda pedem algo da mesa
  if (level === 'full') return null;
  const chip = AUTOMATION_CHIP[level];
  return (
    <span title={chip.title}>
      <MiniChip color={chip.color}>{chip.text}</MiniChip>
    </span>
  );
}
