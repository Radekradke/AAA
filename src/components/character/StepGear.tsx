import { useMemo, useState } from 'react';
import type { StepProps } from './stepTypes';
import { STEP_GEAR } from '@/engine/creationSummary';
import { StepHeader, SectionTitle } from './creatorUi';
import { getItem } from '@/data/items';
import { getBackground } from '@/data/backgrounds';
import {
  applySelection, defaultPicks, defaultSelection, domainPending, expandKit, GOLD_KEY, kitForClass, kitGold, kitItems,
  optionAllowed, PACK_CONTENTS, selectionFromChar, wealthOf,
} from '@/engine/loadout';
import type { KitChoice, KitSelection } from '@/engine/loadout';
import { getClass } from '@/data/classes';
import { deriveCharacter } from '@/engine/dndRules';
import { damageExpr } from '@/engine/combat';
import { modStr, roll } from '@/engine/dice';
import { isWeaponProficient, proficienciesOf } from '@/engine/proficiencies';
import { Icon } from '@/components/ui/Icon';

const nameOf = (id: string) => getItem(id)?.name ?? id;
const qty = (id: string, n: number) => (n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id));
const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

/**
 * Capítulo VI — Equipamento. O kit inicial do Livro do Jogador já vem
 * escolhido (com CA e ataques calculados); personalizar mostra as opções
 * "(a) ou (b)" da classe, do jeito que estão no livro. Também dá para trocar
 * o kit pelo ouro inicial da classe (regra do livro) e comprar depois.
 */
