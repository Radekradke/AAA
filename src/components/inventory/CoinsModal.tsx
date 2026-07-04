import { Modal } from '@/components/ui/Modal';
import { useCharacterStore } from '@/store/characterStore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import type { Character, CoinKey } from '@/types/character';

export const COIN_DEFS: { k: CoinKey; code: string; label: string; color: string; rate: number }[] = [
  { k: 'pp', code: 'PL', label: 'Platina', color: '#D8E3F0', rate: 10 },
  { k: 'gp', code: 'PO', label: 'Ouro', color: '#FFE08A', rate: 1 },
  { k: 'ep', code: 'PE', label: 'Electrum', color: '#9BD4C8', rate: 0.5 },
  { k: 'sp', code: 'PP', label: 'Prata', color: '#C8CDD6', rate: 0.1 },
  { k: 'cp', code: 'PC', label: 'Cobre', color: '#C8845A', rate: 0.01 },
];

export function coinTotalGp(char: Character): number {
  return Math.round(COIN_DEFS.reduce((a, c) => a + char.coins[c.k] * c.rate, 0) * 10) / 10;
}

/** Bolsa de moedas: edição direta dos 5 tipos, ajustes rápidos e total em ouro. */
export function CoinsModal({ char, onClose }: { char: Character; onClose: () => void }) {
  const t = useTheme();
  const store = useCharacterStore();

  return (
    <Modal
      title="Bolsa de Moedas"
      icon="satchel"
      onClose={onClose}
      maxWidth={480}
      footer={
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total aproximado</span>
          <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: t.gold }}>
            {coinTotalGp(char).toString().replace('.', ',')} po
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {COIN_DEFS.map((c) => (
          <div key={c.k} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.24)' }}>
            <span
              aria-hidden
              style={{ width: 26, height: 26, flex: 'none', borderRadius: 999, display: 'grid', placeItems: 'center', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 9, color: '#140d04', background: `radial-gradient(circle at 35% 30%, #fff8, transparent 45%), ${c.color}`, boxShadow: `0 0 10px ${hexA(c.color, 0.4)}` }}
            >
              {c.code}
            </span>
            <div style={{ flex: '1 1 90px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                {c.rate >= 1 ? `${c.rate} po` : `${Math.round(c.rate * 100)}/100 po`}
              </div>
            </div>
            {/* controles agrupados: quebram juntos para a linha de baixo em telas estreitas */}
            <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <button onClick={() => store.adjustCoin(char.id, c.k, -10)} style={coinBtn('var(--muted)')}>−10</button>
              <button onClick={() => store.adjustCoin(char.id, c.k, -1)} style={coinBtn('var(--muted)')}>−1</button>
              <input
                className="fv-input"
                value={char.coins[c.k]}
                onChange={(e) => store.setCoin(char.id, c.k, parseInt(e.target.value) || 0)}
                inputMode="numeric"
                aria-label={`Quantidade de ${c.label}`}
                style={{ width: 60, minHeight: 38, padding: '6px 6px', textAlign: 'center', fontFamily: "'Chakra Petch', monospace", fontWeight: 700 }}
              />
              <button onClick={() => store.adjustCoin(char.id, c.k, 1)} style={coinBtn('var(--acc)')}>+1</button>
              <button onClick={() => store.adjustCoin(char.id, c.k, 10)} style={coinBtn('var(--acc)')}>+10</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: '11px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
        Taxas do PHB 2014: 1 PL = 10 po · 1 PE = 5 pp · 10 PP = 1 po · 100 PC = 1 po.
      </p>
    </Modal>
  );
}

function coinBtn(color: string): React.CSSProperties {
  return {
    cursor: 'pointer',
    flex: 'none',
    minWidth: 36,
    minHeight: 38,
    padding: '0 6px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)',
    background: 'rgba(0,0,0,.3)',
    color,
    fontWeight: 700,
    fontSize: 12,
    fontFamily: "'Chakra Petch', monospace",
  };
}
