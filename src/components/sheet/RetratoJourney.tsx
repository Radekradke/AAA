import { useState } from 'react';
import type { Character } from '@/types/character';
import { journeyOf } from '@/engine/journey';
import type { JourneyEvent } from '@/engine/journey';
import { DEED_RARITY } from '@/engine/deeds';
import { Icon } from '@/components/ui/Icon';
import { DeedSeal } from './RetratoDeeds';

const SHOWN = 10;
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function Mark({ e }: { e: JourneyEvent }) {
  if (e.deed) return <DeedSeal def={e.deed} size={30} />;
  if (e.kind === 'cicatriz')
    return (
      <span className="fv-journey-dot is-cicatriz" aria-hidden>
        <svg viewBox="0 0 60 40">
          <path d="M4 30 Q22 18 56 6" />
          <path d="M6 37 Q26 25 58 14" />
          <path d="M10 22 Q24 13 48 3" />
        </svg>
      </span>
    );
  const icon = e.kind === 'nivel' ? 'levelup' : e.kind === 'sessao' ? 'banner' : 'quill';
  return (
    <span className={`fv-journey-dot is-${e.kind}`} aria-hidden>
      <Icon name={icon} size={15} />
    </span>
  );
}

const KIND_LABEL: Record<JourneyEvent['kind'], string> = { inicio: 'Início', nivel: 'Nível', feito: 'Feito', cicatriz: 'Cicatriz', sessao: 'Sessão' };

/** Linha da jornada: a história do herói, do começo ao último marco. */
export function JourneySection({ char }: { char: Character }) {
  const [all, setAll] = useState(false);
  const events = journeyOf(char);
  if (events.length < 2) return null; // só o "começo": ainda não há história para contar
  const hidden = all ? 0 : Math.max(0, events.length - SHOWN);
  const list = events.slice(hidden);
  return (
    <section className="fv-vitrine-sec">
      <h3>Jornada · {events.length} marcos</h3>
      {hidden > 0 && (
        <button type="button" className="fv-btn-ghost fv-journey-more" onClick={() => setAll(true)}>
          Ver desde o começo ({hidden} {hidden === 1 ? 'marco anterior' : 'marcos anteriores'})
        </button>
      )}
      <ol className="fv-journey" aria-label="Linha da jornada">
        {list.map((e) => (
          <li key={e.id} className={`is-${e.kind}` + (e.deed ? ` is-${e.deed.rarity}` : '')}>
            <Mark e={e} />
            <div>
              <small>
                <time dateTime={e.at}>{day(e.at)}</time> · {KIND_LABEL[e.kind]}
                {e.deed ? ` ${DEED_RARITY[e.deed.rarity].label.toLowerCase()}` : ''}
              </small>
              <b>{e.title}</b>
              {e.detail && <span>{e.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
