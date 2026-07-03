import { useState } from 'react';
import { spellsForClass } from '@/data/spells';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { spellLore } from '@/lib/lore';
import { Modal } from '@/components/ui/Modal';

interface SpellPickerProps {
  classId: string;
  maxCircle: number;
  prepared: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

/** Modal para preparar/remover magias e truques. */
export function SpellPicker({ classId, maxCircle, prepared, onToggle, onClose }: SpellPickerProps) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const available = spellsForClass(classId, maxCircle);
  const list = q ? available.filter((s) => s.name.toLowerCase().includes(q)) : available;

  return (
    <Modal title="Preparar magias" icon="spark" onClose={onClose} maxWidth={520}>
        <input className="fv-input" placeholder="Buscar magia…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {list.map((sp) => {
            const on = prepared.includes(sp.id);
            return (
              <LoreTooltip key={sp.id} info={spellLore(sp)} anchorStyle={{ display: 'block' }}>
                <button
                  onClick={() => onToggle(sp.id)}
                  style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', padding: '10px 13px', borderRadius: 11, border: '1px solid ' + (on ? t.gold : t.line), background: on ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.26)' }}
                >
                  <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, display: 'grid', placeItems: 'center', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, color: sp.level === 0 ? 'var(--muted)' : 'var(--acc)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}>
                    {sp.level === 0 ? 'T' : sp.level}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{sp.name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{sp.school}</span>
                  <span style={{ color: on ? t.gold : 'var(--muted)', fontWeight: 700 }}>{on ? '✓' : '+'}</span>
                </button>
              </LoreTooltip>
            );
          })}
        </div>
    </Modal>
  );
}
