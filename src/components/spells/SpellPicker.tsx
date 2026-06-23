import { useState } from 'react';
import { spellsForClass } from '@/data/spells';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { spellLore } from '@/lib/lore';

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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(4,6,10,.6)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="fv-panel animate-popIn" style={{ width: '100%', maxWidth: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 20, border: '1px solid var(--gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>Preparar magias</div>
          <button onClick={onClose} aria-label="Fechar" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 }}>✕</button>
        </div>
        <input className="fv-input" placeholder="Buscar magia…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />
        <div className="fv-no-scrollbar" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
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
      </div>
    </div>
  );
}
