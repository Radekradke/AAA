import { useState } from 'react';
import { useUiStore, historyFor } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { modStr } from '@/engine/dice';
import { rollLogText, rollStats, rollTime } from '@/lib/rollLog';
import type { Character } from '@/types/character';

interface RollTimelineProps {
  /** Ficha dona do histórico (sem ficha = tudo). */
  char?: Character;
  /** Versão resumida (aba Mesa): sem cabeçalho, estatísticas nem ações. */
  compact?: boolean;
  limit?: number;
}

/**
 * Linha do tempo das rolagens da sessão: persistida, por ficha, com horário,
 * crítico/falha em destaque e atalho para registrar tudo no Diário.
 */
export function RollTimeline({ char, compact, limit }: RollTimelineProps) {
  const all = useUiStore((s) => s.history);
  const clearHistory = useUiStore((s) => s.clearHistory);
  const setNotes = useCharacterStore((s) => s.setNotes);
  const [saved, setSaved] = useState(false);

  const rolls = historyFor(all, char?.id);
  const shown = limit ? rolls.slice(0, limit) : rolls;

  if (compact) {
    if (shown.length === 0) return null;
    return (
      <>
        <div className="fv-label" style={{ margin: '13px 0 8px' }}>Últimas Rolagens</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shown.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, fontFamily: "'Chakra Petch', monospace" }}>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{r.label}</span>
              <span style={{ color: 'var(--muted)' }}>[{r.rolls.join(', ')}]{r.modifier ? ` ${modStr(r.modifier)}` : ''}</span>
              <b style={{ color: rollColor(r), fontSize: 13 }}>{r.total}</b>
            </div>
          ))}
        </div>
      </>
    );
  }

  const stats = rollStats(rolls);

  const saveToDiary = () => {
    if (!char || rolls.length === 0) return;
    const text = rollLogText(rolls);
    setNotes(char.id, char.notes.trim() ? `${char.notes.trimEnd()}\n\n${text}` : text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const clear = () => {
    if (rolls.length === 0) return;
    if (window.confirm('Limpar o histórico de rolagens desta ficha?')) clearHistory(char?.id);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div className="fv-label">Linha do tempo da sessão</div>
        {rolls.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
            {stats.count} rolag. · <span style={{ color: 'var(--gold)' }}>{stats.crits} crít.</span> · <span style={{ color: 'var(--danger)' }}>{stats.fails} falhas</span>
          </span>
        )}
      </div>

      {rolls.length === 0 ? (
        <EmptyState icon="d20" title="Nenhuma rolagem ainda" hint="Tudo que você rolar na ficha aparece aqui, com horário — e continua aqui se a página recarregar." />
      ) : (
        <>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 420, overflowY: 'auto' }}>
            {shown.map((r) => (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
                <time style={{ flex: 'none', width: 40, fontSize: 10.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{rollTime(r.timestamp)}</time>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.label}
                    {r.crit && <span style={tag('var(--gold)')}>CRÍTICO</span>}
                    {r.fail && <span style={tag('var(--danger)')}>FALHA</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{r.expr} [{r.rolls.join(', ')}]</div>
                </div>
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: rollColor(r) }}>{r.total}</span>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {char && (
              <button onClick={saveToDiary} className="fv-btn-gold" style={{ flex: '1 1 160px', padding: '9px 12px', fontSize: 12.5 }}>
                {saved ? '✓ Anotado no Diário' : 'Anotar no Diário'}
              </button>
            )}
            <button onClick={clear} style={{ flex: '0 1 auto', cursor: 'pointer', padding: '9px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5 }}>
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function rollColor(r: { crit: boolean; fail: boolean; damage?: boolean }): string {
  return r.crit ? 'var(--gold)' : r.fail || r.damage ? 'var(--danger)' : 'var(--ink)';
}

function tag(color: string): React.CSSProperties {
  return { marginLeft: 7, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color, border: `1px solid ${color}`, borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle' };
}
