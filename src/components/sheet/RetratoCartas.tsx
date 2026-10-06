import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '@/types/character';
import { raceOf, getSubrace } from '@/data/races';
import { getClass } from '@/data/classes';
import { RARITY } from '@/data/themes';
import { CARD_TIERS, cardTier } from '@/engine/deeds';
import { heroTitle } from '@/engine/titles';
import { ALLY_KINDS, alliesOf } from '@/engine/allies';
import { heroAvatar, heroPortraitPosition } from '@/lib/summary';
import { tiltHandlers } from '@/lib/tilt';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { Icon } from '@/components/ui/Icon';

type CardKind = 'heroi' | 'aliado' | 'item';

/** Uma carta da coleção: sempre com arte (sem foto, não entra). */
export interface CollectCard {
  id: string;
  kind: CardKind;
  title: string;
  /** Linha de baixo: tipo · base / raridade. */
  line: string;
  /** Selo de cima (raridade, moldura, tipo). */
  badge: string;
  art: string;
  position?: string;
  /** Cor da moldura. */
  color: string;
  holo: boolean;
}

const TIER_COLOR = { bronze: '#c38a55', prata: '#cfd9e6', ouro: '#e9c46a', lendaria: '#ffb030' } as const;
const ALLY_COLOR = { companheiro: '#6fbf73', montaria: '#e0a54a', familiar: '#a98be0' } as const;
const HOLO_RARITY = new Set(['raro', 'muito-raro', 'lendario']);
const KIND_LABEL: Record<CardKind, string> = { heroi: 'Herói', aliado: 'Companheiros', item: 'Itens' };

/** Todas as cartas do herói: a dele, a dos aliados com retrato e a dos itens com foto. */
export function collectCards(char: Character): CollectCard[] {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const cls = getClass(char.classId);
  const tier = cardTier(char.level);
  const title = heroTitle(char);
  const out: CollectCard[] = [
    {
      id: 'heroi',
      kind: 'heroi',
      title: char.name.trim() || 'Herói sem nome',
      line: [title, `${sub && race.id !== 'dragonborn' ? sub.label : race.label} · ${cls.label} ${char.level}`].filter(Boolean).join(' · '),
      badge: `Moldura ${CARD_TIERS[tier].label}`,
      art: heroAvatar(char),
      position: heroPortraitPosition(char),
      color: TIER_COLOR[tier],
      holo: tier !== 'bronze',
    },
  ];
  for (const a of alliesOf(char)) {
    if (!a.portrait) continue;
    out.push({ id: `aliado-${a.id}`, kind: 'aliado', title: a.name, line: [ALLY_KINDS[a.kind].label, a.base && a.base !== a.name ? a.base : null].filter(Boolean).join(' · '), badge: ALLY_KINDS[a.kind].label, art: a.portrait, color: ALLY_COLOR[a.kind], holo: false });
  }
  for (const it of char.inventory) {
    if (!it.image) continue;
    const r = RARITY[it.rarity] ?? RARITY.comum;
    out.push({ id: `item-${it.uid}`, kind: 'item', title: it.name, line: r.label, badge: r.label, art: it.image, color: r.color, holo: HOLO_RARITY.has(it.rarity) });
  }
  return out;
}

/** A face da carta (galeria e tela cheia): moldura na cor, holográfico nas raras. */
function CardFace({ c, big }: { c: CollectCard; big?: boolean }) {
  const tilt = tiltHandlers(big ? 1 : 0.6);
  return (
    <span className={'fv-cc-card' + (c.holo ? ' is-holo' : '') + (big ? ' is-big' : '')} style={{ '--cc': c.color } as CSSProperties} {...tilt}>
      <img src={c.art} alt="" style={{ objectPosition: c.position }} />
      {c.holo && <span className="fv-cc-foil" aria-hidden />}
      <span className="fv-hero-sheen" aria-hidden />
      <span className="fv-cc-frame" aria-hidden />
      <span className="fv-cc-badge">{c.badge}</span>
      <span className="fv-cc-cap">
        <b>{c.title}</b>
        {c.line && <small>{c.line}</small>}
      </span>
    </span>
  );
}

/** "Suas cartas": a coleção do herói, com filtro por tipo e tela cheia. */
export function CardsGallery({ char }: { char: Character }) {
  const cards = useMemo(() => collectCards(char), [char]);
  const [filter, setFilter] = useState<CardKind | 'todas'>('todas');
  const [open, setOpen] = useState<number | null>(null);
  const kinds = (['heroi', 'aliado', 'item'] as CardKind[]).filter((k) => cards.some((c) => c.kind === k));
  const shown = filter === 'todas' ? cards : cards.filter((c) => c.kind === filter);
  const missing = cards.length < 2;

  return (
    <section className="fv-cc" aria-label="Suas cartas">
      <header className="fv-cc-head">
        <div>
          <span className="fv-vitrine-eyebrow">Coleção</span>
          <h2>Suas cartas · {cards.length}</h2>
        </div>
        {kinds.length > 1 && (
          <div className="fv-seg" role="radiogroup" aria-label="Filtrar cartas">
            {(['todas', ...kinds] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
                {k === 'todas' ? 'Todas' : KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </header>

      <ul className="fv-cc-grid">
        {shown.map((c, i) => (
          <li key={c.id}>
            <button type="button" className="fv-cc-open" onClick={() => setOpen(i)} aria-label={`Ver a carta ${c.title} em tela cheia`}>
              <CardFace c={c} />
            </button>
          </li>
        ))}
      </ul>

      {missing && (
        <p className="fv-cc-hint">
          <Icon name="image" size={15} /> Mais cartas aparecem aqui quando você envia uma foto: no item (inventário ou Forja) ou no retrato de um companheiro ou montaria.
        </p>
      )}

      {open !== null && shown[open] && <CardViewer cards={shown} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Tela cheia: a carta grande, com setas para as outras (← → no teclado). */
function CardViewer({ cards, index, onIndex, onClose }: { cards: CollectCard[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, true, onClose);
  const c = cards[index];
  const many = cards.length > 1;
  const go = (d: number) => onIndex((index + d + cards.length) % cards.length);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      ref={ref}
      className="fv-cc-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Carta: ${c.title}`}
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      <div className="fv-cc-stage" onClick={(e) => e.stopPropagation()}>
        {many && (
          <button type="button" className="fv-cc-nav is-prev" onClick={() => go(-1)} aria-label="Carta anterior">
            ‹
          </button>
        )}
        <CardFace key={c.id} c={c} big />
        {many && (
          <button type="button" className="fv-cc-nav is-next" onClick={() => go(1)} aria-label="Próxima carta">
            ›
          </button>
        )}
      </div>
      {many && (
        <p className="fv-cc-count" aria-live="polite">
          {index + 1} de {cards.length}
        </p>
      )}
      <button
        type="button"
        className="fv-modal-close fv-vitrine-zoom-x"
        aria-label="Fechar"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>,
    document.body,
  );
}
