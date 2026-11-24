import { RememberMoment } from '@/components/diary/Moments';
import { useState } from 'react';
import { confirmAction } from '@/store/feedbackStore';
import { useUiStore, historyFor } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { modStr } from '@/engine/dice';
import { rollLogText, rollStats, rollTime } from '@/lib/rollLog';
import type { Character } from '@/types/character';
import '@/styles/dice.css';
import { InlineIcon } from '@/components/ui/Icon';

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
        <div className="fv-label fv-rolls-mini-label">Últimas Rolagens</div>
        <div className="fv-rolls-mini">
          {shown.map((r) => (
            <div key={r.id} className="fv-rolls-mini-row">
              <span className="fv-rolls-mini-name">{r.label}</span>
              <span className="fv-rolls-mini-dice">[{r.rolls.join(', ')}]{r.modifier ? ` ${modStr(r.modifier)}` : ''}</span>
              <b className={totalClass(r)}>{r.total}</b>
              {char && <RememberMoment char={char} rollId={r.id} title={r.label + ' · resultado ' + r.total} />}
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

  const clear = async () => {
    if (rolls.length === 0) return;
    if (await confirmAction({ title: 'Limpar o histórico desta ficha?', message: 'As rolagens registradas somem deste aparelho.', confirmLabel: 'Limpar', danger: true })) clearHistory(char?.id);
  };

  return (
    <div>
      <div className="fv-rolls-head">
        <div className="fv-label">Linha do tempo da sessão</div>
        {rolls.length > 0 && (
          <span className="fv-rolls-stats">
            {stats.count} rolag. · <span className="is-crit">{stats.crits} crít.</span> · <span className="is-bad">{stats.fails} falhas</span>
          </span>
        )}
      </div>

      {rolls.length === 0 ? (
        <EmptyState icon="d20" title="Nenhuma rolagem ainda" hint="Tudo que você rolar na ficha aparece aqui, com horário — e continua aqui se a página recarregar." />
      ) : (
        <>
          <ol className="fv-rolls">
            {shown.map((r) => (
              <li key={r.id} className="fv-rolls-row">
                <time className="fv-rolls-time">{rollTime(r.timestamp)}</time>
                <div className="fv-rolls-text">
                  <div className="fv-rolls-name">
                    {r.label}
                    {r.crit && <span className="fv-rolls-tag">CRÍTICO</span>}
                    {r.fail && <span className="fv-rolls-tag is-bad">FALHA</span>}
                  </div>
                  <div className="fv-rolls-expr">{r.expr} [{r.rolls.join(', ')}]</div>
                </div>
                <span className={totalClass(r)}>{r.total}</span>
                {char && <RememberMoment char={char} rollId={r.id} title={r.label + ' · resultado ' + r.total} />}
              </li>
            ))}
          </ol>
          <div className="fv-rolls-actions">
            {char && (
              <button type="button" onClick={saveToDiary} className="fv-btn-gold fv-rolls-save">
                {saved ? <><InlineIcon name="check" /> Anotado no Diário</> : 'Anotar no Diário'}
              </button>
            )}
            <button type="button" onClick={clear} className="fv-rolls-clear">
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Cor do total: crítico em metal, falha e dano em perigo. */
function totalClass(r: { crit: boolean; fail: boolean; damage?: boolean }): string {
  return 'fv-roll-total' + (r.crit ? ' is-crit' : r.fail || r.damage ? ' is-bad' : '');
}
