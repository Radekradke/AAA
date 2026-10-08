import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import type { ItemSpell } from '@/engine/spellcasting';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { roll as rollEngine } from '@/engine/dice';
import { chargesOf } from '@/engine/itemCharges';
import { toast } from '@/store/feedbackStore';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { spellLore } from '@/lib/lore';
import { SpellCastButton } from './SpellCastButton';

interface Props {
  char: Character;
  derived: DerivedCharacter;
  castMod: number;
  /** Magias de itens com cargas (vindas de itemGrantedSpells). */
  spells: ItemSpell[];
}

/**
 * Cajados e varinhas: um bloco por item com as cargas que sobram e cada
 * magia com o seu custo. Usar gasta as cargas (e escolhe o círculo, quando
 * dá para subir); a última carga rola o d20 do item.
 */
export function ItemChargeSpells({ char, derived, castMod, spells }: Props) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const groups = new Map<string, ItemSpell[]>();
  for (const s of spells) groups.set(s.itemUid, [...(groups.get(s.itemUid) ?? []), s]);

  const spend = (uid: string, name: string, cost: number) => {
    const left = store.spendItemCharges(char.id, uid, cost);
    const it = char.inventory.find((i) => i.uid === uid);
    const risk = it ? chargesOf(it)?.emptyRisk : undefined;
    if (left > 0 || !risk) return;
    // última carga: d20 — no 1, o item cobra o preço
    const r = rollEngine(20, { count: 1, modifier: 0, label: `${name} · última carga (d20)` });
    pushRoll(r);
    if (r.total === 1) {
      toast(`d20 = 1 — ${name}: ${risk.text}`, {
        tone: 'danger',
        action: risk.remove ? { label: 'Remover da ficha', run: () => store.removeInventoryItem(char.id, uid) } : undefined,
      });
    } else {
      toast(`${name} ficou sem cargas (d20 = ${r.total}: nada de ruim). Recupera no descanso longo.`, { tone: 'info' });
    }
  };

  return (
    <div className="fv-charge-items">
      {[...groups.values()].map((list) => {
        const head = list[0];
        const ch = head.charges!;
        return (
          <section key={head.itemUid} className="fv-charge-item" aria-label={`${head.itemName}: ${ch.left} de ${ch.max} cargas`}>
            <header>
              <b>{head.itemName}</b>
              <span className="fv-charge-count">
                <span className="fv-charge-pips" aria-hidden>
                  {Array.from({ length: ch.max }, (_, i) => (
                    <i key={i} className={i < ch.left ? 'is-on' : ''} />
                  ))}
                </span>
                {ch.left}/{ch.max} cargas
              </span>
            </header>
            <ul>
              {list.map((is) => (
                <li key={is.key} className={is.options?.length ? '' : 'is-short'}>
                  <LoreTooltip info={spellLore(is.spell)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                    <span className="fv-charge-spell">
                      <span>{is.spell.name}</span>
                      <small>
                        {is.cost} carga{is.cost === 1 ? '' : 's'}
                        {is.options && is.options.length > 1 ? ' · pode subir o círculo' : ''}
                        {is.dc ? ` · CD ${is.dc}` : is.spell.save && derived.spellDC !== null ? ` · CD ${derived.spellDC} (sua)` : ''}
                      </small>
                    </span>
                  </LoreTooltip>
                  <SpellCastButton
                    char={char}
                    derived={derived}
                    spell={is.spell}
                    castMod={castMod}
                    compact
                    itemCast={{ itemName: is.itemName, options: is.options ?? [], dc: is.dc, onSpend: (cost) => spend(is.itemUid, is.itemName, cost) }}
                  />
                </li>
              ))}
            </ul>
            <p className="fv-charge-foot">Recupera {ch.regain === 'all' ? 'todas as cargas' : `${ch.regain} cargas`} no descanso longo (ao amanhecer).</p>
          </section>
        );
      })}
    </div>
  );
}
