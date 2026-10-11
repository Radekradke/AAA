import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { druidState, validNaturalRecovery, wildShapeAttacks } from '@/engine/druid';
import { getWildShape } from '@/data/wildShapes';
import { syncSpellSlots } from '@/engine/spellcasting';
import { modStr } from '@/engine/dice';
import { damageExpr, rollAttack, rollDamage } from '@/engine/combat';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';
import { ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';

const fmtCr = (n: number) => (n === 0.25 ? '1/4' : n === 0.5 ? '1/2' : String(n));

/**
 * Druida na mesa: Forma Selvagem de verdade (escolhe a fera permitida, PV e
 * ataques da forma, o dano cai nela primeiro), cura do Círculo da Lua gastando
 * espaço e Recuperação Natural do Círculo da Terra.
 */
export function DruidPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const mode = useUiStore((s) => s.rollMode);
  const { rollDice } = useDiceRoller();
  const dr = druidState(char, derived.proficiency, derived.abilities.wis.mod);
  const slots = syncSpellSlots(char);
  const [pick, setPick] = useState('');
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [healLv, setHealLv] = useState<number | null>(null);
  if (!dr) return null;
  const turn = char.combat.turn;
  const kind = dr.bonusAction ? 'bonus' : 'action';
  const flags = { advantage: mode === 'advantage', disadvantage: mode === 'disadvantage' };
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const chosen = getWildShape(pick) ?? dr.options[0];
  const elemental = !!chosen && dr.elementals.some((e) => e.id === chosen.id);
  const cost = elemental ? 2 : 1;
  const transform = () => {
    if (!chosen) return;
    if (!dr.unlimited) store.setResource(char.id, 'wildshape', dr.usesLeft - cost);
    store.useTurn(char.id, kind);
    store.wildShape(char.id, { beastId: chosen.id, hp: chosen.hp });
    toast(`Forma Selvagem: ${chosen.label} (${chosen.hp} PV) por até ${dr.hours} hora${dr.hours === 1 ? '' : 's'}.`, { tone: 'ok' });
  };
  const usedLevels = Object.entries(slots).map(([lv, s]) => ({ lv: Number(lv), used: s.used, left: s.max - s.used })).sort((a, b) => a.lv - b.lv);
  const total = Object.entries(picks).reduce((n, [lv, k]) => n + Number(lv) * k, 0);
  const free = usedLevels.filter((s) => s.left > 0);
  const hl = healLv && free.some((s) => s.lv === healLv) ? healLv : free[0]?.lv ?? null;

  return (
    <section className="fv-rage fv-druid" aria-label="Druida">
      <div className="fv-monk-ki">
        <b>Forma Selvagem {dr.unlimited ? '∞' : `${dr.usesLeft}/${dr.usesMax}`}</b>
        <small>
          ND até {fmtCr(dr.maxCr)}{!dr.canSwim ? ', sem voo nem natação' : !dr.canFly ? ', sem voo' : ''} · até {dr.hours} h · {dr.bonusAction ? 'ação bônus' : 'ação'} · volta no descanso curto · CD {dr.dc}
        </small>
      </div>

      {dr.form ? (
        <div className="fv-druid-form">
          <div className="fv-druid-form-head">
            <b>{dr.form.beast.label}</b>
            <span>{dr.form.beast.size} · ND {dr.form.beast.cr} · CA {dr.form.beast.ac} · {dr.form.beast.speed}</span>
          </div>
          <div className="fv-druid-hp" aria-label="PV da forma">
            <span>PV da forma</span>
            <b>{dr.form.hp}/{dr.form.beast.hp}</b>
            <small>o dano cai aqui primeiro; zerou, você volta com o que sobrar</small>
          </div>
          <div className="fv-druid-abil">
            {ABILITY_KEYS.slice(0, 3).map((k) => (
              <span key={k}>{ABILITY_SHORT[k]} {dr.form!.beast.abilities[k]}</span>
            ))}
            <span>INT/SAB/CAR: os seus</span>
          </div>
          {dr.form.beast.multiattack && <small className="fv-druid-multi">Ataques Múltiplos: {dr.form.beast.multiattack}</small>}
          {wildShapeAttacks(char, dr.form.beast).map((atk) => (
            <div key={atk.uid} className="fv-companion-attack">
              <div>
                <div className="fv-companion-attack-name">{atk.name.split(' · ').slice(1).join(' · ')}</div>
                {atk.note && <div className="fv-companion-attack-note">{atk.note}</div>}
              </div>
              <button type="button" className="fv-companion-hit" onClick={() => pushRoll(rollAttack(atk, flags))} aria-label={`Ataque: ${atk.name}`}>{modStr(atk.attackBonus)}</button>
              <button type="button" className="fv-companion-dmg" onClick={() => pushRoll(rollDamage(atk))} aria-label={`Dano: ${atk.name}`}>{damageExpr(atk)}</button>
            </div>
          ))}
          <div className="fv-rage-start">
            {dr.circle === 'moon' && hl &&
              btn('heal', 'Curar a forma', `espaço de ${hl}º · +${hl}d8 · ação bônus`, 'Círculo da Lua: gaste um espaço de magia como ação bônus para recuperar 1d8 PV por círculo (na forma).', turn.bonus, () => {
                const r = rollDice(8, { count: hl, label: 'Forma Selvagem de Combate (cura)' });
                store.castWithSlot(char.id, hl);
                store.useTurn(char.id, 'bonus');
                store.wildShape(char.id, { beastId: dr.form!.beast.id, hp: Math.min(dr.form!.beast.hp, dr.form!.hp + r.total) });
                toast(`A forma recupera ${r.total} PV.`, { tone: 'ok' });
              })}
            {dr.circle === 'moon' && free.length > 1 && (
              <select className="fv-input fv-druid-slot" aria-label="Círculo do espaço para curar a forma" value={hl ?? ''} onChange={(e) => setHealLv(Number(e.target.value))}>
                {free.map((s) => <option key={s.lv} value={s.lv}>{s.lv}º círculo ({s.left})</option>)}
              </select>
            )}
            {btn('revert', 'Voltar à forma normal', 'ação bônus', 'Você volta à sua forma com os PV que tinha antes de se transformar.', turn.bonus, () => {
              store.useTurn(char.id, 'bonus');
              store.wildShape(char.id, null);
              toast('De volta à forma normal.', { tone: 'ok' });
            })}
          </div>
        </div>
      ) : (
        dr.level >= 2 && (
          <div className="fv-druid-pick">
            <select className="fv-input" aria-label="Fera da Forma Selvagem" value={chosen?.id ?? ''} onChange={(e) => setPick(e.target.value)}>
              <optgroup label="Feras">
                {dr.options.map((b) => <option key={b.id} value={b.id}>{b.label} · ND {b.cr} · {b.hp} PV · CA {b.ac}</option>)}
              </optgroup>
              {dr.elementals.length > 0 && (
                <optgroup label="Elementais (2 usos)">
                  {dr.elementals.map((b) => <option key={b.id} value={b.id}>{b.label} · {b.hp} PV · CA {b.ac}</option>)}
                </optgroup>
              )}
            </select>
            {chosen && btn('shape', 'Transformar', `${dr.bonusAction ? 'ação bônus' : 'ação'}${cost === 2 ? ' · 2 usos' : ''}`, `${chosen.label}: ${chosen.speed}. ${chosen.traits.map((t) => t.name).join(', ')}`, (!dr.unlimited && dr.usesLeft < cost) || turn[kind], transform)}
          </div>
        )
      )}

      {dr.naturalRecovery && dr.naturalRecovery.left > 0 && usedLevels.some((s) => s.used > 0 && s.lv <= 5) && (
        <div className="fv-wiz-recovery">
          <span>Recuperação Natural</span>
          {usedLevels.filter((s) => s.used > 0 && s.lv <= 5).map((s) => (
            <span key={s.lv} className="fv-wiz-pick">
              <span>{s.lv}º</span>
              <button type="button" aria-label={`Menos um espaço de ${s.lv}º`} onClick={() => setPicks((p) => ({ ...p, [s.lv]: Math.max(0, (p[s.lv] ?? 0) - 1) }))}>−</button>
              <b>{picks[s.lv] ?? 0}</b>
              <button type="button" aria-label={`Mais um espaço de ${s.lv}º`} onClick={() => setPicks((p) => ({ ...p, [s.lv]: Math.min(s.used, (p[s.lv] ?? 0) + 1) }))}>+</button>
            </span>
          ))}
          {btn('recover', 'Recuperar espaços', `${total}/${dr.naturalRecovery.budget} níveis`, 'Uma vez por dia, num descanso curto: recupere espaços gastos somando até metade do nível de druida, nenhum de 6º+.', !validNaturalRecovery(char, picks, slots), () => {
            store.recoverSlots(char.id, picks);
            store.setResource(char.id, 'naturalRecovery', 0);
            setPicks({});
            toast('Recuperação Natural: espaços de volta.', { tone: 'ok' });
          })}
        </div>
      )}

      <ul className="fv-rage-effects">
        <li>Druídico: idioma secreto dos druidas.</li>
        {dr.circle === 'moon' && dr.level >= 6 && <li>Golpes Primais: os ataques da forma contam como mágicos.</li>}
        {dr.circle === 'moon' && dr.level >= 14 && <li>Mil Formas: alterar-se à vontade.</li>}
        {dr.circle === 'land' && dr.level >= 6 && <li>Passo da Terra: terreno difícil não mágico não custa movimento extra; vantagem contra plantas mágicas.</li>}
        {dr.circle === 'land' && dr.level >= 10 && <li>Guarda da Natureza: imune a veneno e doenças (a ficha não deixa marcar Envenenado); elementais e fadas não te enfeitiçam nem amedrontam.</li>}
        {dr.circle === 'land' && dr.level >= 14 && <li>Santuário da Natureza: feras e plantas fazem salvaguarda de SAB para atacar você.</li>}
        {dr.level >= 18 && <li>Corpo Atemporal (envelhece 1 ano a cada 10) e Magias Bestiais: conjura na Forma Selvagem (componentes V e S).</li>}
        {dr.level >= 20 && <li>Arquidruida: Forma Selvagem sem limite; ignora componentes V, S e materiais sem custo.</li>}
      </ul>
    </section>
  );
}
