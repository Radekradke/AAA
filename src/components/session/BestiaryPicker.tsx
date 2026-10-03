import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BESTIARY_CREDIT, MONSTERS, crValue } from '@/data/bestiary';
import type { Monster } from '@/data/bestiary';
import { abilityMod, monsterHp } from '@/engine/monsters';
import type { NewCombatant } from '@/services/encounterService';
import { MonsterStatBlock } from './MonsterStatBlock';
import { useBestiaryStore } from '@/services/bestiaryService';

const CR_BANDS: { id: string; label: string; min: number; max: number }[] = [
  { id: 'all', label: 'Todos', min: 0, max: 99 },
  { id: 'low', label: 'ND 0–1/2', min: 0, max: 0.5 },
  { id: 'mid', label: 'ND 1–3', min: 1, max: 3 },
  { id: 'high', label: 'ND 4–7', min: 4, max: 7 },
  { id: 'epic', label: 'ND 8+', min: 8, max: 99 },
];

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** N criaturas do bestiário prontas para o encontro (PV de cada uma rolados ou na média). */
export function monsterCombatants(m: Monster, qty: number, opts: { hpMode: 'average' | 'roll'; hidden: boolean; together: boolean }): NewCombatant[] {
  const n = Math.max(1, Math.min(20, qty));
  // nome que o mestre deu a esta criatura na mesa (bestiário da mesa), se houver
  const name = useBestiaryStore.getState().customs[m.id]?.name?.trim() || m.name;
  const group = n > 1 && opts.together ? `${slug(m.id)}-${Math.random().toString(36).slice(2, 6)}` : null;
  return Array.from({ length: n }, (_, i) => {
    const hp = monsterHp(m, opts.hpMode);
    return {
      type: 'monster' as const,
      name: n > 1 ? `${name} #${i + 1}` : name,
      initiativeBonus: abilityMod(m.abilities.dex),
      hpCurrent: hp,
      hpMax: hp,
      armorClass: m.ac,
      hidden: opts.hidden,
      groupKey: group,
      monsterRef: m.id,
    };
  });
}

/** Bestiário do mestre: busca, filtro por ND, ficha completa e "adicionar ao encontro". */
export function BestiaryPicker({ onAdd, onClose, busy }: { onAdd: (list: NewCombatant[]) => void; onClose: () => void; busy?: boolean }) {
  const [q, setQ] = useState('');
  const [band, setBand] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [hpMode, setHpMode] = useState<'average' | 'roll'>('average');
  const [hidden, setHidden] = useState(false);
  const [together, setTogether] = useState(true);

  const list = useMemo(() => {
    const b = CR_BANDS.find((x) => x.id === band)!;
    const term = q.trim().toLowerCase();
    return MONSTERS.filter((m) => crValue(m.cr) >= b.min && crValue(m.cr) <= b.max)
      .filter((m) => !term || m.name.toLowerCase().includes(term) || m.en.toLowerCase().includes(term) || m.type.toLowerCase().includes(term))
      .sort((a, b2) => crValue(a.cr) - crValue(b2.cr) || a.name.localeCompare(b2.name));
  }, [q, band]);

  const chosen = open ? MONSTERS.find((m) => m.id === open) ?? null : null;

  return (
    <Modal
      title="Bestiário"
      icon="crest"
      onClose={onClose}
      maxWidth={760}
      footer={
        chosen ? (
          <div className="fv-bestiary-foot">
            <label>Qtd.<input className="fv-input" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} /></label>
            <div className="fv-live-seg" role="group" aria-label="PV">
              <button type="button" className={hpMode === 'average' ? 'is-on' : ''} onClick={() => setHpMode('average')}>PV médios</button>
              <button type="button" className={hpMode === 'roll' ? 'is-on' : ''} onClick={() => setHpMode('roll')}>Rolar PV</button>
            </div>
            {qty > 1 && <label className="fv-bestiary-check"><input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} /> Agem juntos</label>}
            <label className="fv-bestiary-check"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Oculto</label>
            <button
              type="button"
              className="fv-btn-gold"
              disabled={busy}
              onClick={() => {
                onAdd(monsterCombatants(chosen, qty, { hpMode, hidden, together }));
                setQty(1);
              }}
            >
              Adicionar {qty > 1 ? `${qty}× ` : ''}{chosen.name}
            </button>
          </div>
        ) : (
          <small className="fv-bestiary-credit">{BESTIARY_CREDIT}</small>
        )
      }
    >
      <input className="fv-input" placeholder="Buscar (nome, tipo, inglês…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="fv-picker-subs">
        {CR_BANDS.map((b) => (
          <button key={b.id} type="button" className={band === b.id ? 'is-on' : ''} onClick={() => setBand(b.id)}>{b.label}</button>
        ))}
      </div>
      <div className="fv-bestiary-list">
        {list.map((m) => (
          <div key={m.id} className={'fv-bestiary-item' + (open === m.id ? ' is-open' : '')}>
            <button type="button" className="fv-bestiary-row" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
              <span className="fv-bestiary-cr">ND {m.cr}</span>
              <span className="fv-bestiary-name">
                <b>{m.name}</b>
                <small>{m.size} · {m.type}</small>
              </span>
              <span className="fv-bestiary-stats">CA {m.ac} · PV {m.hp}</span>
            </button>
            {open === m.id && <MonsterStatBlock m={m} />}
          </div>
        ))}
        {!list.length && <p className="fv-live-hint">Nada encontrado.</p>}
      </div>
    </Modal>
  );
}
