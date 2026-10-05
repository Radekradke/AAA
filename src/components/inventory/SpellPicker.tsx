import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { SPELLS } from '@/data/spells';
import { Icon } from '@/components/ui/Icon';

const MAX_SHOWN = 60;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const levelTag = (lv: number) => (lv === 0 ? 'Truque' : `${lv}º círculo`);

/**
 * Escolher uma magia digitando: filtra por nome (sem acento, várias palavras)
 * ou pelo círculo ("3" / "truque"). Setas + Enter escolhem, Esc fecha a lista.
 */
export function SpellPicker({ value, onChange, label = 'Magia', labelStyle }: { value: string; onChange: (id: string) => void; label?: string; labelStyle?: React.CSSProperties }) {
  const id = useId();
  const listId = `${id}-list`;
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<string | null>(null); // null = mostrando a escolhida
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = SPELLS.find((s) => s.id === value);

  const results = useMemo(() => {
    const words = fold(query ?? '').split(/\s+/).filter(Boolean);
    const list = SPELLS.filter((s) => {
      const hay = `${fold(s.name)} ${fold(s.school)} ${s.level === 0 ? 'truque' : `${s.level} ${s.level}º`}`;
      return words.every((w) => hay.includes(w));
    });
    return list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'));
  }, [query]);
  const shown = results.slice(0, MAX_SHOWN);
  const activeId = open && shown[active] ? `${id}-${shown[active].id}` : undefined;

  // setas: a lista rola junto com o item ativo
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const pick = (spellId: string) => {
    onChange(spellId);
    setQuery(null);
    setOpen(false);
  };
  const close = () => {
    setOpen(false);
    setQuery(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (shown.length ? (a + step + shown.length) % shown.length : 0));
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault(); // não envia o formulário do item
      if (shown[active]) pick(shown[active].id);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="fv-spellpick">
      <label htmlFor={id} className="fv-spellpick-label" style={labelStyle}>
        {label}
      </label>
      <div className="fv-spellpick-box">
        <Icon name="search" size={15} />
        <input
          ref={input}
          id={id}
          className="fv-input"
          role="combobox"
          data-esc-list
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          placeholder="Digite o nome da magia ou o círculo (ex.: 3)…"
          value={query ?? selected?.name ?? ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setOpen(true);
          }}
          onBlur={close}
          onKeyDown={onKey}
        />
        {selected && (
          <button
            type="button"
            className="fv-spellpick-clear"
            aria-label={`Tirar a magia ${selected.name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setQuery(null);
              input.current?.focus();
            }}
          >
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
      {selected && !open && (
        <small className="fv-spellpick-meta">
          {levelTag(selected.level)} · {selected.school}
          {selected.castingTime ? ` · ${selected.castingTime}` : ''}
        </small>
      )}
      {open && (
        <ul id={listId} role="listbox" aria-label="Magias" className="fv-spellpick-list">
          {shown.map((s, i) => (
            <li
              key={s.id}
              id={`${id}-${s.id}`}
              role="option"
              aria-selected={s.id === value}
              className={(i === active ? 'is-active' : '') + (s.id === value ? ' is-picked' : '')}
              onMouseDown={(e) => e.preventDefault()} // não tira o foco do campo antes do clique
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s.id)}
            >
              <span className="fv-spellpick-lv">{s.level === 0 ? 'T' : `${s.level}º`}</span>
              <b>{s.name}</b>
              <small>{s.school}</small>
            </li>
          ))}
          {!shown.length && <li className="fv-spellpick-empty">Nenhuma magia com “{query}”.</li>}
          {results.length > MAX_SHOWN && <li className="fv-spellpick-empty">+{results.length - MAX_SHOWN} — continue digitando para filtrar.</li>}
        </ul>
      )}
    </div>
  );
}
