import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { CLASSES, getClass } from '@/data/classes';
import { ABILITY_LABELS } from '@/data/skills';
import { standardArrayFor } from '@/engine/characterBuilder';
import { applySelection, defaultSelection } from '@/engine/loadout';
import { classFacts, creationPending, STEP_CLASS } from '@/engine/creationSummary';
import { clearClassChoices } from '@/engine/classChoices';
import { resetCreationSpells } from '@/engine/creationSpells';
import { LevelOneChoices } from './LevelOneChoices';
import { voiceFor, voices, useVoices } from '@/lib/voices';

/** O papel de cada classe em poucas palavras (o card não é lugar de sigla). */
const ROLE: Record<string, string> = {
  barbarian: 'Fúria na linha de frente',
  bard: 'Magia, carisma e apoio',
  cleric: 'Cura e poder divino',
  druid: 'Natureza e transformação',
  fighter: 'Mestre das armas',
  monk: 'Artes marciais velozes',
  paladin: 'Guerreiro sagrado',
  ranger: 'Caçador e batedor',
  rogue: 'Furtividade e precisão',
  sorcerer: 'Magia inata e explosiva',
  warlock: 'Poder de um patrono',
  wizard: 'Estudo arcano',
};

/** Capítulo II — Caminho: a classe. */
export function StepClass({ char, update }: StepProps) {
  const cls = getClass(char.classId);
  const voice = useVoices();
  const hasVoice = !!voiceFor(cls.id, char.gender);
  const speaking = voice.speaking === `${cls.id}-${char.gender}`;
  const due = creationPending(char).filter((p) => p.step === STEP_CLASS);

  const pickClass = (id: string) => {
    voices.play(id, char.gender);
    update((c) => {
      if (c.classId !== id) {
        // subclasse e escolhas do 1º nível eram da classe antiga
        c.subclassId = null;
        clearClassChoices(c);
        resetCreationSpells(c);
      }
      c.classId = id;
      c.classLevels = [{ classId: id, level: c.level }];
      const newCls = getClass(id);
      c.savingThrowProfs = newCls.savingThrows;
      // realinha o array padrão e limpa as perícias para as opções da nova classe
      c.baseAbilities = standardArrayFor(id);
      c.skillProfs = [];
      if (c.inventory.length > 0) applySelection(c, defaultSelection(id, c));
    });
  };

  const pickGender = (g: 'masc' | 'fem') => {
    update((c) => { c.gender = g; });
    voices.play(cls.id, g);
  };

  return (
    <div className="fv-step">
      <StepHeader step={1} char={char} />
      <div className="fv-choice">
        <div>
          <OptionGrid label="Classes">
            {CLASSES.map((c) => (
              <OptionTile
                key={c.id}
                icon={themedIcon('class', c.id)}
                label={c.label}
                line={ROLE[c.id] ?? c.kind}
                color={c.jewel}
                selected={char.classId === c.id}
                onSelect={() => pickClass(c.id)}
              />
            ))}
          </OptionGrid>
          {/* escolhas do 1º nível ficam sob a grade, como as da linhagem */}
          <div className="fv-choice-extras">
            <LevelOneChoices char={char} update={update} scope="class" />
          </div>
        </div>

        <ChoiceDetail
          icon={themedIcon('class', cls.id)}
          color={cls.jewel}
          eyebrow={`${cls.kind} · usa ${ABILITY_LABELS[cls.prim]}`}
          title={cls.label}
          desc={cls.blurb}
          facts={classFacts(char)}
        >
          {due.length > 0 && (
            <p className="fv-detail-due">
              No 1º nível você escolhe (abaixo das classes): {due.map((p) => p.label.replace(/^Escolha:? (o )?/, '').replace(/ \(.*\)$/, '')).join(' · ')}
            </p>
          )}
          <div className="fv-voice">
            <div className="fv-seg" role="radiogroup" aria-label="Voz e aparência">
              {(['masc', 'fem'] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={char.gender === g} className={char.gender === g ? 'is-on' : ''} onClick={() => pickGender(g)}>
                  {g === 'masc' ? 'Masculina' : 'Feminina'}
                </button>
              ))}
            </div>
            {hasVoice ? (
              <>
                <button
                  type="button"
                  className={'fv-voice-play' + (speaking ? ' is-on' : '')}
                  onClick={() => (speaking ? voices.stop() : voices.play(cls.id, char.gender))}
                  disabled={voice.muted}
                  aria-label={speaking ? 'Parar a fala' : `Ouvir ${cls.label}`}
                >
                  {speaking ? (
                    <span aria-hidden className="fv-voice-eq"><i /><i /><i /></span>
                  ) : (
                    <span aria-hidden>▶</span>
                  )}
                  {speaking ? 'Falando…' : 'Ouvir'}
                </button>
                <button
                  type="button"
                  className="fv-voice-mute"
                  aria-pressed={voice.muted}
                  onClick={() => voices.setMuted(!voice.muted)}
                  title={voice.muted ? 'Ligar as falas dos heróis' : 'Silenciar as falas dos heróis'}
                >
                  {voice.muted ? 'Falas desligadas' : 'Silenciar'}
                </button>
              </>
            ) : (
              <small className="fv-voice-none">sem fala gravada para esta versão</small>
            )}
          </div>
        </ChoiceDetail>
      </div>
    </div>
  );
}