export function StepGear({ char, update }: StepProps) {
  const [custom, setCustom] = useState(false);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const kit = kitForClass(char.classId);
  const sel = selectionFromChar(char);
  const rec = defaultSelection(char.classId, char);
  const gold = kitGold(sel);
  const wealth = wealthOf(char.classId);
  const isRecommended = JSON.stringify(sel) === JSON.stringify(rec);
  const derived = useMemo(() => deriveCharacter(char), [char]);
  const profs = useMemo(() => proficienciesOf(char), [char]);

  const apply = (next: KitSelection) => update((c) => applySelection(c, next));
  const pickOption = (choice: KitChoice, optionId: string) => {
    const opt = choice.options.find((o) => o.id === optionId)!;
    const prev = sel[choice.id];
    const picks = opt.pick ? (prev?.option === optionId && prev.picks?.length ? prev.picks : defaultPicks(opt.pick)) : undefined;
    apply({ ...sel, [choice.id]: { option: optionId, picks } });
  };
  const setPick = (choice: KitChoice, index: number, id: string) => {
    const cur = sel[choice.id];
    const opt = choice.options.find((o) => o.id === cur?.option);
    const picks = [...(cur?.picks?.length ? cur.picks : opt?.pick ? defaultPicks(opt.pick) : [])];
    picks[index] = id;
    apply({ ...sel, [choice.id]: { option: cur.option, picks } });
  };
  const setGold = (amount: number | null) => {
    if (amount === null) {
      const { [GOLD_KEY]: _drop, ...rest } = sel;
      void _drop;
      return apply(Object.keys(rest).length ? rest : rec);
    }
    apply({ ...sel, [GOLD_KEY]: { option: 'gold', picks: [String(amount)] } });
  };
  const rollGold = () => setGold(roll(4, { count: wealth.dice }).total * wealth.mult);

  // o que chega: itens soltos + pacotes (mostrados com o conteúdo)
  const items = kitItems(char.classId, sel, char);
  const packs = items.filter(([id]) => PACK_CONTENTS[id]);
  const eq = (uid: string | null) => (uid ? char.inventory.find((i) => i.uid === uid) : undefined);
  const equippedUids = Object.values(char.equipped).filter(Boolean) as string[];
  // "também leva": o que não está nas mãos/no corpo (a segunda espada curta aparece aqui)
  const equippedCount = (id: string) => equippedUids.filter((u) => char.inventory.find((i) => i.uid === u)?.itemId === id).length;
  const loose = expandKit(items.filter(([id]) => !PACK_CONTENTS[id]))
    .map(([id, n]) => [id, n - (getItem(id)?.weapon || getItem(id)?.armor || getItem(id)?.category === 'shield' ? equippedCount(id) : 0)] as [string, number])
    .filter(([, n]) => n > 0);

  const armor = eq(char.equipped.armor);
  const strReq = armor ? getItem(armor.itemId)?.armor?.strReq : undefined;
  const strShort = strReq && derived.abilities.str.total < strReq && char.raceId !== 'dwarf';
  const summary = [
    { icon: 'equipped' as const, label: 'Proteção', value: armor?.name ?? 'Sem armadura' },
    ...(char.equipped.shield ? [{ icon: 'crest' as const, label: 'Escudo', value: eq(char.equipped.shield)!.name }] : []),
    { icon: 'sword' as const, label: char.equipped.offHand ? 'Armas' : 'Arma', value: [eq(char.equipped.mainHand)?.name, eq(char.equipped.offHand)?.name].filter(Boolean).join(' + ') || '—' },
    { icon: 'class-ranger' as const, label: 'Distância', value: eq(char.equipped.ranged)?.name ?? 'Nenhuma' },
  ];
  const domainNote = domainPending(char) && kit.choices.some((c) => c.options.some((o) => o.requires));

  return (
    <div className="fv-step">
      <StepHeader step={STEP_GEAR} char={char} subtitle={gold !== null ? 'Ouro no lugar do kit: compre o equipamento depois, no inventário.' : kit.note || `O arsenal inicial do seu ${cls.label}.`} />

      <section className="fv-kit">
        <div className="fv-kit-head">
          <div>
            <div className="fv-detail-eyebrow">{gold !== null ? 'Ouro inicial (regra do livro)' : isRecommended ? 'Kit do Livro do Jogador' : 'Kit personalizado'}</div>
            <h3>{gold !== null ? `Bolsa do ${cls.label}` : `Arsenal do ${cls.label}`}</h3>
          </div>
          <div className="fv-kit-ac" title="Classe de Armadura com este kit">
            <b>{derived.ac}</b>
            <span>CA</span>
          </div>
        </div>

        {gold !== null ? (
          <div className="fv-kit-gold">
            <p className="fv-kit-gold-n"><b>{gold.toLocaleString('pt-BR')} po</b> <small>{wealth.formula} · média {wealth.average} po</small></p>
            <div className="fv-kit-gold-actions">
              <button type="button" className="fv-link-btn" onClick={rollGold}>Rolar {wealth.formula.replace(' po', '')}</button>
              <button type="button" className="fv-link-btn" onClick={() => setGold(wealth.average)}>Usar a média</button>
              <button type="button" className="fv-link-btn is-muted" onClick={() => setGold(null)}>Voltar ao kit</button>
            </div>
          </div>
        ) : (
          <>
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
            {strShort && <p className="fv-kit-warn">⚠ {armor!.name} pede FOR {strReq}: com FOR {derived.abilities.str.total} o deslocamento cai 3 m.</p>}
          </>
        )}

        <div className="fv-kit-bag" aria-label="Na mochila">
          {gold === null && (
            <>
              <p><b>Também leva:</b> {loose.map(([id, n]) => qty(id, n)).join(', ') || '—'}</p>
              {packs.map(([id]) => (
                <p key={id}>
                  <b>{nameOf(id)}:</b> {PACK_CONTENTS[id].map(([cid, n]) => qty(cid, n)).join(', ')}
                </p>
              ))}
            </>
          )}
          <p>
            <b>Do antecedente ({bg.label}):</b> {(bg.equipment ?? []).join(', ') || '—'}
            {bg.startingGold ? ` · bolsa com ${bg.startingGold} po` : ''}
          </p>
          {gold === null && <p className="fv-kit-load">Carga: {kg(derived.carriedWeight)} de {kg(derived.carryCapacity)} (sem o antecedente)</p>}
        </div>

        <div className="fv-kit-actions">
          {gold === null && (
            <button type="button" className="fv-link-btn" aria-expanded={custom} onClick={() => setCustom((v) => !v)}>
              {custom ? 'Fechar personalização' : 'Personalizar kit'}
            </button>
          )}
          {gold === null && (
            <button type="button" className="fv-link-btn" onClick={() => setGold(wealth.average)} title="Regra do Livro do Jogador: começar com ouro e comprar o equipamento">
              Trocar o kit por ouro ({wealth.formula})
            </button>
          )}
          {!isRecommended && gold === null && (
            <button type="button" className="fv-link-btn is-muted" onClick={() => apply(rec)}>
              Voltar ao recomendado
            </button>
          )}
        </div>
        <p className="fv-step-note" style={{ margin: '10px 0 0' }}>
          {gold !== null ? 'O equipamento do antecedente vem do mesmo jeito. ' : 'Os pacotes chegam abertos na mochila. '}Tudo muda depois no inventário.
        </p>
      </section>

      {custom && gold === null && (
        <div className="fv-gear-custom">
          {domainNote && <p className="fv-kit-warn fv-gear-wide">Você ainda não escolheu o domínio (no Caminho): martelo de guerra e cota de malha só valem se o domínio der a proficiência (Vida, Natureza, Tempestade, Guerra…).</p>}
          {kit.choices.map((choice) => {
            const cur = sel[choice.id];
            const opt = choice.options.find((o) => o.id === cur?.option);
            const picks = opt?.pick ? (cur?.picks?.length ? cur.picks : defaultPicks(opt.pick)) : [];
            return (
              <div key={choice.id}>
                <SectionTitle>{choice.label}</SectionTitle>
                <div role="radiogroup" aria-label={choice.label} className="fv-gear-list">
                  {choice.options.map((o, i) => {
                    const allowed = optionAllowed(char, o);
                    const on = cur?.option === o.id;
                    return (
                      <button key={o.id} type="button" role="radio" aria-checked={on} disabled={!allowed} className={'fv-gear-row' + (on ? ' is-on' : '')} onClick={() => pickOption(choice, o.id)}>
                        <span className="fv-gear-dot" aria-hidden />
                        <span className="fv-gear-name">({String.fromCharCode(97 + i)}) {o.label}</span>
                        <span className="fv-gear-note">{!allowed ? 'precisa da proficiência' : o.requires && domainPending(char) ? 'se o domínio permitir' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {opt?.pick && (
                  <div className="fv-gear-picks">
                    {Array.from({ length: opt.pick.count ?? 1 }, (_, i) => (
                      <label key={i}>
                        <span>{opt.pick!.label}{(opt.pick!.count ?? 1) > 1 ? ` ${i + 1}` : ''}</span>
                        <select className="fv-input" value={picks[i] ?? picks[0]} onChange={(e) => setPick(choice, i, e.target.value)}>
                          {opt.pick!.from.map((id) => {
                            const w = getItem(id)?.weapon;
                            const noProf = w && !isWeaponProficient(profs, { itemId: id, name: nameOf(id) }, w.type, w.range);
                            return (
                              <option key={id} value={id}>{nameOf(id)}{noProf ? ' — sem proficiência' : ''}</option>
                            );
                          })}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
