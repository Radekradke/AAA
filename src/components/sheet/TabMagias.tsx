import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { SpellPicker } from '@/components/spells/SpellPicker';
import { SPELL_BY_ID } from '@/data/spells';
import { modStr } from '@/engine/dice';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { passiveLore, spellLore } from '@/lib/lore';

export function TabMagias({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [picker, setPicker] = useState(false);

  const slotLevels = Object.keys(char.combat.spellSlots).map(Number).sort((a, b) => a - b);
  const maxCircle = Math.max(0, ...slotLevels);
  const prepared = char.preparedSpells.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.level - b.level);

  const togglePrepared = (id: string) =>
    store.updateCharacter(char.id, (c) => {
      c.preparedSpells = c.preparedSpells.includes(id) ? c.preparedSpells.filter((x) => x !== id) : [...c.preparedSpells, id];
    });

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Espaços de magia */}
      <Panel full>
        <SectionLabel
          style={{ marginBottom: 6 }}
          right={
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              CD de Magia <b style={{ color: 'var(--gold)', fontFamily: "'Chakra Petch', monospace" }}>{derived.spellDC}</b> · ataque{' '}
              <b style={{ color: 'var(--acc)', fontFamily: "'Chakra Petch', monospace" }}>{derived.spellAttack !== null ? modStr(derived.spellAttack) : '—'}</b>
            </span>
          }
        >
          Espaços de Magia
        </SectionLabel>
        {slotLevels.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Sem espaços de magia neste nível.</div>
        )}
        {slotLevels.map((lv) => {
          const slot = char.combat.spellSlots[lv];
          return (
            <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <LoreTooltip
                info={passiveLore(`${lv}º círculo`, `${slot.max - slot.used}/${slot.max} disponíveis`, 'Cada losango representa um espaço de magia. Espaços gastos voltam normalmente após descanso longo.', ['Magia', 'Recurso'])}
              >
                <span style={{ cursor: 'help', fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--ink)', minWidth: 90 }}>{lv}º círculo</span>
              </LoreTooltip>
              <div style={{ flex: 1, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {Array.from({ length: slot.max }, (_, i) => {
                  const filled = i >= slot.used;
                  return (
                    <span
                      key={i}
                      onClick={() => store.toggleSpellSlot(char.id, lv, i + 1)}
                      style={{ cursor: 'pointer', width: 19, height: 19, borderRadius: 6, transform: 'rotate(45deg)', border: '1px solid ' + (filled ? t.acc : t.line), background: filled ? hexA(t.acc, 0.85) : 'transparent', boxShadow: filled ? '0 0 10px ' + hexA(t.acc, 0.6) : 'none', transition: '.2s' }}
                    />
                  );
                })}
              </div>
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--muted)' }}>{slot.max - slot.used} / {slot.max}</span>
            </div>
          );
        })}
      </Panel>

      {/* Magias preparadas */}
      <Panel full>
        <SectionLabel
          right={
            <button onClick={() => setPicker(true)} style={{ cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 12, padding: '7px 15px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.1) }}>
              + Preparar
            </button>
          }
        >
          Magias Preparadas
        </SectionLabel>
        {prepared.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Nenhuma magia preparada ainda.</div>}
        {prepared.map((sp) => (
          <LoreTooltip key={sp.id} info={spellLore(sp)} anchorStyle={{ display: 'block' }}>
            <div style={{ cursor: 'help', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 9, display: 'grid', placeItems: 'center', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, color: sp.level === 0 ? 'var(--muted)' : 'var(--acc)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}>
                {sp.level === 0 ? 'T' : sp.level}
              </span>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{sp.name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{sp.school}</span>
              <button onClick={() => togglePrepared(sp.id)} aria-label="Remover" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14 }}>✕</button>
            </div>
          </LoreTooltip>
        ))}
      </Panel>

      {picker && <SpellPicker classId={char.classId} maxCircle={maxCircle} prepared={char.preparedSpells} onToggle={togglePrepared} onClose={() => setPicker(false)} />}
    </div>
  );
}
