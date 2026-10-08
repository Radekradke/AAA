import { useMemo, useState } from 'react';
import type { StepProps } from './stepTypes';
import { StepHeader, SectionTitle } from './creatorUi';
import { getItem } from '@/data/items';
import { applySelection, defaultSelection, expandKit, kitForClass, kitItems, optionAllowed, PACK_CONTENTS, selectionFromChar } from '@/engine/loadout';
import type { KitChoice, KitSelection } from '@/engine/loadout';
import { getClass } from '@/data/classes';
import { deriveCharacter } from '@/engine/dndRules';
import { damageExpr } from '@/engine/combat';
import { modStr } from '@/engine/dice';
import { Icon } from '@/components/ui/Icon';

const nameOf = (id: string) => getItem(id)?.name ?? id;
const qty = (id: string, n: number) => (n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id));

/**
 * Capítulo VI — Equipamento. O kit inicial do Livro do Jogador já vem
 * escolhido (com CA e ataques calculados); personalizar mostra as opções
 * "(a) ou (b)" da classe, do jeito que estão no livro.
 */
export function StepGear({ char, update }: StepProps) {
  const [custom, setCustom] = useState(false);
  const cls = getClass(char.classId);
  const kit = kitForClass(char.classId);
  const sel = selectionFromChar(char);
  const rec = defaultSelection(char.classId, char);
  const isRecommended = JSON.stringify(sel) === JSON.stringify(rec);
  const derived = useMemo(() => deriveCharacter(char), [char]);

  const apply = (next: KitSelection) => update((c) => applySelection(c, next));
  const pickOption = (choice: KitChoice, optionId: string) => {
    const opt = choice.options.find((o) => o.id === optionId)!;
    const prev = sel[choice.id];
    const picks = opt.pick ? (prev?.option === optionId && prev.picks ? prev.picks : defaultSelection(char.classId, char)[choice.id]?.option === optionId ? defaultSelection(char.classId, char)[choice.id].picks : [opt.pick.from[0]]) : undefined;
    apply({ ...sel, [choice.id]: { option: optionId, picks } });
  };
  const setPick = (choiceId: string, index: number, id: string) => {
    const cur = sel[choiceId];
    const picks = [...(cur?.picks ?? [])];
    picks[index] = id;
    apply({ ...sel, [choiceId]: { option: cur.option, picks } });
  };

  // o que chega: itens soltos + pacotes (mostrados com o conteúdo)
  const items = kitItems(char.classId, sel, char);
  const packs = items.filter(([id]) => PACK_CONTENTS[id]);
  const loose = expandKit(items.filter(([id]) => !PACK_CONTENTS[id]));
  const eq = (uid: string | null) => (uid ? char.inventory.find((i) => i.uid === uid)?.name ?? '—' : null);

  const summary = [
    { icon: 'equipped' as const, label: 'Proteção', value: eq(char.equipped.armor) ?? 'Sem armadura' },
    ...(char.equipped.shield ? [{ icon: 'crest' as const, label: 'Escudo', value: eq(char.equipped.shield)! }] : []),
    { icon: 'sword' as const, label: 'Arma', value: eq(char.equipped.mainHand) ?? '—' },
    { icon: 'class-ranger' as const, label: 'Distância', value: eq(char.equipped.ranged) ?? 'Nenhuma' },
  ];

  return (
    <div className="fv-step">
      <StepHeader step={5} subtitle={kit.note || `O arsenal inicial do seu ${cls.label}.`} />

      <section className="fv-kit">
        <div className="fv-kit-head">
          <div>
            <div className="fv-detail-eyebrow">{isRecommended ? 'Kit do Livro do Jogador' : 'Kit personalizado'}</div>
            <h3>Arsenal do {cls.label}</h3>
          </div>
          <div className="fv-kit-ac" title="Classe de Armadura com este kit">
            <b>{derived.ac}</b>
            <span>CA</span>
          </div>
        </div>
        <dl className="fv-kit-list">
          {summary.map((k) => (
            <div key={k.label}>
              <dt><Icon name={k.icon} size={16} /> {k.label}</dt>
              <dd>{k.value}</dd>
            </div>
          ))}
        </dl>
        {derived.attacks.length > 0 && (
          <div className="fv-kit-attacks">
            {derived.attacks.map((a) => (
              <span key={a.uid}>
                {a.name} <b>{modStr(a.attackBonus)}</b> · {damageExpr(a)}
              </span>
            ))}
          </div>
        )}
        <div className="fv-kit-bag" aria-label="Na mochila">
          <p><b>Também leva:</b> {loose.filter(([id]) => !summary.some((s) => s.value === nameOf(id))).map(([id, n]) => qty(id, n)).join(', ') || '—'}</p>
          {packs.map(([id]) => (
            <p key={id}>
              <b>{nameOf(id)}:</b> {PACK_CONTENTS[id].map(([cid, n]) => qty(cid, n)).join(', ')}
            </p>
          ))}
        </div>
        <div className="fv-kit-actions">
          <button type="button" className="fv-link-btn" aria-expanded={custom} onClick={() => setCustom((v) => !v)}>
            {custom ? 'Fechar personalização' : 'Personalizar kit'}
          </button>
          {!isRecommended && (
            <button type="button" className="fv-link-btn is-muted" onClick={() => apply(rec)}>
              Voltar ao recomendado
            </button>
          )}
        </div>
        <p className="fv-step-note" style={{ margin: '10px 0 0' }}>Os pacotes chegam abertos na mochila. Tudo muda depois no inventário.</p>
      </section>

      {custom && (
        <div className="fv-gear-custom">
          {kit.choices.map((choice) => {
            const cur = sel[choice.id];
            return (
              <div key={choice.id}>
                <SectionTitle>{choice.label}</SectionTitle>
                <div role="radiogroup" aria-label={choice.label} className="fv-gear-list">
                  {choice.options.map((opt, i) => {
                    const allowed = optionAllowed(char, opt);
                    const on = cur?.option === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!allowed}
                        className={'fv-gear-row' + (on ? ' is-on' : '')}
                        onClick={() => pickOption(choice, opt.id)}
                      >
                        <span className="fv-gear-dot" aria-hidden />
                        <span className="fv-gear-name">({String.fromCharCode(97 + i)}) {opt.label}</span>
                        <span className="fv-gear-note">{!allowed ? 'precisa da proficiência' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const opt = choice.options.find((o) => o.id === cur?.option);
                  if (!opt?.pick) return null;
                  return (
                    <div className="fv-gear-picks">
                      {Array.from({ length: opt.pick.count ?? 1 }, (_, i) => (
                        <label key={i}>
                          <span>{opt.pick!.label}{(opt.pick!.count ?? 1) > 1 ? ` ${i + 1}` : ''}</span>
                          <select className="fv-input" value={cur?.picks?.[i] ?? opt.pick!.from[0]} onChange={(e) => setPick(choice.id, i, e.target.value)}>
                            {opt.pick!.from.map((id) => (
                              <option key={id} value={id}>{nameOf(id)}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
