import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { Mentionable } from '@/engine/diary';
import { norm, splitMentions } from '@/engine/diary';
import { NpcAvatar } from '@/components/campaign/NpcGallery';
import { useDiaryNav } from './DiaryNav';
import '@/styles/session.css';
import '@/styles/diary.css';

/** "@" ou "#" no começo da palavra onde está o cursor. */
function triggerAt(value: string, caret: number): { start: number; q: string; mark: '@' | '#' } | null {
  const upto = value.slice(0, caret);
  const m = upto.match(/(^|[\s(])([@#])([^\s@#]{0,30}(?: [^\s@#]{0,20})?)$/);
  return m ? { start: caret - m[3].length - 1, q: m[3], mark: m[2] as '@' | '#' } : null;
}

const KIND_LABEL: Record<Mentionable['kind'], string> = { npc: 'NPC', hero: 'Herói', place: 'Lugar' };

/**
 * Campo do diário com menções: "@" cita um NPC ou um herói do grupo, "#"
 * marca um lugar (os já usados aparecem como sugestão; um novo é só escrever
 * "#Nome do Lugar"). Enter no rabisco salva (Shift+Enter quebra a linha).
 */
export function MentionInput({ value, onChange, people, places, rows, placeholder, className = 'fv-input', style, ariaLabel, onSubmit, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  people: Mentionable[];
  places: Mentionable[];
  rows?: number;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  /** Enter sem a lista aberta: salva (rabisco). */
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [trig, setTrig] = useState<ReturnType<typeof triggerAt>>(null);
  const [idx, setIdx] = useState(0);
  const caretAfter = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caretAfter.current == null || !ref.current) return;
    ref.current.setSelectionRange(caretAfter.current, caretAfter.current);
    caretAfter.current = null;
  }, [value]);

  const options = useMemo(() => {
    if (!trig) return [];
    const term = norm(trig.q);
    const pool = trig.mark === '@' ? people : places;
    return pool.filter((m) => norm(m.name).includes(term)).slice(0, 7);
  }, [trig, people, places]);

  const update = (v: string, caret: number) => {
    onChange(v);
    setTrig(triggerAt(v, caret));
    setIdx(0);
  };
  const pick = (m: Mentionable) => {
    if (!trig || !ref.current) return;
    const caret = ref.current.selectionStart ?? value.length;
    const next = value.slice(0, trig.start) + trig.mark + m.name + ' ' + value.slice(caret);
    caretAfter.current = trig.start + m.name.length + 2;
    onChange(next);
    setTrig(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (options.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[idx]); return; }
      if (e.key === 'Escape') { setTrig(null); return; }
    }
    if (onSubmit && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const common = {
    ref,
    value,
    placeholder,
    className,
    style,
    autoFocus,
    'aria-label': ariaLabel,
    onKeyDown: onKey,
    onBlur: () => setTimeout(() => setTrig(null), 150),
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update(e.target.value, e.target.selectionStart ?? e.target.value.length),
  };
  return (
    <span className="fv-mention">
      {rows ? <textarea {...common} rows={rows} /> : <input {...common} />}
      {options.length > 0 && (
        <span className="fv-mention-list" role="listbox" aria-label={trig?.mark === '@' ? 'Citar alguém' : 'Marcar lugar'}>
          {options.map((m, i) => (
            <button key={m.key} type="button" role="option" aria-selected={i === idx} className={i === idx ? 'is-on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(m); }}>
              {m.kind === 'place' ? <span className="fv-place-dot" aria-hidden>⌖</span> : <NpcAvatar npc={{ name: m.name, portrait: m.portrait ?? null }} size={26} />}
              <span>
                <b>{m.name}</b>
                <small>{KIND_LABEL[m.kind]}{m.role ? ` · ${m.role}` : ''}</small>
              </span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Chip de quem foi citado: passa o mouse (ou toca) e aparece o retrato. */
export function MentionChip({ who, label }: { who: Mentionable; label?: string }) {
  // dentro do Diário, tocar no nome abre a página da pessoa (tudo o que se sabe dela)
  const nav = useDiaryNav();
  const open = nav
    ? (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        nav.go('people', who.name);
      }
    : undefined;
  return (
    <span
      className={'fv-npc-mention' + (who.kind === 'hero' ? ' is-hero' : '') + (open ? ' is-link' : '')}
      tabIndex={0}
      role={open ? 'link' : undefined}
      aria-label={open ? `Ver ${who.name} em Pessoas` : undefined}
      onClick={open}
      onKeyDown={open ? (e) => (e.key === 'Enter' || e.key === ' ') && open(e) : undefined}
    >
      <NpcAvatar npc={{ name: who.name, portrait: who.portrait ?? null }} size={20} />
      <span>{label ?? who.name}</span>
      <span className="fv-npc-hover" role="tooltip">
        {who.portrait ? <img src={who.portrait} alt="" /> : <NpcAvatar npc={{ name: who.name, portrait: null }} size={90} />}
        <b>{who.name}</b>
        <small>{KIND_LABEL[who.kind]}{who.role ? ` · ${who.role}` : ''}</small>
        {who.summary && <p>{who.summary}</p>}
      </span>
    </span>
  );
}

export function PlaceChip({ name }: { name: string }) {
  return (
    <span className="fv-place-chip">
      <span aria-hidden>⌖</span>
      {name}
    </span>
  );
}

/** Texto do diário com as menções viradas chips (modo leitura). */
export function RichText({ text, people, className }: { text: string; people: Mentionable[]; className?: string }) {
  const nodes: ReactNode[] = splitMentions(text, people).map((p, i) =>
    p.kind === 'text' ? <span key={i}>{p.text}</span> : p.kind === 'mention' ? <MentionChip key={i} who={p.target} label={p.text} /> : <PlaceChip key={i} name={p.text} />,
  );
  return <div className={'fv-rich ' + (className ?? '')}>{nodes}</div>;
}
