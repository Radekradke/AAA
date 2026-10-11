import { useState } from 'react';
import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { syncSpellSlots } from '@/engine/spellcasting';
import { canRitual, damageRoll, damageTiming, damageTypeLabel, damageTypeOptions, hasAgonizingBlast, healRoll, hpPool, isFixedRoll, spellAttackPlan, spellHitDamage } from '@/engine/spellCast';
import { castDiceLabel, rollCastDice } from './castRoll';
import { hasMark, knowsSpell, withExtraDice } from '@/engine/damageExtras';
import { castTurnKey, rollTempHp, spellOutcome } from '@/engine/spellEffects';
import { SPELL_BY_ID } from '@/data/spells';
import type { AttackOutcome, CastRoll, SpellAttackPlan } from '@/engine/spellCast';
import { ABILITY_SHORT } from '@/data/skills';
import type { ChargeOption } from '@/engine/itemCharges';
import { materialWarning } from '@/engine/spellFocus';

interface Props {
  char: Character;
  derived: DerivedCharacter;
  spell: Spell;
  castMod: number;
  /** Magia que não gasta espaço (item, talento, arcano místico): só rola. */
  free?: boolean;
  compact?: boolean;
  /** Magia de item com cargas: escolhe quantas gastar (círculo) e usa a CD do item, se ele tiver. */
  itemCast?: { itemName: string; options: ChargeOption[]; dc?: number; onSpend: (cost: number) => void };
  /** Chamado ao conjurar (ex.: gastar o uso de uma magia 1×/descanso de raça, talento ou invocação). */
  onCast?: () => void;
  /** Só em si mesmo (invocações "em si mesmo"): não pergunta o alvo. */
  selfOnly?: boolean;
}

/** Jogadas de ataque feitas, esperando o "acertou?". */
interface PendingAttack {
  plan: SpellAttackPlan;
  attacks: { total: number; crit: boolean; fail: boolean; pick: AttackOutcome | null }[];
}

const TYPE_KEY = 'fv-spell-damage-type';
const TURN_LABEL = { action: 'Ação', bonus: 'Ação bônus', reaction: 'Reação' } as const;

