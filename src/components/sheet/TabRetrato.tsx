import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import type { TabProps } from './tabProps';
import { getSubrace, raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { getSubclass } from '@/data/subclasses';
import { featuresAt } from '@/data/classFeatures';
import { getFeat } from '@/data/feats';
import { getSpell } from '@/data/spells';
import { ABILITY_COLORS, ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { heroAvatar, heroPortraitPosition } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';
import { themedIcon } from '@/components/character/creatorUi';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { tiltHandlers } from '@/lib/tilt';
import { AlliesSection } from './RetratoAllies';
import { JourneySection } from './RetratoJourney';
import { CardsGallery, collectCards } from './RetratoCartas';
import { ItemArtCard } from '@/components/ui/LoreTooltip';
import { RARITY } from '@/data/themes';
import { CARD_TIERS, cardTier, heroTitle } from '@/engine/deeds';
import { CardScars, CardSeals, DeedsSection, ScarsSection, TitlePicker } from './RetratoDeeds';
import '@/styles/retrato.css';

/** Características que só repetem a regra (aparecem como aumentos/talentos). */
const SKIP_FEATURES = new Set(['Aumento de Atributo']);
const SPELLS_SHOWN = 14;

/**
 * Retrato: a aba "de vitrine". A carta do herói em destaque (a mesma da
 * criação — luz da linhagem, sigilo da classe, inclinação e reflexo
 * metálico, agora com folha holográfica) e, ao lado, a ficha em leitura:
 * atributos, números, perícias, características, equipamento, magias e a
 * história. Tocar na arte abre a tela cheia, só a arte.
 */
/**
 * Aba Retrato com submenu: a vitrine do herói e "Suas cartas" (a coleção:
 * herói, companheiros e itens com foto).
 */
export function TabRetrato(props: TabProps) {
  const [view, setView] = useState<'retrato' | 'cartas'>('retrato');
  const count = useMemo(() => collectCards(props.char).length, [props.char]);
  return (
    <div className="fv-retrato">
      <div className="fv-seg fv-retrato-switch" role="tablist" aria-label="Retrato">
        <button type="button" role="tab" aria-selected={view === 'retrato'} className={view === 'retrato' ? 'is-on' : ''} onClick={() => setView('retrato')}>
          <Icon name="image" size={14} /> Retrato
        </button>
        <button type="button" role="tab" aria-selected={view === 'cartas'} className={view === 'cartas' ? 'is-on' : ''} onClick={() => setView('cartas')}>
          <Icon name="crest" size={14} /> Suas cartas <span className="fv-retrato-count">{count}</span>
        </button>
      </div>
      {view === 'retrato' ? <Vitrine {...props} /> : <CardsGallery char={props.char} />}
    </div>
  );
}

function Vitrine({ char, derived }: TabProps) {
  const [zoom, setZoom] = useState(false);
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const subclass = getSubclass(char.subclassId);
  const art = heroAvatar(char);
  const name = char.name.trim() || 'Herói sem nome';
  const origin = sub && race.id !== 'dragonborn' ? sub.label : race.label;
  const tier = cardTier(char.level);
  const title = heroTitle(char);

  const features = useMemo(() => {
    const out: string[] = [];
    const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
    for (const { classId, level } of levels) for (let l = 1; l <= level; l++) out.push(...featuresAt(classId, l));
    if (subclass) for (const [lv, names] of Object.entries(subclass.features)) if (Number(lv) <= char.level) out.push(...names);
    return Array.from(new Set(out.filter((f) => !SKIP_FEATURES.has(f))));
  }, [char.classLevels, char.classId, char.level, subclass]);

  const feats = char.feats.map((id) => getFeat(id)?.label).filter((x): x is string => !!x);
  const skills = derived.skills.filter((s) => s.proficient);
  const equipped = useMemo(() => {
    const uids = Object.values(char.equipped).filter((u): u is string => !!u);
    const held = Array.from(new Set(uids)).map((u) => char.inventory.find((i) => i.uid === u)).filter((i) => !!i);
    // vestidos, partes do corpo, sintonizados e favoritos
    const onHero = (i: (typeof char.inventory)[number]) => i.wear === 'body' || (i.wear === 'worn' && i.worn) || i.attuned || i.favorite;
    const special = char.inventory.filter((i) => onHero(i) && !uids.includes(i.uid));
    return [...held, ...special];
  }, [char.equipped, char.inventory]);
  // relíquias: só os itens com arte viram carta (sem foto, não aparece)
  const relics = useMemo(() => char.inventory.filter((i) => i.image), [char.inventory]);
  const spells = useMemo(() => {
    const ids = Array.from(new Set([...char.preparedSpells, ...(char.classId === 'wizard' ? [] : char.knownSpells ?? [])]));
    return ids
      .map((id) => getSpell(id))
      .filter((s) => !!s)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'));
  }, [char.preparedSpells, char.knownSpells, char.classId]);
  const story = (char.notes ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  // mesma inclinação + reflexo da carta da criação, um pouco mais funda
  const tilt = tiltHandlers();

  const stats: [string, string][] = [
    ['PV', String(derived.maxHp)],
    ['CA', String(derived.ac)],
    ['Iniciativa', modStr(derived.initiative)],
    ['Desloc.', `${String(derived.speed).replace('.', ',')} m`],
    ['Proficiência', modStr(derived.proficiency)],
    ['Percepção passiva', String(derived.passivePerception)],
  ];
  if (derived.spellDC != null) stats.push(['CD de magia', String(derived.spellDC)]);

  return (
    <section className="fv-vitrine" aria-label="Retrato do herói" style={{ '--race-color': race.jewel, '--class-color': cls.jewel } as CSSProperties}>
      <div className="fv-vitrine-stage">
        <button type="button" className={`fv-vitrine-card is-${tier}`} data-tier={tier} {...tilt} onClick={() => setZoom(true)} aria-label={`Ver a arte de ${name} em tela cheia`}>
          <img src={art} alt="" style={{ objectPosition: heroPortraitPosition(char) }} />
          <span className="fv-vitrine-foil" aria-hidden />
          <span className="fv-hero-sheen" aria-hidden />
          <CardScars scars={char.scars} />
          <span className="fv-vitrine-frame" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="fv-vitrine-level" aria-hidden>
            <small>Nível</small>
            {char.level}
            <em>{CARD_TIERS[tier].label}</em>
          </span>
          <span className="fv-vitrine-sigil" aria-hidden title={cls.label}>
            <Icon name={themedIcon('class', cls.id)} size={26} />
          </span>
          <CardSeals char={char} />
          <span className="fv-vitrine-caption">
            <b>{name}</b>
            {title && <em className="fv-vitrine-title">{title}</em>}
            <span>
              {origin} · {cls.label}
            </span>
            {subclass && <small>{subclass.label}</small>}
          </span>
        </button>
        <p className="fv-vitrine-hint">Toque na arte para vê-la em tela cheia</p>
        <AlliesSection char={char} />
      </div>

      <div className="fv-vitrine-info">
        <header className="fv-vitrine-head">
          <span className="fv-vitrine-eyebrow">Retrato do herói</span>
          <h2>{name}</h2>
          {title && <p className="fv-vitrine-titleline">{title}</p>}
          <p className="fv-vitrine-line">
            {origin} · {cls.label} {char.level}
            {subclass ? ` · ${subclass.label}` : ''}
          </p>
          {char.concept.trim() && <blockquote>“{char.concept.trim()}”</blockquote>}
          <ul className="fv-vitrine-tags">
            <li>{bg.label}</li>
            {char.alignment && <li>{char.alignment}</li>}
            {char.age && <li>{/^\d+$/.test(char.age.trim()) ? `${char.age.trim()} anos` : char.age}</li>}
            {derived.darkvision && <li>Visão no escuro {String(derived.darkvision.range).replace('.', ',')} m</li>}
          </ul>
        </header>

        <div className="fv-vitrine-abils" aria-label="Atributos">
          {derived.abilityList.map((a) => (
            <div key={a.key} style={{ '--abil-color': ABILITY_COLORS[a.key] } as CSSProperties} title={ABILITY_LABELS[a.key]}>
              <span>{ABILITY_SHORT[a.key]}</span>
              <b>{a.total}</b>
              <small>{modStr(a.mod)}</small>
            </div>
          ))}
        </div>

        <dl className="fv-vitrine-stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <Section title="Perícias">
          <ul className="fv-vitrine-chips">
            {skills.map((s) => (
              <li key={s.key} className={s.expertise ? 'is-star' : ''}>
                {s.label} <b>{modStr(s.bonus)}</b>
                {s.expertise && <span className="fv-sr-only"> (especialização)</span>}
              </li>
            ))}
          </ul>
        </Section>

        {(features.length > 0 || feats.length > 0) && (
          <Section title="Características">
            <ul className="fv-vitrine-chips is-plain">
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
              {feats.map((f) => (
                <li key={`feat-${f}`} className="is-feat">
                  {f}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {equipped.length > 0 && (
          <Section title="Equipamento">
            <ul className="fv-vitrine-gear">
              {equipped.map((it) => (
                <li key={it.uid}>
                  {it.name}
                  {it.wear === 'body' && <small> · no corpo</small>}
                  {it.wear === 'worn' && it.worn && <small> · vestido</small>}
                  {it.attuned && <small> · sintonizado</small>}
                  {it.rarity && it.rarity !== 'comum' && it.rarity !== 'Comum' && <small> · {(RARITY[it.rarity]?.label ?? it.rarity).toLowerCase()}</small>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {relics.length > 0 && (
          <Section title={`Relíquias · ${relics.length}`}>
            <ul className="fv-relics">
              {relics.map((it) => (
                <li key={it.uid}>
                  <ItemArtCard src={it.image} rarity={it.rarity} />
                  <b>{it.name}</b>
                  <small style={{ color: `color-mix(in srgb, ${(RARITY[it.rarity] ?? RARITY.comum).color}, var(--ink) 30%)` }}>{(RARITY[it.rarity] ?? RARITY.comum).label}</small>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {spells.length > 0 && (
          <Section title={`Magias${derived.spellDC != null ? ` · CD ${derived.spellDC}` : ''}`}>
            <ul className="fv-vitrine-chips is-spells">
              {spells.slice(0, SPELLS_SHOWN).map((s) => (
                <li key={s.id}>
                  <small>{s.level === 0 ? 'T' : `${s.level}º`}</small> {s.name}
                </li>
              ))}
              {spells.length > SPELLS_SHOWN && <li className="is-more">+{spells.length - SPELLS_SHOWN}</li>}
            </ul>
          </Section>
        )}

        <TitlePicker char={char} />
        <DeedsSection char={char} />
        <ScarsSection char={char} />
        <JourneySection char={char} />

        <Section title="Idiomas">
          <p className="fv-vitrine-text">{derived.languages.join(' · ') || '—'}</p>
        </Section>

        {story.length > 0 && (
          <Section title="História">
            <div className="fv-vitrine-story">
              {story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Section>
        )}
      </div>

      {zoom && <ArtLightbox art={art} name={name} line={`${origin} · ${cls.label} ${char.level}`} position={heroPortraitPosition(char)} onClose={() => setZoom(false)} />}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="fv-vitrine-sec">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Tela cheia: só a arte, sem moldura nem números. Esc, ✕ ou toque fecham. */
function ArtLightbox({ art, name, line, position, onClose }: { art: string; name: string; line: string; position: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, true, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <div ref={ref} className="fv-vitrine-zoom" role="dialog" aria-modal="true" aria-label={`Arte de ${name}`} tabIndex={-1} onClick={onClose}>
      <img src={art} alt={`Arte de ${name}`} style={{ objectPosition: position }} />
      <div className="fv-vitrine-zoom-cap">
        <b>{name}</b>
        <span>{line}</span>
      </div>
      <button type="button" className="fv-modal-close fv-vitrine-zoom-x" aria-label="Fechar"
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
