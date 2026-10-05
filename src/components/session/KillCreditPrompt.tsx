import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Mestre: uma criatura caiu sem autor conhecido (PV zerado na mão).
 * "Golpe final de…" credita o feito na carta do herói escolhido.
 * Some sozinho depois de 25 s (ou em "Ninguém").
 */
export function KillCreditPrompt() {
  const pending = useSessionStore((s) => s.pendingKill);
  const isMaster = useSessionStore((s) => !!s.me?.isMaster);
  const heroes = useSessionStore((s) => s.combatants.filter((c) => c.type === 'player' && c.sheetId));
  const credit = useSessionStore((s) => s.creditKill);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => void credit(null), 25000);
    return () => clearTimeout(t);
  }, [pending, credit]);

  if (!pending || !isMaster || !heroes.length) return null;
  return (
    <div className="fv-panel fv-kill" role="dialog" aria-label={`Golpe final em ${pending.name}`}>
      <p>
        <b>{pending.name}</b> caiu! Golpe final de:
      </p>
      <div className="fv-kill-heroes">
        {heroes.map((h) => (
          <button key={h.id} type="button" className="fv-btn-gold fv-kill-hero" onClick={() => void credit(h.sheetId, h.name)}>
            {h.name}
          </button>
        ))}
        <button type="button" className="fv-btn-ghost fv-kill-hero" onClick={() => void credit(null)}>
          Ninguém
        </button>
      </div>
    </div>
  );
}