/** Último tipo escolhido por magia (conveniência deste aparelho). */
function lastType(spellId: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(TYPE_KEY) ?? '{}') as Record<string, string>)[spellId] ?? null;
  } catch {
    return null;
  }
}
function saveType(spellId: string, type: string) {
  try {
    const all = JSON.parse(localStorage.getItem(TYPE_KEY) ?? '{}') as Record<string, string>;
    localStorage.setItem(TYPE_KEY, JSON.stringify({ ...all, [spellId]: type }));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/**
 * Botão Conjurar: escolhe o círculo (pode subir) e o tipo de dano quando a
 * magia deixa (Orbe Cromático…), gasta o espaço e liga a concentração.
 * Magia de ataque rola o d20 primeiro — o dano só sai nos acertos (crítico
 * dobra os dados); cada raio/feixe é uma jogada separada.
 */
export function SpellCastButton({ char, derived, spell, castMod, free, compact, itemCast, onCast, selfOnly }: Props) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const pushCastNotice = useUiStore((s) => s.pushCastNotice);
  const [flash, setFlash] = useState(0);
  const { rollDice, check } = useDiceRoller();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAttack | null>(null);
  const [targetAc, setTargetAc] = useState('');
  const typeOptions = damageTypeOptions(spell);
  const [dmgType, setDmgType] = useState<string | null>(() => (typeOptions ? lastType(spell.id) ?? typeOptions[0] : null));

  const slots = syncSpellSlots(char);
  const options = Object.entries(slots)
    .map(([lv, s]) => ({ lv: Number(lv), left: s.max - s.used }))
    .filter((o) => o.lv >= spell.level && o.left > 0)
    .sort((a, b) => a.lv - b.lv);
  const ritual = spell.level > 0 && canRitual(char.classId, spell);
  const isCantrip = spell.level === 0;
  const noSlot = itemCast ? itemCast.options.length === 0 : !isCantrip && !free && options.length === 0;
  const spellDC = itemCast?.dc ?? derived.spellDC;

  const roll = (r: CastRoll | null, suffix = '', isDamage = true) => {
    if (!r) return null;
    // um tipo de dado só: a rolagem normal (com os dados 3D)
    if (!r.extra?.length) return rollDice(r.sides, { count: r.count, modifier: r.bonus, label: r.label + suffix, damage: isDamage, cantrip: isDamage && isCantrip });
    const res = rollCastDice(r, { suffix, damage: isDamage, cantrip: isDamage && isCantrip });
    if (res) pushRoll(res);
    return res;
  };

  /**
   * Toda conjuração deixa rastro: marca a ação no turno, registra "usado",
   * aplica PV temporários/efeitos e mostra o aviso (até truque sem rolagem).
   */
  const announce = (slotLevel: number, how: 'slot' | 'ritual' | 'free' | 'item', healed: number | null, pool?: { total: number; effect: string; immune: string }, cost = 0, later?: CastRoll | null, fixedDamage?: number | null) => {
    const turnKey = castTurnKey(spell.castingTime);
    const before = char.combat.castThisTurn ?? [];
    let warn: string | undefined;
    if (turnKey && char.combat.turn[turnKey]) warn = `Você já tinha usado a ${TURN_LABEL[turnKey].toLowerCase()} neste turno.`;
    // PHB: magia de ação bônus → no mesmo turno só um truque de 1 ação
    const prevBonus = before.some((id) => castTurnKey(SPELL_BY_ID[id]?.castingTime) === 'bonus' && id !== spell.id);
    const cantripAction = isCantrip && turnKey === 'action';
    if (turnKey === 'bonus' && before.some((id) => { const p = SPELL_BY_ID[id]; return p && p.id !== spell.id && !(p.level === 0 && castTurnKey(p.castingTime) === 'action'); })) {
      warn = 'Com magia de ação bônus, a outra magia do turno só pode ser um truque de 1 ação.';
    } else if (prevBonus && !cantripAction && turnKey) {
      warn = 'Você já conjurou uma magia de ação bônus: neste turno só cabe um truque de 1 ação.';
    }
    if (turnKey) store.useTurn(char.id, turnKey);
    store.noteCast(char.id, spell.id);
    setFlash((f) => f + 1);

    const lines: string[] = [];
    const actions: { label: string; run: () => void; primary?: boolean }[] = [];
    const raw = spellOutcome(spell, isCantrip ? 0 : slotLevel, castMod);
    const out = raw && selfOnly && raw.target === 'choose' ? { ...raw, target: 'self' as const } : raw;
    const applyOnMe = () => {
      if (out?.tempHp) {
        const n = rollTempHp(out.tempHp);
        store.gainTempHp(char.id, n);
        return n;
      }
      return 0;
    };
    const effectOnMe = () => {
      if (out?.effect) store.applySpellEffect(char.id, { spellId: spell.id, name: spell.name, ...out.effect });
    };
    if (out?.target === 'self') {
      const n = applyOnMe();
      effectOnMe();
      if (n) lines.push(`+${n} PV temporários${n <= char.combat.hpTemp ? ` (você já tinha ${char.combat.hpTemp}: fica o maior)` : ''}`);
      if (out.effect) lines.push(out.effect.label);
    } else if (out?.target === 'choose') {
      if (out.effect) lines.push(out.effect.label);
      actions.push({
        label: 'Em mim',
        primary: true,
        run: () => {
          applyOnMe();
          effectOnMe();
        },
      });
      actions.push({ label: 'Em outra criatura', run: () => undefined });
    }
    if (out?.reminder) lines.push(out.reminder);
    const typeLabel = damageTypeLabel(spell, dmgType);
    const saveText = spell.save ? ` (salvaguarda de ${ABILITY_SHORT[spell.save]}, CD ${spellDC ?? '—'})` : '';
    if (fixedDamage != null) lines.push(`${fixedDamage} de dano ${typeLabel}${saveText} — valor fixo, sem rolagem`);
    // dano que vem depois (próximo acerto, quem entra na área): botão agora e no efeito ativo
    if (later) {
      const when = damageTiming(spell) === 'rider' ? 'no acerto (some ao dano do ataque)' : 'quando alguém entra, começa ou termina o turno na área';
      const fixed = isFixedRoll(later);
      lines.push(`Dano ${when}: ${castDiceLabel(later)} ${typeLabel}${saveText}`);
      if (!fixed) {
        actions.push({ label: `Rolar ${castDiceLabel(later)} agora`, run: () => { const r = rollCastDice(later); if (r) pushRoll(r); } });
        const lasting = !/instant/i.test(spell.duration ?? '');
        if (lasting) {
          const until = spell.concentration ? 'concentration' : /rodada/i.test(spell.duration ?? '') ? 'turn' : 'rest';
          const current = useCharacterStore.getState().characters.find((c) => c.id === char.id)?.combat.spellEffects?.find((e) => e.spellId === spell.id);
          store.applySpellEffect(char.id, {
            ...(current ?? { spellId: spell.id, name: spell.name, until, label: damageTiming(spell) === 'rider' ? `no acerto · ${typeLabel}` : `na área · ${typeLabel}` }),
            roll: { ...later, when: `Dano ${when}` },
          });
          lines.push('O botão de rolar fica em Efeitos ativos, na aba Jogar, enquanto a magia durar.');
        }
      }
    }
    if (healed !== null) {
      lines.push(`Cura rolada: ${healed} PV`);
      actions.unshift({ label: `Curar em mim (+${healed})`, primary: true, run: () => store.heal(char.id, healed) });
      if (!actions.some((a) => a.label === 'Em outra criatura')) actions.push({ label: 'Foi em outra criatura', run: () => undefined });
    }
    if (spell.concentration) lines.push('Concentração ligada');
    // componentes: magia de item não pede; espaço/ritual pedem material (ou foco/bolsa)
    if (how === 'slot' || how === 'ritual' || (how === 'free' && isCantrip)) {
      const m = materialWarning(char, spell);
      if (m.line) lines.push(m.line);
      if (m.warn && !warn) warn = m.warn;
    }
    const spent =
      how === 'item' ? `${cost} carga${cost === 1 ? '' : 's'} · ${itemCast?.itemName ?? 'item'}${itemCast?.dc ? ` · CD ${itemCast.dc}` : ''}`
      : isCantrip ? 'Truque (não gasta espaço)' : how === 'ritual' ? 'Ritual (+10 min, sem espaço)' : how === 'free' ? 'Sem gastar espaço' : `Espaço de ${slotLevel}º círculo`;
    pushCastNotice({
      title: `${spell.name}${!isCantrip && slotLevel > spell.level ? ` (${slotLevel}º)` : ''}`,
      sub: [spent, turnKey ? `${TURN_LABEL[turnKey]} usada` : spell.castingTime, spell.duration].filter(Boolean).join(' · '),
      lines,
      actions: actions.length ? actions : undefined,
      warn,
      pool,
    });
  };

  const pickType = (t: string) => {
    setDmgType(t);
    saveType(spell.id, t);
  };

  const fire = (slotLevel: number, how: 'slot' | 'ritual' | 'free' | 'item', cost = 0) => {
    setOpen(false);
    onCast?.();
    if (how === 'item') itemCast?.onSpend(cost);
    if (spell.concentration) {
      // nova concentração encerra Bruxaria/Marca/efeitos anteriores; estas duas já ficam ligadas
      store.setMark(char.id, 'hex', spell.id === 'phb-hex');
      store.setMark(char.id, 'huntersMark', spell.id === 'phb-hunters-mark');
      store.endConcentrationEffects(char.id);
    }
    if (how === 'slot' && !isCantrip) store.castWithSlot(char.id, slotLevel, spell.concentration);
    else if (spell.concentration) {
      if (!char.combat.concentration) store.toggleConcentration(char.id);
    }
    const lvl = isCantrip ? 0 : slotLevel;
    const save = spell.save ? ` · CD ${spellDC ?? '—'} ${ABILITY_SHORT[spell.save]}` : '';
    const agonizing = hasAgonizingBlast(char.choices) ? Math.max(0, derived.abilities.cha.mod) : 0;
    const plan = spell.attack && derived.spellAttack !== null ? spellAttackPlan(spell, lvl, char.level, dmgType, { agonizing, castMod, invocations: char.choices?.['warlock.invocation'] }) : null;
    if (plan) {
      // cada raio/feixe é uma jogada; o dano espera o "acertou?"
      const attacks = Array.from({ length: plan.beams }, (_, i) => {
        const r = check(`${spell.name} · ataque${plan.beams > 1 ? ` ${i + 1}/${plan.beams}` : ''}`, derived.spellAttack!);
        return { total: r.total, crit: r.crit, fail: r.fail, pick: null };
      });
      setPending({ plan, attacks });
      announce(slotLevel, how, null, undefined, cost);
      return;
    }
    if (spell.attack && derived.spellAttack !== null) {
      check(`${spell.name} · ataque de magia`, derived.spellAttack);
      announce(slotLevel, how, null, undefined, cost);
      return;
    }
    const dmg = damageRoll(spell, lvl, char.level, dmgType, castMod);
    const timing = damageTiming(spell);
    const heal = healRoll(spell, lvl, castMod);
    // Sono / Leque Cromático: rola o total de PV afetados (não é dano)
    const pool = hpPool(spell, isCantrip ? 0 : slotLevel);
    if (pool) {
      const r = roll(pool, '', false);
      announce(slotLevel, how, null, r ? { total: r.total, effect: pool.effect, immune: pool.immune } : undefined, cost);
      return;
    }
    let healed: number | null = null;
    // Bruxaria/Marca: a ficha soma nos seus ataques; Destruição/Raio Lunar: o dano vem depois
    const later = dmg && (timing === 'rider' || timing === 'trigger') ? dmg : null;
    let fixedDamage: number | null = null;
    if (dmg && timing === 'now') {
      if (isFixedRoll(dmg)) fixedDamage = dmg.bonus;
      else roll(dmg, save);
    } else if (!dmg && heal) healed = isFixedRoll(heal) ? heal.bonus : roll(heal, '', false)?.total ?? null;
    announce(slotLevel, how, healed, undefined, cost, later, fixedDamage);
  };

  const ac = targetAc.trim() === '' ? null : Number(targetAc);
  const outcomeOf = (a: PendingAttack['attacks'][number]): AttackOutcome | null => {
    if (a.crit) return 'crit'; // 20 natural sempre acerta
    if (a.fail) return 'miss'; // 1 natural sempre erra
    if (a.pick) return a.pick;
    if (ac !== null && Number.isFinite(ac)) return a.total >= ac ? 'hit' : 'miss';
    return null;
  };

  const rollHits = () => {
    if (!pending) return;
    const outcomes = pending.attacks.map((a) => outcomeOf(a) ?? 'miss');
    const dmg = spellHitDamage(pending.plan, outcomes);
    const area = pending.plan.area;
    setPending(null);
    // Faca de Gelo: a explosão sai acertando ou não
    if (area) {
      const ar = rollCastDice(area);
      if (ar) pushRoll(ar);
    }
    if (!dmg) return;
    const r = rollCastDice(dmg, { cantrip: isCantrip })!;
    if (dmg.half) return pushRoll({ ...r, total: Math.floor(r.total / 2), expr: `(${r.expr}) ÷ 2` });
    // Bruxaria: +1d6 necrótico por acerto (dobra no crítico)
    const hits = outcomes.filter((o) => o !== 'miss').length;
    const crits = outcomes.filter((o) => o === 'crit').length;
    if (hexOn && hits) {
      return pushRoll(withExtraDice(r, [{ count: hits + crits, die: 6, type: 'necrótico', source: 'Bruxaria' }], false, 0, `${dmg.label} · Bruxaria`));
    }
    pushRoll(r);
  };

  const onMain = () => {
    if (pending) return setPending(null);
    // tipo à escolha: abre o menu mesmo quando só há um jeito de conjurar
    if (!typeOptions) {
      if (itemCast) {
        if (itemCast.options.length === 1) return fire(itemCast.options[0].level, 'item', itemCast.options[0].cost);
        return setOpen((o) => !o);
      }
      if (isCantrip || free) return fire(spell.level, 'free');
      if (options.length === 1 && !ritual) return fire(options[0].lv, 'slot');
    }
    setOpen((o) => !o);
  };

  const hexAvail = knowsSpell(char, 'phb-hex') || hasMark(char, 'hex');
  // Fúria (Bárbaro): não conjura nem mantém concentração
  const raging = hasMark(char, 'rage');
  const hexOn = hasMark(char, 'hex');
  const outcomes = pending?.attacks.map(outcomeOf) ?? [];
  const decided = outcomes.every((o) => o !== null);
  const hits = outcomes.filter((o) => o === 'hit' || o === 'crit').length;

  return (
    <span className="fv-cast">
      <button
        type="button"
        key={flash}
        className={'fv-cast-btn' + (compact ? ' is-compact' : '') + (pending ? ' is-pending' : '') + (flash ? ' is-cast' : '') + ((char.combat.castThisTurn ?? []).includes(spell.id) && !pending ? ' is-used' : '')}
        onClick={onMain}
        disabled={(noSlot && !ritual && !pending) || (raging && !pending)}
        title={raging ? 'Em Fúria você não conjura magias' : itemCast ? (noSlot ? `Sem cargas suficientes em ${itemCast.itemName}` : `Usar cargas de ${itemCast.itemName}`) : noSlot && !ritual ? 'Sem espaços disponíveis para este círculo' : isCantrip ? 'Conjurar truque' : 'Conjurar'}
        aria-expanded={open || !!pending}
      >
        ✦ {pending ? 'Acertou?' : isCantrip || free || itemCast ? 'Usar' : 'Conjurar'}
      </button>

      {open && !pending && (
        <span className="fv-cast-pop fv-panel" role="menu">
          {typeOptions && (
            <>
              <span className="fv-cast-pop-title">Tipo de dano</span>
              <span className="fv-cast-types" role="radiogroup" aria-label="Tipo de dano">
                {typeOptions.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={dmgType === t} className={dmgType === t ? 'is-on' : ''} onClick={() => pickType(t)}>
                    {t}
                  </button>
                ))}
              </span>
            </>
          )}
          {itemCast ? (
            <>
              <span className="fv-cast-pop-title">Gastar cargas de {itemCast.itemName}</span>
              {itemCast.options.map((o) => (
                <button key={o.level} type="button" role="menuitem" onClick={() => fire(o.level, 'item', o.cost)}>
                  {o.level}º círculo <small>{o.cost} carga{o.cost === 1 ? '' : 's'}{o.level > spell.level ? ' · círculo maior' : ''}</small>
                </button>
              ))}
              {itemCast.options.length === 0 && <span className="fv-cast-pop-empty">Sem cargas suficientes.</span>}
            </>
          ) : isCantrip || free ? (
            <button type="button" role="menuitem" onClick={() => fire(spell.level, 'free')}>
              {isCantrip ? 'Conjurar' : 'Usar'} <small>{damageTypeLabel(spell, dmgType)}</small>
            </button>
          ) : (
            <>
              <span className="fv-cast-pop-title">Gastar espaço de…</span>
              {options.map((o) => (
                <button key={o.lv} type="button" role="menuitem" onClick={() => fire(o.lv, 'slot')}>
                  {o.lv}º círculo <small>{o.left} livre{o.left > 1 ? 's' : ''}{o.lv > spell.level ? ' · círculo maior' : ''}</small>
                </button>
              ))}
              {ritual && (
                <button type="button" role="menuitem" onClick={() => fire(spell.level, 'ritual')}>
                  Como ritual <small>+10 min, sem gastar espaço</small>
                </button>
              )}
              {options.length === 0 && !ritual && <span className="fv-cast-pop-empty">Sem espaços livres.</span>}
            </>
          )}
        </span>
      )}

      {pending && (
        <span className="fv-cast-pop fv-panel fv-cast-hit" role="dialog" aria-label={`${spell.name}: acertou?`}>
          <span className="fv-cast-hit-head">
            <span className="fv-cast-pop-title">{pending.plan.beams > 1 ? `${pending.plan.beams} ataques — acertaram?` : 'Acertou o alvo?'}</span>
            <button type="button" className="fv-cast-hit-close" onClick={() => setPending(null)} aria-label="Fechar">×</button>
          </span>
          <label className="fv-cast-hit-ac">
            CA do alvo <small>(opcional — marca sozinho)</small>
            <input className="fv-input" inputMode="numeric" value={targetAc} onChange={(e) => setTargetAc(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="—" />
          </label>
          {pending.attacks.map((a, i) => {
            const o = outcomes[i];
            const locked = a.crit || a.fail;
            const set = (pick: AttackOutcome) =>
              setPending((p) => p && { ...p, attacks: p.attacks.map((x, j) => (j === i ? { ...x, pick } : x)) });
            return (
              <span key={i} className={'fv-cast-hit-row' + (o ? ` is-${o}` : '')}>
                <span className="fv-cast-hit-total">
                  {pending.plan.beams > 1 && <small>#{i + 1}</small>}
                  <b>{a.total}</b>
                  {a.crit && <em>20 natural · crítico</em>}
                  {a.fail && <em>1 natural · erra</em>}
                </span>
                {!locked && (
                  <span className="fv-cast-hit-pick">
                    <button type="button" className={o === 'hit' ? 'is-on' : ''} onClick={() => set('hit')}>Acertou</button>
                    <button type="button" className={o === 'miss' ? 'is-on' : ''} onClick={() => set('miss')}>Errou</button>
                  </span>
                )}
              </span>
            );
          })}
          {hexAvail && (
            <button type="button" className={'fv-atk-chip' + (hexOn ? ' is-on' : '')} aria-pressed={hexOn} onClick={() => store.setMark(char.id, 'hex', !hexOn)}>
              Bruxaria no alvo · +1d6 necrótico por acerto
            </button>
          )}
          <button type="button" className="fv-cast-hit-go" disabled={!decided} onClick={rollHits}>
            {!decided
              ? 'Marque acerto ou erro'
              : hits > 0
                ? `Rolar dano${pending.plan.beams > 1 ? ` (${hits} acerto${hits > 1 ? 's' : ''})` : ''}`
                : pending.plan.missHalf
                  ? 'Errou — rolar metade do dano'
                  : pending.plan.area
                    ? 'Errou — rolar só a explosão'
                    : 'Errou — sem dano'}
          </button>
          {pending.plan.note && (hits > 0 || pending.plan.area) && <span className="fv-cast-hit-note">{pending.plan.note}</span>}
        </span>
      )}
    </span>
  );
}
