import { RestPreview, useRestPreview } from './RestPreview';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import '@/styles/descanso.css';
import { useCharacterStore } from '@/store/characterStore';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { conditionLore, passiveLore } from '@/lib/lore';
import { CONDITIONS } from '@/data/conditions';
import { ConditionIcon } from '@/components/ui/RuleIcon';
import { useSpendHitDie } from './useSpendHitDie';
import { useState } from 'react';
import { syncHitDicePools } from '@/engine/hitDice';

export function TabDescanso({ char, derived }: TabProps) {
  const store = useCharacterStore();
  const [restPreview, setRestPreview] = useRestPreview();
  const pools = syncHitDicePools(char);
  const [die, setDie] = useState(derived.hitDie);
  const selectedDie = pools[die] ? die : Number(Object.keys(pools)[0]);
  const spendHitDie = useSpendHitDie(char, derived, selectedDie);
  const canRest = char.hpCurrent > 0 && (char.combat.deathSaves?.fail ?? 0) < 3 && (char.combat.exhaustion ?? 0) < 6;

  const restHint = char.combat.conditions.length
    ? `Atenção: ${char.combat.conditions.length} condição(ões) ativa(s) — um descanso longo as remove.`
    : `PV ${char.hpCurrent}/${derived.maxHp} · Dados de Vida ${char.combat.hitDiceRemaining}/${derived.hitDiceMax} · pronto para a próxima jornada.`;

  return (
    <div className="animate-riseIn fv-rest">
      {restPreview && <RestPreview char={char} kind={restPreview} onClose={() => setRestPreview(null)} />}
      <Panel full>
        <div className="fv-label fv-rest-title">Descanso</div>
        <div className="fv-rest-kinds">
          <LoreTooltip info={passiveLore('Descanso Curto', '1 hora', 'Permite gastar Dados de Vida para curar e restaura recursos marcados como recarga curta.', ['Descanso', 'Cura'])} anchorStyle={{ display: 'block' }}>
            <button type="button" className="fv-rest-kind" onClick={() => setRestPreview('short')}>
              <div className="fv-rest-kind-name">Descanso Curto</div>
              <div className="fv-rest-kind-desc">
                1 hora · recupera os recursos de descanso curto. Gaste Dados de Vida abaixo para curar.
              </div>
            </button>
          </LoreTooltip>
          <LoreTooltip info={passiveLore('Descanso Longo', '8 horas', 'Restaura PV ao máximo, recupera parte dos Dados de Vida, limpa condições nesta ficha e restaura recursos/espaços.', ['Descanso', 'Restauração'])} anchorStyle={{ display: 'block' }}>
            <button type="button" className="fv-rest-kind is-long" disabled={!canRest} onClick={() => setRestPreview('long')}>
              <div className="fv-rest-kind-name">Descanso Longo</div>
              <div className="fv-rest-kind-desc">
                8 horas · PV no máximo, metade dos Dados de Vida e todos os recursos restaurados.
              </div>
            </button>
          </LoreTooltip>
        </div>
        {/* descanso curto: gastar Dados de Vida aqui mesmo (rola dado + CON e cura) */}
        <div className="fv-rest-dice">
          <div>
            <b>Dados de Vida</b>
            <span>
              {Object.values(pools).reduce((n, p) => n + p.remaining, 0)}/{derived.hitDiceMax} · {derived.abilities.con.mod >= 0 ? '+' : '−'} {Math.abs(derived.abilities.con.mod)} CON por dado
            </span>
            <select className="fv-input" aria-label="Tipo de Dado de Vida" value={selectedDie} onChange={(e) => setDie(Number(e.target.value))}>
              {Object.entries(pools).map(([sides, pool]) => <option key={sides} value={sides}>d{sides} · {pool.remaining}/{pool.max} disponíveis</option>)}
            </select>
          </div>
          <button
            type="button"
            className="fv-btn-ghost"
            disabled={!spendHitDie || char.hpCurrent >= derived.maxHp}
            title={char.hpCurrent >= derived.maxHp ? 'Vida já está cheia' : !spendHitDie ? 'Sem Dados de Vida — metade volta no descanso longo' : undefined}
            onClick={() => spendHitDie?.()}
          >
            Gastar 1 dado
          </button>
        </div>
        <div className="fv-rest-hint">{restHint}</div>
        {!canRest && <p role="note">Descanso longo exige ao menos 1 PV e não revive personagens mortos.</p>}
      </Panel>

      <Panel full>
        <SectionLabel right={<span className="fv-rest-tip">toque para marcar o que está ativo</span>}>
          Condições
        </SectionLabel>
        <div className="fv-rest-conds">
          {CONDITIONS.map((c) => {
            const on = char.combat.conditions.includes(c.id);
            return (
              <LoreTooltip key={c.id} info={conditionLore(c.id)}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => store.toggleCondition(char.id, c.id)}
                  className={'fv-rest-cond' + (on ? ' is-on' : '')}
                >
                  <ConditionIcon id={c.id} size={16} />
                  {c.label}
                </button>
              </LoreTooltip>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
