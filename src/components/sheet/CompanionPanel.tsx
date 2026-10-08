import type { Character } from '@/types/character';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { companionOf } from '@/engine/companion';
import { COMPANION_BEASTS } from '@/data/beasts';
import { calcLore, passiveLore } from '@/lib/lore';
import { modStr, rollCheck } from '@/engine/dice';
import type { RollResult } from '@/engine/dice';
import { damageExpr, rollAttack, rollDamage } from '@/engine/combat';
import { ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';

/**
 * Companheiro de Patrulheiro (Mestre das Feras): ficha curta da fera com
 * PV, CA, ataques roláveis e o que ela ganha em cada nível.
 */
export function CompanionPanel({ char }: { char: Character }) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const mode = useUiStore((s) => s.rollMode);
  const comp = companionOf(char);
  if (!comp) return null;
  const { beast } = comp;
  // rolagem da fera: vai para o histórico da ficha, mas não conta como crítico do herói
  const flags = { advantage: mode === 'advantage', disadvantage: mode === 'disadvantage' };
  const asAlly = (r: RollResult) => pushRoll({ ...r, ally: comp.name });
  const check = (label: string, mod: number) => asAlly(rollCheck(label, mod, flags));
  const attack = (atk: (typeof comp.attacks)[number]) => asAlly(rollAttack(atk, flags));
  const damage = (atk: (typeof comp.attacks)[number]) => asAlly(rollDamage(atk));

  const setHp = (hp: number) => store.editCharacter(char.id, { companion: { ...char.companion, hpCurrent: Math.max(0, Math.min(comp.maxHp, hp)) } });
  const pct = comp.maxHp ? comp.hp / comp.maxHp : 0;

  return (
    <Panel className="fv-companion">
      <SectionLabel right={<span className="fv-companion-tag">{beast.size} · ND {beast.cr}</span>}>Companheiro</SectionLabel>

      <div className="fv-companion-head">
        <input
          className="fv-input fv-companion-name"
          value={char.companion?.name ?? ''}
          placeholder={beast.label}
          aria-label="Nome do companheiro"
          onChange={(e) => store.editCharacter(char.id, { companion: { ...char.companion, name: e.target.value } })}
        />
        <select
          className="fv-input fv-companion-kind"
          value={beast.id}
          aria-label="Fera"
          title="Se o companheiro morrer, você pode se ligar a outra fera com 8 horas"
          onChange={(e) => store.editCharacter(char.id, { choices: { ...(char.choices ?? {}), 'ranger.companion': [e.target.value] }, companion: { ...char.companion, hpCurrent: undefined } })}
        >
          {COMPANION_BEASTS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>

      <div className="fv-companion-stats">
        <LoreTooltip info={passiveLore('CA do companheiro', String(comp.ac), `${beast.ac} da fera + ${comp.prof} da sua proficiência.`, ['Companheiro'])}>
          <div className="fv-companion-stat"><b>{comp.ac}</b><span>CA</span></div>
        </LoreTooltip>
        <div className="fv-companion-stat fv-companion-hp">
          <div className="fv-companion-hp-row">
            <button type="button" onClick={() => setHp(comp.hp - 1)} aria-label="Menos 1 PV">−</button>
            <b style={{ color: pct <= 0.25 ? 'var(--danger)' : 'var(--ink)' }}>{comp.hp}<small>/{comp.maxHp}</small></b>
            <button type="button" onClick={() => setHp(comp.hp + 1)} aria-label="Mais 1 PV">+</button>
          </div>
          <span className="fv-companion-bar" aria-hidden><i style={{ width: `${pct * 100}%` }} /></span>
          <span>PV</span>
        </div>
        <div className="fv-companion-stat"><b className="fv-companion-speed">{beast.speed}</b><span>Desloc.</span></div>
      </div>

      <div className="fv-companion-abil">
        {ABILITY_KEYS.map((k) => (
          <button key={k} type="button" onClick={() => check(`${comp.name} · ${ABILITY_SHORT[k]}`, comp.saves[k])} title={`Teste/salvaguarda de ${ABILITY_SHORT[k]}`}>
            <span>{ABILITY_SHORT[k]}</span>
            <b>{modStr(comp.saves[k])}</b>
          </button>
        ))}
      </div>

      <div className="fv-companion-attacks">
        {comp.attacks.map((atk) => (
          <div key={atk.uid} className="fv-companion-attack">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fv-companion-attack-name">{atk.name.split(' · ').slice(1).join(' · ')}</div>
              {atk.note && <div className="fv-companion-attack-note">{atk.note}</div>}
            </div>
            <LoreTooltip info={calcLore(`Ataque · ${atk.name}`, atk.hitBreakdown, { intro: '1d20 + os bônus abaixo.' })}>
              <button type="button" className="fv-companion-hit" onClick={() => attack(atk)}>{modStr(atk.attackBonus)}</button>
            </LoreTooltip>
            <LoreTooltip info={calcLore(`Dano · ${atk.name}`, atk.damageBreakdown, { intro: `${atk.damageDice}d${atk.damageDie} ${atk.damageType} + os bônus abaixo.` })}>
              <button type="button" className="fv-companion-dmg" onClick={() => damage(atk)}>{damageExpr(atk)}</button>
            </LoreTooltip>
          </div>
        ))}
        {beast.multiattack && <p className="fv-companion-note">Multiataque: {beast.multiattack}</p>}
        {comp.attacksPerAction > 1 && <p className="fv-companion-note">Fúria Bestial: ataca duas vezes por comando.</p>}
      </div>

      <p className="fv-companion-note">
        {comp.skills.length > 0 && <>Perícias: {comp.skills.map((s) => `${s.label} ${modStr(s.bonus)}`).join(' · ')} · </>}
        {[beast.senses.replace(/,?\s*Percepção passiva \d+/, ''), `Percepção passiva ${10 + (comp.skills.find((s) => s.label === 'Percepção')?.bonus ?? comp.saves.wis)}`].filter(Boolean).join(', ')}
      </p>
      <ul className="fv-companion-perks">
        {beast.traits.map((tr) => (
          <li key={tr.name}><b>{tr.name}.</b> {tr.desc}</li>
        ))}
        {comp.perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Panel>
  );
}
