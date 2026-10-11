import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import type { StepProps } from './stepTypes';
import { racePickers, RaceExtras } from './StepRace';
import { GlyphIcon, raceIconKey } from './RaceIcon';
import { HomebrewRaceEditor } from './HomebrewRaceEditor';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { videoWorthIt } from '@/components/animations/BackgroundScene';
import { passiveLore } from '@/lib/lore';
import { RACES, getSubraces, raceOf } from '@/data/races';
import { raceStageMedia } from '@/data/raceStage';
import { raceFacts, raceTraitFacts } from '@/engine/creationSummary';
import { useHomebrewStore } from '@/store/homebrewStore';
import { useUiStore } from '@/store/uiStore';
import type { Race } from '@/types/dnd';

/**
 * Palco das Origens (Configurações → Avançado): a cena da raça escolhida em
 * tela cheia, com a personagem à esquerda. Troca com fusão ao mudar de raça.
 * Sem vídeo (celular, economia, raça sem arquivo): a imagem parada ou o brasão.
 */
export function RaceStageBackdrop({ race }: { race: Race }) {
  const pref = useUiStore((s) => s.bgVideo);
  const media = raceStageMedia(race.id);
  const play = !!media.video && videoWorthIt(pref);
  return (
    <div className="fv-stage-backdrop" aria-hidden>
      <AnimatePresence initial={false}>
        <m.div
          key={race.id}
          className="fv-stage-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          {play ? (
            <video src={media.video} poster={media.poster} muted loop autoPlay playsInline preload="auto" />
          ) : media.poster ? (
            <img src={media.poster} alt="" decoding="async" />
          ) : (
            <div className="fv-stage-sigil" style={{ ['--jewel' as string]: race.jewel }}>
              <GlyphIcon name={raceIconKey(race)} size={180} />
              <small>{media.video ? '' : 'cena da raça em produção'}</small>
            </div>
          )}
        </m.div>
      </AnimatePresence>
      <div className="fv-stage-scrim" />
    </div>
  );
}

/** Capítulo I no palco: a ficha da raça no lado livre e os brasões na borda. */
export function StepRaceStage({ char, update }: StepProps) {
  const race = raceOf(char);
  const subs = getSubraces(char.raceId);
  const homebrew = useHomebrewStore((s) => s.races);
  const [editing, setEditing] = useState<Race | 'new' | null>(null);
  const { pickRace, pickHomebrew } = racePickers(update);
  const sub = subs.find((x) => x.id === char.subraceId);
  const roster: Array<{ r: Race; pick: () => void }> = [
    ...RACES.map((r) => ({ r, pick: () => pickRace(r.id) })),
    ...homebrew.map((r) => ({ r, pick: () => pickHomebrew(r) })),
  ];

  return (
    <div className="fv-stage">
      <section className="fv-stage-info" aria-live="polite" aria-label={`Linhagem: ${race.label}`}>
        <span className="fv-stage-eyebrow">{race.homebrew ? 'Linhagem homebrew' : 'Escolha sua origem'}</span>
        <h1 className="fv-stage-title">{race.label}</h1>
        {sub && <span className="fv-stage-sub">{sub.label}</span>}
        <p className="fv-stage-desc">{race.desc || 'Sem descrição.'}</p>
        <div className="fv-stage-chips">
          {raceFacts(char).map((f) => (
            <span key={f.label} className={'fv-stage-chip' + (f.label === 'Atributos' ? ' is-gold' : '')}>
              {f.label === 'Atributos' ? f.value : `${f.label}: ${f.value}`}
            </span>
          ))}
        </div>
        <ul className="fv-stage-traits">
          {raceTraitFacts(char).map((f) => (
            <li key={f.label}>
              <LoreTooltip info={passiveLore(f.label, sub?.label ?? race.label, f.value, ['Traço racial'])}>
                <span>{f.label}</span>
              </LoreTooltip>
            </li>
          ))}
        </ul>
        <RaceExtras char={char} update={update} />
        {race.homebrew && (
          <button type="button" className="fv-btn-ghost fv-hb-edit" onClick={() => setEditing(race)}>Editar raça</button>
        )}
      </section>

      <nav className="fv-stage-roster" aria-label="Linhagens">
        {roster.map(({ r, pick }) => {
          const poster = raceStageMedia(r.id).poster;
          const on = char.raceId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              className={'fv-stage-medal' + (on ? ' is-on' : '')}
              aria-pressed={on}
              aria-label={r.label}
              title={r.label}
              onClick={pick}
              style={{ ['--jewel' as string]: r.jewel }}
            >
              {poster ? <img src={poster} alt="" /> : <GlyphIcon name={raceIconKey(r)} size={28} />}
              {r.homebrew && <i className="fv-stage-hb" aria-hidden>HB</i>}
              <span className="fv-stage-name">{r.label}</span>
            </button>
          );
        })}
        <button type="button" className="fv-stage-medal is-new" aria-label="Criar raça homebrew" title="Criar raça homebrew" onClick={() => setEditing('new')}>
          <span aria-hidden>+</span>
          <span className="fv-stage-name">Criar raça</span>
        </button>
      </nav>

      {editing && (
        <HomebrewRaceEditor
          race={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            pickHomebrew(r);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
