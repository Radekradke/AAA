import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StepProps } from './stepTypes';
import type { ChoiceOption, ChoiceSpec } from '@/data/classChoices';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail } from './creatorUi';
import { GiftVisual, optionLook, subclassLook } from './giftLook';
import type { GiftLook } from './giftLook';
import { getClass } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { clearSubclassChoices, creationChoices } from '@/engine/classChoices';
import { STEP_GIFTS, SUBCLASS_TITLE, subclassAtCreation } from '@/engine/creationSummary';
import { revalidateKit } from '@/engine/loadout';

/** Uma decisão do capítulo: a subclasse do 1º nível ou uma escolha de classe/raça. */
interface Decision {
  id: string;
  label: string;
  source: string;
  hint?: string;
  total: number;
  chosen: string[];
  options: { id: string; label: string; look: GiftLook }[];
  spec?: ChoiceSpec;
}

/** Tela estreita (celular/tablet em pé): o detalhe vira uma gaveta que sobe de baixo. */
function useNarrow(query = '(max-width: 899px)'): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

function decisionsOf(char: StepProps['char']): Decision[] {
  const cls = getClass(char.classId);
  const out: Decision[] = [];
  if (subclassAtCreation(char)) {
    out.push({
      id: 'subclass',
      label: SUBCLASS_TITLE[char.classId] ?? 'Subclasse',
      source: cls.label,
      hint: 'A grande escolha do 1º nível: dá poderes e magias agora e define o que vem nos níveis seguintes.',
      total: 1,
      chosen: char.subclassId ? [char.subclassId] : [],
      options: subclassesFor(char.classId).map((s) => ({ id: s.id, label: s.label, look: subclassLook(s) })),
    });
  }
  for (const c of creationChoices(char)) {
    out.push({
      id: c.spec.storeKey,
      label: c.spec.label,
      source: c.spec.source,
      hint: c.spec.hint,
      total: c.total,
      chosen: c.chosen,
      options: c.options.map((o: ChoiceOption) => ({ id: o.id, label: o.label, look: optionLook(c.spec, o) })),
      spec: c.spec,
    });
  }
  return out;
}

/**
 * Capítulo III — Dons: as escolhas do 1º nível (subclasse do Clérigo,
 * Feiticeiro e Bruxo, Estilo de Luta, Inimigo Favorito, instrumentos,
 * ferramenta do Anão…). Uma decisão por vez: a trilha no topo mostra o que
 * falta, os cartões mostram as opções e o painel diz o que cada uma coloca
 * na ficha. Passar o mouse mostra sem escolher; escolher avança sozinho.
 */
