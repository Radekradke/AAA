import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { conditionLore, passiveLore } from '@/lib/lore';

const CONDITIONS = [
  'Agarrado', 'Amedrontado', 'Atordoado', 'Caído', 'Cego', 'Enfeitiçado',
  'Envenenado', 'Impedido', 'Incapacitado', 'Inconsciente', 'Invisível',
  'Paralisado', 'Petrificado', 'Restringido', 'Surdo',
];

export function TabDescanso({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();

  const restHint = char.combat.conditions.length
    ? `Atenção: ${char.combat.conditions.length} condição(ões) ativa(s) — um descanso longo as remove.`
    : `PV ${char.hpCurrent}/${derived.maxHp} · Dados de Vida ${char.combat.hitDiceRemaining}/${derived.hitDiceMax} · pronto para a próxima jornada.`;

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      <Panel full>
        <div className="fv-label" style={{ marginBottom: 13 }}>Descanso</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 14 }}>
          <LoreTooltip info={passiveLore('Descanso Curto', '1 hora', 'Permite gastar Dados de Vida para curar e restaura recursos marcados como recarga curta.', ['Descanso', 'Cura'])} anchorStyle={{ display: 'block' }}>
            <button onClick={() => store.shortRest(char.id)} style={{ cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', transition: '.25s' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--acc)' }}>Descanso Curto</div>
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                1 hora · gaste Dados de Vida para curar e recupere recursos de descanso curto.
              </div>
            </button>
          </LoreTooltip>
          <LoreTooltip info={passiveLore('Descanso Longo', '8 horas', 'Restaura PV ao máximo, recupera parte dos Dados de Vida, limpa condições nesta ficha e restaura recursos/espaços.', ['Descanso', 'Restauração'])} anchorStyle={{ display: 'block' }}>
            <button onClick={() => store.longRest(char.id)} style={{ cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--goldB)', background: 'linear-gradient(160deg, rgba(255,224,138,.14), rgba(255,224,138,.04))', boxShadow: '0 0 26px var(--bloom)', transition: '.25s' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--gold)' }}>Descanso Longo</div>
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                8 horas · PV no máximo, metade dos Dados de Vida e todos os recursos restaurados.
              </div>
            </button>
          </LoreTooltip>
        </div>
        <div style={{ marginTop: 13, fontSize: 12, color: 'var(--acc)', fontFamily: "'Chakra Petch', monospace" }}>{restHint}</div>
      </Panel>

      <Panel full>
        <SectionLabel right={<span style={{ fontSize: 11, color: 'var(--muted)' }}>toque para marcar o que está ativo</span>}>
          Condições
        </SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CONDITIONS.map((c) => {
            const on = char.combat.conditions.includes(c);
            return (
              <LoreTooltip key={c} info={conditionLore(c)}>
                <button
                  onClick={() => store.toggleCondition(char.id, c)}
                  style={{ cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5, padding: '8px 15px', borderRadius: 999, border: '1px solid ' + (on ? t.danger : t.line), color: on ? '#fff' : t.muted, background: on ? hexA(t.danger, 0.22) : 'rgba(0,0,0,.22)', boxShadow: on ? '0 0 16px ' + hexA(t.danger, 0.35) : 'none', transition: '.2s' }}
                >
                  {c}
                </button>
              </LoreTooltip>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
