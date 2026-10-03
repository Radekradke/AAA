import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BESTIARY_CREDIT, MONSTERS, MONSTER_BY_ID, crValue } from '@/data/bestiary';
import type { Monster } from '@/data/bestiary';
import { MONSTER_TYPES, monsterLook, monsterTypeKey } from '@/lib/monsterArt';
import type { MonsterTypeKey } from '@/lib/monsterArt';
import { useBestiaryStore, useCampaignBestiary } from '@/services/bestiaryService';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';
import { MonsterCard, MonsterIcon, MonsterPortrait } from './MonsterPortrait';
import { MonsterEditor } from './MonsterEditor';

const CR_BANDS = [
  { id: 'all', label: 'Todos', min: 0, max: 99 },
  { id: 'low', label: 'ND 0–½', min: 0, max: 0.5 },
  { id: 'mid', label: 'ND 1–3', min: 1, max: 3 },
  { id: 'high', label: 'ND 4–7', min: 4, max: 7 },
  { id: 'epic', label: 'ND 8+', min: 8, max: 99 },
];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Bestiário da mesa (só o mestre, na sala): as criaturas em cartas com
 * arte, filtros por tipo e ND, ficha completa e "Personalizar" (foto, nome
 * e notas valendo só para esta campanha).
 */
export function BestiaryGallery({ campaignId }: { campaignId: string }) {
  useCampaignBestiary(campaignId, true);
  const customs = useBestiaryStore((s) => s.customs);
  const [q, setQ] = useState('');
  const [band, setBand] = useState('all');
  const [type, setType] = useState<MonsterTypeKey | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  const list = useMemo(() => {
    const b = CR_BANDS.find((x) => x.id === band)!;
    const t = norm(q.trim());
    return MONSTERS.filter((m) => crValue(m.cr) >= b.min && crValue(m.cr) <= b.max)
      .filter((m) => type === 'all' || monsterTypeKey(m.type) === type)
      .filter((m) => !t || norm(`${m.name} ${m.en} ${m.type} ${customs[m.id]?.name ?? ''}`).includes(t))
      .sort((a, b2) => crValue(a.cr) - crValue(b2.cr) || a.name.localeCompare(b2.name));
  }, [q, band, type, customs]);
  const customized = Object.keys(customs).length;
  // sala não vira um paredão: sem filtro, mostra as primeiras e "Mostrar todas"
  const filtering = !!q.trim() || band !== 'all' || type !== 'all';
  const PREVIEW = 12;
  const shown = all || filtering ? list : list.slice(0, PREVIEW);

  return (
    <section className="fv-bgal" aria-labelledby="fv-bgal-title">
      <div className="fv-bgal-head">
        <h2 id="fv-bgal-title" className="fv-label">
          Bestiário da mesa · {MONSTERS.length}
          {customized > 0 && <span className="fv-bgal-count"> · {customized} personalizada{customized > 1 ? 's' : ''}</span>}
        </h2>
        <input className="fv-input fv-bgal-search" type="search" placeholder="Buscar criatura…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar no bestiário" />
      </div>
      <div className="fv-bgal-filters">
        <div className="fv-bgal-types" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={type === 'all'} onClick={() => setType('all')}>
            Todos
          </button>
          {(Object.keys(MONSTER_TYPES) as MonsterTypeKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(type === k ? 'all' : k)} style={{ '--mc': MONSTER_TYPES[k].color } as CSSProperties} title={MONSTER_TYPES[k].label}>
              <MonsterIcon type={k} size={14} /> {MONSTER_TYPES[k].label}
            </button>
          ))}
        </div>
        <div className="fv-bgal-bands" role="group" aria-label="Nível de desafio">
          {CR_BANDS.map((b) => (
            <button key={b.id} type="button" aria-pressed={band === b.id} onClick={() => setBand(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fv-bgal-grid">
        {shown.map((m) => (
          <MonsterCard key={m.id} m={m} look={monsterLook(m, customs[m.id])} onOpen={() => setOpen(m.id)} />
        ))}
        {!list.length && <p className="fv-live-hint">Nenhuma criatura com esses filtros.</p>}
      </div>
      {shown.length < list.length && (
        <button type="button" className="fv-btn-ghost fv-bgal-more" onClick={() => setAll(true)}>
          Mostrar todas as {list.length} criaturas
        </button>
      )}
      {all && !filtering && (
        <button type="button" className="fv-btn-ghost fv-bgal-more" onClick={() => setAll(false)}>
          Mostrar menos
        </button>
      )}
      <small className="fv-bgal-credit">{BESTIARY_CREDIT}</small>
      {open && MONSTER_BY_ID[open] && <MonsterDetailModal m={MONSTER_BY_ID[open]} campaignId={campaignId} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Janela da criatura: arte grande, ficha completa, notas e "Personalizar". */
export function MonsterDetailModal({ m, campaignId, onClose }: { m: Monster; campaignId: string | null; onClose: () => void }) {
  const custom = useBestiaryStore((s) => s.customs[m.id]);
  const notes = useBestiaryStore((s) => s.notes[m.id]);
  const available = useBestiaryStore((s) => s.available && s.campaignId === campaignId);
  const [editing, setEditing] = useState(false);
  const look = monsterLook(m, custom);
  return (
    <Modal title={editing ? `Personalizar ${m.name}` : look.name} icon="crest" onClose={onClose} maxWidth={760}>
      {editing && campaignId ? (
        <MonsterEditor m={m} campaignId={campaignId} onDone={() => setEditing(false)} />
      ) : (
        <div className="fv-mdetail" style={{ '--mc': look.color } as CSSProperties}>
          <div className="fv-mdetail-art">
            <MonsterPortrait look={look} />
            {campaignId &&
              (available ? (
                <button type="button" className="fv-btn-gold fv-mdetail-edit" onClick={() => setEditing(true)}>
                  Personalizar
                </button>
              ) : (
                <p className="fv-live-hint">Para trocar foto e nome, rode supabase/bestiario.sql no banco da mesa.</p>
              ))}
            {look.name !== m.name && <small className="fv-mdetail-orig">No bestiário: {m.name}</small>}
          </div>
          <div className="fv-mdetail-info">
            {notes && (
              <div className="fv-mdetail-notes">
                <b>Suas notas</b>
                <p>{notes}</p>
              </div>
            )}
            <MonsterStatBlock m={m} who={look.name} />
          </div>
        </div>
      )}
    </Modal>
  );
}
