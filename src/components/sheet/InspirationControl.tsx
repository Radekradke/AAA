import { HoloBadge } from '@/components/ui/holo-badge';
import { Icon } from '@/components/ui/Icon';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';

interface InspirationControlProps {
  charId: string;
  points: number;
  /** Máximo pela regra em vigor: 1 no PHB 2014; 10 com a regra da mesa (acumula). */
  max: number;
  /** Efeito ao ganhar (brilho das partículas). */
  onGain?: () => void;
}

/**
 * Inspiração na mesa: o selo mostra o estado; tocar nele prepara a
 * vantagem para o próximo teste d20 (só sai da ficha quando o dado rola).
 * Regra 2014: tem ou não tem. Com a regra da mesa, acumula pontos.
 */
export function InspirationControl({ charId, points, max, onGain }: InspirationControlProps) {
  const stacking = max > 1;
  const gain = useCharacterStore((s) => s.gainInspiration);
  const spend = useCharacterStore((s) => s.spendInspiration);
  const armed = useUiStore((s) => s.inspirationArmed && s.armedCharId === charId);
  const arm = useUiStore((s) => s.armInspiration);
  const disarm = useUiStore((s) => s.disarmInspiration);

  const lit = points > 0 || armed;
  const add = () => {
    gain(charId);
    onGain?.();
  };

  const onBadge = () => {
    if (armed) disarm();
    else if (points > 0) arm(charId);
    else add();
  };

  const has = stacking ? `${points} ${points === 1 ? 'ponto' : 'pontos'}` : 'Inspirado';
  const title = armed ? 'Vantagem' : points > 0 ? has : 'Sem inspiração';
  const hint = armed ? 'No próximo d20' : points > 0 ? 'Toque para usar' : 'Toque ao ganhar';
  const hintLong = armed ? 'O próximo teste d20 sai com vantagem; toque para cancelar' : points > 0 ? 'Toque para usar: vantagem no próximo teste d20' : 'Toque quando o mestre der inspiração';
  const status = armed
    ? 'Inspiração preparada: o próximo teste d20 sai com vantagem.'
    : stacking
      ? `${points} ${points === 1 ? 'ponto' : 'pontos'} de inspiração.`
      : points > 0 ? 'Com inspiração.' : 'Sem inspiração.';
  const gainLabel = stacking ? 'Ganhar 1 ponto de inspiração' : points >= max ? 'Já tem inspiração (regra 2014: não acumula)' : 'Ganhar inspiração';
  const dropLabel = stacking ? 'Remover 1 ponto de inspiração (sem usar)' : 'Remover a inspiração (sem usar)';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <HoloBadge
        tone={lit ? 'gold' : 'steel'}
        active={lit}
        pressed={armed}
        ariaLabel={`Inspiração: ${title}. ${hintLong}.${stacking ? ' Regra da mesa: acumula até 10 pontos.' : ''}`}
        onClick={onBadge}
        className={armed ? 'fv-insp-armed' : undefined}
        style={{ width: 'clamp(178px, 42vw, 240px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 10px' }}>
          <Icon name="inspiration" size={30} color={lit ? '#5a3d05' : 'var(--muted)'} />
          <div style={{ minWidth: 0, overflow: 'hidden', textAlign: 'left', lineHeight: 1.1 }} title={hintLong}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', opacity: 0.8 }}>INSPIRAÇÃO</span>
              {stacking && <Pips points={points} lit={lit} />}
              {stacking && (
                <span className="fv-house-mark" title="Regra da mesa: acumula até 10 pontos (no PHB 2014 não acumula)">
                  mesa
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1.1, marginTop: 2, overflowWrap: 'break-word' }}>{title}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.72, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</div>
          </div>
        </div>
      </HoloBadge>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StepBtn label={gainLabel} onClick={add} disabled={points >= max} accent>
          +
        </StepBtn>
        <StepBtn label={dropLabel} onClick={() => spend(charId)} disabled={points <= 0}>
          −
        </StepBtn>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

/** Losangos dos pontos (até 5 à vista; acima disso, "×N"). */
function Pips({ points, lit }: { points: number; lit: boolean }) {
  if (points <= 0) return null;
  if (points > 5) return <span style={{ fontFamily: 'var(--font-num)', fontSize: 11, fontWeight: 800 }}>×{points}</span>;
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: points }, (_, i) => (
        <span key={i} style={{ width: 6, height: 6, transform: 'rotate(45deg)', borderRadius: 1, background: lit ? '#5a3d05' : 'var(--muted)' }} />
      ))}
    </span>
  );
}

function StepBtn({ children, label, onClick, disabled, accent }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        flex: 1,
        minWidth: 44,
        minHeight: 40,
        borderRadius: 10,
        border: '1px solid ' + (accent && !disabled ? 'var(--gold)' : 'var(--line)'),
        background: accent && !disabled ? 'rgba(255,224,138,.12)' : 'var(--sunk)',
        color: disabled ? 'rgba(139,153,176,.4)' : accent ? 'var(--gold)' : 'var(--muted)',
        fontFamily: 'var(--font-num)',
        fontWeight: 800,
        fontSize: 17,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}
