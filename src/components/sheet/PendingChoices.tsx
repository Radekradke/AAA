import { useState } from 'react';
import type { Character } from '@/types/character';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useCharacterStore } from '@/store/characterStore';
import { getClass } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { catalogFor, chosenFor, pendingChoices } from '@/engine/classChoices';
import { classLevelOf, subclassLevelFor } from '@/engine/levelUp';
import { ChoicePicker } from './ChoicePicker';

/**
 * Escolhas que ficaram para trás: subclasse do 1º nível (Feiticeiro, Clérigo,
 * Bruxo), Estilo de Luta de fichas antigas, Metamagias, Manobras… O jogador
 * resolve aqui a qualquer momento, sem precisar subir de nível.
 */
export function PendingChoices({ char }: { char: Character }) {
  const store = useCharacterStore();
  const pending = pendingChoices(char);
  const cls = getClass(char.classId);
  const subLevel = subclassLevelFor(char.classId);
  const needsSub = !char.subclassId && classLevelOf(char, char.classId) >= subLevel;
  const [subPick, setSubPick] = useState('');
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  if (!needsSub && pending.length === 0) return null;

  return (
    <Panel className="fv-pending-card">
      <SectionLabel>Escolhas pendentes</SectionLabel>
      <p className="fv-choice-picker-hint" style={{ marginTop: -2 }}>
        Pelas regras, seu personagem já deveria ter feito estas escolhas no nível em que está. Resolva quando quiser — elas não mudam PV nem nível.
      </p>

      {needsSub && (
        <div style={{ marginTop: 12 }}>
          <div className="fv-choice-picker-head">
            <div>
              <b>Subclasse de {cls.label}</b>
              <span className="fv-choice-picker-source">escolhida no nível {subLevel}</span>
            </div>
          </div>
          <div className="fv-choice-picker-grid">
            {subclassesFor(char.classId).map((sub) => (
              <button key={sub.id} type="button" aria-pressed={subPick === sub.id} className={'fv-choice-opt' + (subPick === sub.id ? ' is-on' : '')} onClick={() => setSubPick(sub.id)}>
                <span className="fv-choice-opt-top">
                  <span className="fv-choice-opt-name">{sub.label}</span>
                </span>
                <span className="fv-choice-opt-desc">{sub.desc}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fv-btn-gold"
            disabled={!subPick}
            onClick={() => { store.editCharacter(char.id, { subclassId: subPick }); setSubPick(''); }}
            style={{ marginTop: 10, padding: '10px 18px', fontSize: 13, opacity: subPick ? 1 : 0.45 }}
          >
            Confirmar subclasse
          </button>
        </div>
      )}

      {pending.map(({ spec, missing }) => {
        const value = picks[spec.storeKey] ?? [];
        return (
          <div key={spec.storeKey}>
            <ChoicePicker
              label={spec.label}
              hint={spec.hint}
              source={`${spec.source} · até o nível ${char.level}`}
              options={catalogFor(spec)}
              taken={chosenFor(char, spec.storeKey)}
              need={missing}
              value={value}
              onChange={(next) => setPicks((p) => ({ ...p, [spec.storeKey]: next }))}
            />
            <button
              type="button"
              className="fv-btn-gold"
              disabled={value.length !== missing}
              onClick={() => {
                store.setClassChoices(char.id, { [spec.storeKey]: value });
                setPicks((p) => ({ ...p, [spec.storeKey]: [] }));
              }}
              style={{ marginTop: 10, padding: '10px 18px', fontSize: 13, opacity: value.length === missing ? 1 : 0.45 }}
            >
              Salvar {spec.label.toLowerCase()}
            </button>
          </div>
        );
      })}
    </Panel>
  );
}
