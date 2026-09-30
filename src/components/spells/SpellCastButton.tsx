import { useState } from 'react';
import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { roll as rollEngine } from '@/engine/dice';
import { syncSpellSlots } from '@/engine/spellcasting';
import { canRitual, damageRoll, damageTypeLabel, damageTypeOptions, healRoll, spellAttackPlan, spellHitDamage } from '@/engine/spellCast';
import type { AttackOutcome, CastRoll, SpellAttackPlan } from '@/engine/spellCast';
import { ABILITY_SHORT } from '@/data/skills';

interface Props {
  char: Character;
  derived: DerivedCharacter;
  spell: Spell;
  castMod: number;
  /** Magia que não gasta espaço (item, talento, arcano místico): só rola. */
  free?: boolean;
  compact?: boolean;
}

/** Jogadas de ataque feitas, esperando o "acertou?". */
interface PendingAttack {
  plan: SpellAttackPlan;
  attacks: { total: number; crit: boolean; fail: boolean; pick: AttackOutcome | null }[];
}

const TYPE_KEY = 'fv-spell-damage-type';

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
export function SpellCastButton({ char, derived, spell, castMod, free, compact }: Props) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
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
  const noSlot = !isCantrip && !free && options.length === 0;

  const roll = (r: CastRoll | null, suffix = '') => {
    if (!r) return;
    rollDice(r.sides, { count: r.count, modifier: r.bonus, label: r.label + suffix, damage: true });
  };

  const pickType = (t: string) => {
    setDmgType(t);
    saveType(spell.id, t);
  };

  const fire = (slotLevel: number, how: 'slot' | 'ritual' | 'free') => {
    setOpen(false);
    if (how === 'slot' && !isCantrip) store.castWithSlot(char.id, slotLevel, spell.concentration);
    else if (spell.concentration) {
      if (!char.combat.concentration) store.toggleConcentration(char.id);
    }
    const lvl = isCantrip ? 0 : slotLevel;
    const save = spell.save ? ` · CD ${derived.spellDC ?? '—'} ${ABILITY_SHORT[spell.save]}` : '';
    const plan = spell.attack && derived.spellAttack !== null ? spellAttackPlan(spell, lvl, char.level, dmgType) : null;
    if (plan) {
      // cada raio/feixe é uma jogada; o dano espera o "acertou?"
      const attacks = Array.from({ length: plan.beams }, (_, i) => {
        const r = check(`${spell.name} · ataque${plan.beams > 1 ? ` ${i + 1}/${plan.beams}` : ''}`, derived.spellAttack!);
        return { total: r.total, crit: r.crit, fail: r.fail, pick: null };
      });
      setPending({ plan, attacks });
      return;
    }
    if (spell.attack && derived.spellAttack !== null) {
      check(`${spell.name} · ataque de magia`, derived.spellAttack);
      return;
    }
    const dmg = damageRoll(spell, lvl, char.level, dmgType);
    const heal = healRoll(spell, lvl, castMod);
    if (dmg) roll(dmg, save);
    else if (heal) roll(heal);
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
    setPending(null);
    if (!dmg) return;
    if (dmg.half) {
      const r = rollEngine(dmg.sides, { count: dmg.count, modifier: dmg.bonus, label: dmg.label, damage: true });
      pushRoll({ ...r, total: Math.floor(r.total / 2), expr: `(${r.expr}) ÷ 2` });
    } else {
      roll(dmg);
    }
  };

  const onMain = () => {
    if (pending) return setPending(null);
    // tipo à escolha: abre o menu mesmo quando só há um jeito de conjurar
    if (!typeOptions) {
      if (isCantrip || free) return fire(spell.level, 'free');
      if (options.length === 1 && !ritual) return fire(options[0].lv, 'slot');
    }
    setOpen((o) => !o);
  };

  const outcomes = pending?.attacks.map(outcomeOf) ?? [];
  const decided = outcomes.every((o) => o !== null);
  const hits = outcomes.filter((o) => o === 'hit' || o === 'crit').length;

  return (
    <span className="fv-cast">
      <button
        type="button"
        className={'fv-cast-btn' + (compact ? ' is-compact' : '') + (pending ? ' is-pending' : '')}
        onClick={onMain}
        disabled={noSlot && !ritual && !pending}
        title={noSlot && !ritual ? 'Sem espaços disponíveis para este círculo' : isCantrip ? 'Conjurar truque' : 'Conjurar'}
        aria-expanded={open || !!pending}
      >
        ✦ {pending ? 'Acertou?' : isCantrip || free ? 'Usar' : 'Conjurar'}
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
          {isCantrip || free ? (
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
          <button type="button" className="fv-cast-hit-go" disabled={!decided} onClick={rollHits}>
            {!decided
              ? 'Marque acerto ou erro'
              : hits > 0
                ? `Rolar dano${pending.plan.beams > 1 ? ` (${hits} acerto${hits > 1 ? 's' : ''})` : ''}`
                : pending.plan.missHalf
                  ? 'Errou — rolar metade do dano'
                  : 'Errou — sem dano'}
          </button>
          {pending.plan.note && hits > 0 && <span className="fv-cast-hit-note">{pending.plan.note}</span>}
        </span>
      )}
    </span>
  );
}
