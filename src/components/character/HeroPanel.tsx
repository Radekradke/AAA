import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Character } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { creationPending } from '@/engine/creationSummary';
import { getSubrace, raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { heroAvatar, heroPortraitPosition } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';
import { themedIcon } from './creatorUi';
import { PortraitPicker } from './PortraitPicker';

interface HeroPanelProps {
  char: Character;
  /** Leva à etapa onde resolver uma pendência. */
  onGoStep?: (step: number) => void;
  /** Troca a arte do herói (sem valor: painel só exibe). */
  onPortrait?: (dataUrl: string | null) => void;
  /** Lista o que falta (só no painel "Seu herói" do celular — no desktop o rodapé já avisa). */
  showPending?: boolean;
}

/**
 * O herói tomando forma: retrato com a luz da linhagem, sigilo da classe,
 * atributos, vitais e o que ainda falta. É a "assinatura" da criação —
 * cada escolha aparece aqui na hora.
 */
export function HeroPanel({ char, onGoStep, onPortrait, showPending = false }: HeroPanelProps) {
  const derived = useMemo(() => deriveCharacter(char), [char]);
  const pending = useMemo(() => creationPending(char), [char]);
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const named = char.name.trim();

  return (
    <div className="fv-hero-panel" style={{ ['--race-color' as string]: race.jewel, ['--class-color' as string]: cls.jewel } as CSSProperties}>
      <div className="fv-hero-portrait">
        <img src={heroAvatar(char)} alt="" style={{ objectPosition: heroPortraitPosition(char) }} />
        {onPortrait && <PortraitPicker portrait={char.portrait} onChange={onPortrait} />}
        <div className="fv-hero-sigil" title={cls.label}>
          <Icon name={themedIcon('class', cls.id)} size={22} />
        </div>
        <div className="fv-hero-caption">
          <div className={'fv-hero-name' + (named ? '' : ' is-empty')}>{named || 'Herói sem nome'}</div>
          <div className="fv-hero-line">
            {sub ? sub.label : race.label} · {cls.label}
          </div>
          <div className="fv-hero-bg">{bg.label}</div>
        </div>
      </div>

      <div className="fv-hero-abils" aria-label="Modificadores de atributo">
        {derived.abilityList.map((a) => (
          <div key={a.key} style={{ ['--abil-color' as string]: ABILITY_COLORS[a.key] } as CSSProperties}>
            <span>{ABILITY_SHORT[a.key]}</span>
            <b>{modStr(a.mod)}</b>
          </div>
        ))}
      </div>

      <div className="fv-hero-vitals">
        <div><b>{derived.maxHp}</b><span>PV</span></div>
        <div><b>{derived.ac}</b><span>CA</span></div>
        <div><b>{String(derived.speed).replace('.', ',')}m</b><span>Desloc.</span></div>
      </div>

      {!showPending ? null : pending.length > 0 ? (
        <ul className="fv-hero-pending">
          {pending.map((p) => (
            <li key={p.label}>
              <button type="button" onClick={onGoStep ? () => onGoStep(p.step) : undefined} disabled={!onGoStep}>
                <span aria-hidden className="fv-hero-dot" />
                {p.label}
                {onGoStep && <span className="fv-hero-go">ir ›</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="fv-hero-ready">
          <Icon name="starFill" size={13} /> Pronto para despertar
        </div>
      )}
    </div>
  );
}
