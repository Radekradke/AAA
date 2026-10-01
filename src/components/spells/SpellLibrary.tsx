import { SOURCE_SHORT } from '@/data/contentPacks';
import { useMemo, useState } from 'react';
import type { Spell, SpellTag } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { ABILITY_SHORT } from '@/data/skills';
import { Modal } from '@/components/ui/Modal';

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

/** Biblioteca de magias (estilo app de celular): busca + filtros + cartas detalhadas. */
export function SpellLibrary({ title, spells, selected, onToggle, onClose, actionLabel = 'Adicionar', costOf, blockedAdd, blockReason }: SpellLibraryProps) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [tag, setTag] = useState<SpellTag | null>(null);
  const [flags, setFlags] = useState<{ conc: boolean; ritual: boolean }>({ conc: false, ritual: false });
  const [open, setOpen] = useState<string | null>(null);
  // com regras: por padrão mostra só o que dá para pegar agora (+ o que já tem)
  const [onlyAvailable, setOnlyAvailable] = useState(!!blockReason);
  const sel = new Set(selected);
  const reasonOf = (s: Spell) => (sel.has(s.id) || !blockReason ? null : blockReason(s));

  const levels = useMemo(() => Array.from(new Set(spells.map((s) => s.level))).sort((a, b) => a - b), [spells]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spells.filter((s) => {
      if (level !== null && s.level !== level) return false;
      if (school && s.school !== school) return false;
      if (tag && !(s.tags ?? []).includes(tag)) return false;
      if (flags.conc && !s.concentration) return false;
      if (flags.ritual && !s.ritual) return false;
      if (onlyAvailable && reasonOf(s)) return false;
      if (q && !(s.name.toLowerCase().includes(q) || (s.desc ?? '').toLowerCase().includes(q) || (s.damage?.type ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spells, query, level, school, tag, flags, onlyAvailable, selected, blockReason]);

  const chip = (active: boolean, color = t.gold): React.CSSProperties => ({
    cursor: 'pointer', fontSize: 11.5, fontWeight: 600, minHeight: 30, padding: '5px 11px', borderRadius: 999,
    border: '1px solid ' + (active ? color : t.line), color: active ? color : 'var(--muted)',
    background: active ? hexA(color, 0.12) : 'transparent', whiteSpace: 'nowrap', transition: '.15s',
  });

  return (
    <Modal title={title} icon="spark" onClose={onClose} maxWidth={640}>
      <input className="fv-input" placeholder="Buscar por nome, efeito ou tipo de dano…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 10 }} />

      {/* filtros */}
      <div className="fv-no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 4 }}>
        <button onClick={() => setLevel(null)} style={chip(level === null)}>Todos</button>
        {levels.map((lv) => (
          <button key={lv} onClick={() => setLevel(level === lv ? null : lv)} style={chip(level === lv, t.acc)}>{lv === 0 ? 'Truque' : `${lv}º`}</button>
        ))}
        <span style={{ width: 1, background: t.line, flex: 'none', margin: '0 2px' }} />
        {blockReason && (
          <button onClick={() => setOnlyAvailable((v) => !v)} style={chip(onlyAvailable, t.acc)} title="Mostrar só as magias que você pode pegar agora">
            {onlyAvailable ? '✓ Só disponíveis' : 'Mostrar todas'}
          </button>
        )}
        <button onClick={() => setFlags((f) => ({ ...f, conc: !f.conc }))} style={chip(flags.conc, '#C24DFF')}>Concentração</button>
        <button onClick={() => setFlags((f) => ({ ...f, ritual: !f.ritual }))} style={chip(flags.ritual, '#4FA37A')}>Ritual</button>
      </div>
      <div className="fv-no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
        {(Object.keys(TAG_LABELS) as SpellTag[]).map((tg) => (
          <button key={tg} onClick={() => setTag(tag === tg ? null : tg)} style={chip(tag === tg, TAG_COLOR[tg])}>{TAG_LABELS[tg]}</button>
        ))}
      </div>
      <div className="fv-no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {SCHOOLS.map((sc) => (
          <button key={sc} onClick={() => setSchool(school === sc ? null : sc)} style={chip(school === sc, t.gold)}>{sc}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{list.length} magia(s)</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((sp) => {
          const on = sel.has(sp.id);
          const expanded = open === sp.id;
          return (
            <div key={sp.id} style={{ borderRadius: 12, border: '1px solid ' + (on ? t.gold : t.line), background: on ? hexA(t.gold, 0.06) : 'var(--sunk)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <button onClick={() => setOpen(expanded ? null : sp.id)} style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', minWidth: 0 }}>
                  <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 8, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: sp.level === 0 ? 'var(--muted)' : 'var(--acc)', border: '1px solid var(--line)', background: 'var(--sunk)' }}>
                    {sp.level === 0 ? 'T' : sp.level}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</span>
                    {reasonOf(sp) && <span className="fv-spell-block-reason">🔒 {reasonOf(sp)}</span>}
                    <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                      <MiniChip>{sp.school}</MiniChip>
                      {sp.source && <MiniChip color="var(--acc)">{SOURCE_SHORT[sp.source]}</MiniChip>}
                      {sp.damage && <MiniChip color="#FF6A3D">{sp.damage.dice} {sp.damage.type}</MiniChip>}
                      {sp.heal && <MiniChip color="#3FC56B">cura</MiniChip>}
                      {sp.save && <MiniChip color="#9BB0CC">save {ABILITY_SHORT[sp.save]}</MiniChip>}
                      {sp.area && <MiniChip color="#C24DFF">{sp.area}</MiniChip>}
                      {sp.concentration && <MiniChip color="#C24DFF">conc.</MiniChip>}
                      {sp.ritual && <MiniChip color="#4FA37A">ritual</MiniChip>}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '3px 12px', fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
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
        {list.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '18px 0' }}>
            {onlyAvailable ? 'Nenhuma magia disponível agora (limite atingido ou círculo alto). Toque em "Mostrar todas" para ver o motivo de cada uma.' : 'Nenhuma magia com esses filtros.'}
          </div>
        )}
      </div>
    </Modal>
  );
}

function MiniChip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.02em', padding: '2px 6px', borderRadius: 5, color: color ?? 'var(--muted)', border: '1px solid ' + hexA(color ?? '#8B99B0', 0.4), background: hexA(color ?? '#8B99B0', 0.08), whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}