export function StepGifts({ char, update }: StepProps) {
  const cls = getClass(char.classId);
  const decisions = useMemo(() => decisionsOf(char), [char]);
  const firstOpen = decisions.find((d) => d.chosen.length < d.total)?.id ?? decisions[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(firstOpen);
  const [preview, setPreview] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [advance, setAdvance] = useState(false);
  const narrow = useNarrow();
  const [sheet, setSheet] = useState(false);
  const active = decisions.find((d) => d.id === activeId) ?? decisions.find((d) => d.id === firstOpen) ?? decisions[0];

  // terminou uma decisão: segue para a próxima que falta (as novas do domínio aparecem na hora)
  useEffect(() => {
    if (!advance) return;
    const t = setTimeout(() => {
      const next = decisions.find((d) => d.chosen.length < d.total);
      if (next) {
        setActiveId(next.id);
        setFocus(null);
      }
      setAdvance(false);
    }, 450);
    return () => clearTimeout(t);
  }, [advance, decisions]);

  // gaveta aberta: Esc fecha
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  if (!active) {
    return (
      <div className="fv-step">
        <StepHeader step={STEP_GIFTS} char={char} />
        <p className="fv-step-note">Nada a decidir aqui para o {cls.label} — siga em frente.</p>
      </div>
    );
  }

  const choose = (d: Decision, id: string) => {
    const was = d.chosen.length;
    setFocus(id);
    if (d.id === 'subclass') {
      if (char.subclassId === id) return;
      update((c) => {
        clearSubclassChoices(c);
        c.subclassId = id;
        // domínio sem armadura pesada/armas marciais: o kit volta ao que ele pode usar
        revalidateKit(c);
      });
      if (!was) setAdvance(true);
      return;
    }
    const on = d.chosen.includes(id);
    update((c) => {
      const cur = c.choices?.[d.id] ?? [];
      const next = on ? cur.filter((x) => x !== id) : d.total === 1 ? [id] : [...cur, id].slice(-d.total);
      c.choices = { ...(c.choices ?? {}), [d.id]: next };
    });
    if (!on && was + 1 === d.total) setAdvance(true);
  };

  const shownId = preview ?? (focus && active.options.some((o) => o.id === focus) ? focus : null) ?? active.chosen[active.chosen.length - 1] ?? active.options[0]?.id;
  const shown = active.options.find((o) => o.id === shownId) ?? active.options[0];
  const isOn = active.chosen.includes(shown.id);
  const done = active.chosen.length >= active.total;
  const color = (look: GiftLook) => look.color ?? cls.jewel;

  const detail = (
    <ChoiceDetail
      icon={shown.look.icon}
      visual={shown.look.art || shown.look.school ? <GiftVisual look={shown.look} size={40} /> : undefined}
      color={color(shown.look)}
      eyebrow={`${active.label} · ${active.source}`}
      title={shown.label}
      tag={isOn ? 'Escolhido' : undefined}
      desc={shown.look.desc}
      facts={shown.look.facts}
      factsTitle="O que entra na ficha"
    >
      <div className="fv-gift-cta">
        <button
          type="button"
          className={isOn ? 'fv-btn-ghost' : 'fv-btn-gold'}
          disabled={isOn && active.total === 1}
          onClick={() => {
            choose(active, shown.id);
            setSheet(false);
          }}
        >
          {isOn ? (active.id === 'subclass' || active.total === 1 ? '✓ Escolhido' : 'Tirar da escolha') : done && active.total > 1 ? `Trocar por ${shown.label}` : `Escolher ${shown.label}`}
        </button>
      </div>
    </ChoiceDetail>
  );

  return (
    <div className="fv-step fv-gifts">
      <StepHeader step={STEP_GIFTS} char={char} subtitle={`O que torna o seu ${cls.label} único já no 1º nível.`} />

      {/* trilha das decisões: uma por vez, com o que falta */}
      <nav className="fv-gift-track" aria-label="Decisões do 1º nível">
        {decisions.map((d, i) => {
          const ok = d.chosen.length >= d.total;
          const names = d.options.filter((o) => d.chosen.includes(o.id)).map((o) => o.label);
          return (
            <button
              key={d.id}
              type="button"
              aria-current={d.id === active.id ? 'step' : undefined}
              className={'fv-gift-stop' + (d.id === active.id ? ' is-current' : '') + (ok ? ' is-done' : '')}
              onClick={() => {
                setActiveId(d.id);
                setFocus(null);
                setPreview(null);
              }}
            >
              <span className="fv-gift-mark" aria-hidden>{ok ? '✓' : i + 1}</span>
              <span className="fv-gift-stop-text">
                <b>{d.label}</b>
                <small>{ok ? names.join(', ') : d.total > 1 ? `${d.chosen.length} de ${d.total}` : d.source}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="fv-gift-brief">
        <span className="fv-gift-count">{active.total > 1 ? `Escolha ${active.total} · ${active.chosen.length} de ${active.total}` : 'Escolha 1'}</span>
        {active.hint && <p>{active.hint}</p>}
      </div>

      <div className="fv-choice">
        <OptionGrid label={active.label}>
          {active.options.map((o) => (
            <OptionTile
              key={o.id}
              icon={o.look.icon}
              visual={o.look.art || o.look.school ? <GiftVisual look={o.look} size={26} /> : undefined}
              label={o.label}
              line={o.look.line}
              color={color(o.look)}
              selected={active.chosen.includes(o.id)}
              onSelect={() => {
                if (!narrow) return choose(active, o.id);
                // celular: primeiro mostra o que a opção faz, a escolha é no botão da gaveta
                setFocus(o.id);
                setSheet(true);
              }}
              onPreview={narrow ? undefined : (v) => setPreview(v ? o.id : null)}
            />
          ))}
        </OptionGrid>

        {!narrow && detail}
      </div>

      {narrow &&
        sheet &&
        createPortal(
          <div className="fv-gift-sheet fv-gifts" role="dialog" aria-modal="true" aria-label={shown.label} onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
            <div className="fv-gift-sheet-panel">
              <button type="button" className="fv-gift-sheet-close" aria-label="Fechar" onClick={() => setSheet(false)}>
                ✕
              </button>
              {detail}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
