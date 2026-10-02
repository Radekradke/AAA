import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { npcService } from '@/services/npcService';
import { cloudEnabled } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { CampaignNpc } from '@/types/npc';
import { NpcAvatar } from '@/components/campaign/NpcGallery';
import '@/styles/session.css';

/** NPCs revelados das mesas em que a ficha está (com cópia offline). */
export function useSheetNpcs(sheetId: string): CampaignNpc[] {
  const user = useAuthStore((s) => s.user);
  const [npcs, setNpcs] = useState<CampaignNpc[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`fv-npcs-${sheetId}`) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (!cloudEnabled() || !user || user.guest) return;
    let alive = true;
    void npcService.forSheet(sheetId).then((l) => alive && setNpcs(l));
    return () => {
      alive = false;
    };
  }, [sheetId, user]);
  return npcs;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** NPCs citados num texto: "@Nome" ou o nome escrito por extenso. */
export function mentionedNpcs(texts: string[], npcs: CampaignNpc[]): CampaignNpc[] {
  const all = norm(texts.join('\n'));
  return npcs.filter((n) => {
    const name = norm(n.name.trim());
    if (!name) return false;
    const i = all.indexOf(name);
    if (i < 0) return false;
    // nome inteiro (não pedaço de outra palavra)
    const before = all[i - 1];
    const after = all[i + name.length];
    return (!before || !/[a-z0-9]/.test(before)) && (!after || !/[a-z0-9]/.test(after));
  });
}

/** Palavra começando com @ onde está o cursor (para o autocompletar). */
function atQuery(value: string, caret: number): { start: number; q: string } | null {
  const upto = value.slice(0, caret);
  const m = upto.match(/(^|[\s(])@([^\s@]{0,30})$/);
  return m ? { start: caret - m[2].length - 1, q: m[2] } : null;
}

/**
 * Campo de texto do diário com @: digite "@" e escolha o NPC — o nome entra
 * completo e passa a aparecer nos "Personagens citados" com retrato.
 */
export function MentionField({ value, onChange, npcs, rows, placeholder, className, style, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  npcs: CampaignNpc[];
  rows?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [q, setQ] = useState<{ start: number; q: string } | null>(null);
  const [idx, setIdx] = useState(0);
  // cursor logo depois do nome inserido (aplicado quando o valor novo chega)
  const caretAfter = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caretAfter.current == null || !ref.current) return;
    ref.current.setSelectionRange(caretAfter.current, caretAfter.current);
    caretAfter.current = null;
  }, [value]);
  const options = useMemo(() => {
    if (!q) return [];
    const term = norm(q.q);
    return npcs.filter((n) => norm(n.name).includes(term)).slice(0, 6);
  }, [q, npcs]);

  const update = (v: string, caret: number) => {
    onChange(v);
    setQ(npcs.length ? atQuery(v, caret) : null);
    setIdx(0);
  };
  const pick = (n: CampaignNpc) => {
    if (!q || !ref.current) return;
    const caret = ref.current.selectionStart ?? value.length;
    const next = value.slice(0, q.start) + '@' + n.name + ' ' + value.slice(caret);
    caretAfter.current = q.start + n.name.length + 2;
    onChange(next);
    setQ(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[idx]); }
    else if (e.key === 'Escape') setQ(null);
  };

  const common = {
    ref,
    value,
    placeholder,
    className,
    style,
    'aria-label': ariaLabel,
    onKeyDown: onKey,
    onBlur: () => setTimeout(() => setQ(null), 150),
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update(e.target.value, e.target.selectionStart ?? e.target.value.length),
  };
  return (
    <span className="fv-mention">
      {rows ? <textarea {...common} rows={rows} /> : <input {...common} />}
      {options.length > 0 && (
        <span className="fv-mention-list" role="listbox" aria-label="Citar NPC">
          {options.map((n, i) => (
            <button key={n.id} type="button" role="option" aria-selected={i === idx} className={i === idx ? 'is-on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(n); }}>
              <NpcAvatar npc={n} size={26} />
              <span><b>{n.name}</b>{n.role && <small>{n.role}</small>}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Chip do NPC citado: passa o mouse (ou toca) e aparece o retrato. */
export function NpcMentionChip({ npc }: { npc: CampaignNpc }) {
  return (
    <span className="fv-npc-mention" tabIndex={0}>
      <NpcAvatar npc={npc} size={22} />
      <span>{npc.name}</span>
      <span className="fv-npc-hover" role="tooltip">
        {npc.portrait ? <img src={npc.portrait} alt="" /> : <NpcAvatar npc={npc} size={90} />}
        <b>{npc.name}</b>
        {npc.role && <small>{npc.role}</small>}
        {npc.summary && <p>{npc.summary}</p>}
      </span>
    </span>
  );
}
