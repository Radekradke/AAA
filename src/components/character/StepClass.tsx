import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { CLASSES, getClass } from '@/data/classes';
import { ABILITY_LABELS } from '@/data/skills';
import { standardArrayFor } from '@/engine/characterBuilder';
import { applySelection, defaultSelection } from '@/engine/loadout';
import { classFacts } from '@/engine/creationSummary';

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

  const pickClass = (id: string) =>
    update((c) => {
      c.classId = id;
      const newCls = getClass(id);
      c.savingThrowProfs = newCls.savingThrows;
      // realinha o array padrão e limpa as perícias para as opções da nova classe
      c.baseAbilities = standardArrayFor(id);
      c.skillProfs = [];
      if (c.inventory.length > 0) applySelection(c, defaultSelection(id));
    });

  return (
    <div className="fv-step">
      <StepHeader step={1} />
      <div className="fv-choice">
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

        <ChoiceDetail
          icon={themedIcon('class', cls.id)}
          color={cls.jewel}
          eyebrow={`${cls.kind} · usa ${ABILITY_LABELS[cls.prim]}`}
          title={cls.label}
          desc={cls.blurb}
          facts={classFacts(char)}
        />
      </div>
    </div>
  );
}
