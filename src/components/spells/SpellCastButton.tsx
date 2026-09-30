import { useState } from 'react';
import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { syncSpellSlots } from '@/engine/spellcasting';
import { canRitual, damageRoll, healRoll } from '@/engine/spellCast';
import type { CastRoll } from '@/engine/spellCast';
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

/**
 * Botão Conjurar: escolhe o círculo (pode subir), gasta o espaço, liga a
 * concentração e rola ataque/dano/cura já escalados pelo círculo usado.
 */
export function SpellCastButton({ char, derived, spell, castMod, free, compact }: Props) {
  const store = useCharacterStore();
  const { rollDice, check } = useDiceRoller();
  const [open, setOpen] = useState(false);
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

  const fire = (slotLevel: number, how: 'slot' | 'ritual' | 'free') => {
    setOpen(false);
    if (how === 'slot' && !isCantrip) store.castWithSlot(char.id, slotLevel, spell.concentration);
    else if (spell.concentration) {
      if (!char.combat.concentration) store.toggleConcentration(char.id);
    }
    const lvl = isCantrip ? 0 : slotLevel;
    const dmg = damageRoll(spell, lvl, char.level);
    const heal = healRoll(spell, lvl, castMod);
    const save = spell.save ? ` · CD ${derived.spellDC ?? '—'} ${ABILITY_SHORT[spell.save]}` : '';
    if (spell.attack && derived.spellAttack !== null) {
      check(`${spell.name} · ataque de magia`, derived.spellAttack);
      if (dmg) window.setTimeout(() => roll(dmg, save), 900);
    } else if (dmg) {
      roll(dmg, save);
    } else if (heal) {
      roll(heal);
    }
  };

  const onMain = () => {
    if (isCantrip || free) return fire(spell.level, 'free');
    if (options.length === 1 && !ritual) return fire(options[0].lv, 'slot');
    setOpen((o) => !o);
  };

  return (
    <span className="fv-cast">
      <button
        type="button"
        className={'fv-cast-btn' + (compact ? ' is-compact' : '')}
        onClick={onMain}
        disabled={noSlot && !ritual}
        title={noSlot && !ritual ? 'Sem espaços disponíveis para este círculo' : isCantrip ? 'Conjurar truque' : 'Conjurar'}
        aria-expanded={open}
      >
        ✦ {isCantrip || free ? 'Usar' : 'Conjurar'}
      </button>
      {open && (
        <span className="fv-cast-pop fv-panel" role="menu">
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
        </span>
      )}
    </span>
  );
}
