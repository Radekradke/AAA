import { useState } from 'react';
import { deriveCharacter } from '@/engine/dndRules';
import type { NewCombatant } from '@/services/encounterService';
import { useSessionStore } from '@/store/sessionStore';
import type { Character } from '@/types/character';
import type { SharedCharacterSheet } from '@/types/models';

export interface SharedHero {
  share: SharedCharacterSheet;
  snapshot: Character | null;
}

/** Combatente a partir da ficha vinculada (sem escrever na ficha: só lê o snapshot). */
export function heroCombatant(h: SharedHero): NewCombatant {
  const snap = h.snapshot;
  if (!snap) return { type: 'player', name: 'Herói', sheetId: h.share.sheetId };
  const d = deriveCharacter(snap);
  return {
    type: 'player',
    name: snap.name || 'Herói',
    sheetId: h.share.sheetId,
    initiativeBonus: d.initiative,
    hpCurrent: snap.hpCurrent ?? d.maxHp,
    hpMax: d.maxHp,
    armorClass: d.ac,
  };
}

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grupo';
}

/** Monta N criaturas iguais: "Goblin #1…#N", no mesmo grupo se agem juntas. */
export function buildCreatures(f: { name: string; type: 'monster' | 'npc'; qty: number; bonus: number; hp: number | null; ac: number | null; hidden: boolean; together: boolean }): NewCombatant[] {
  const name = f.name.trim();
  const qty = Math.max(1, Math.min(20, Math.round(f.qty)));
  const group = qty > 1 && f.together ? `${slug(name)}-${Math.random().toString(36).slice(2, 6)}` : null;
  return Array.from({ length: qty }, (_, i) => ({
    type: f.type,
    name: qty > 1 ? `${name} #${i + 1}` : name,
    initiativeBonus: f.bonus,
    hpCurrent: f.hp,
    hpMax: f.hp,
    armorClass: f.ac,
    hidden: f.hidden,
    groupKey: group,
  }));
}

/** Painel do mestre: encontro, heróis vinculados, criaturas e iniciativa dos inimigos. */
export function MasterDeck({ heroes }: { heroes: SharedHero[] }) {
  const s = useSessionStore();
  const [encName, setEncName] = useState('');
  const enc = s.encounter;

  if (!enc) {
    return (
      <section className="fv-panel fv-live-card">
        <div className="fv-label">Novo encontro</div>
        <p className="fv-live-hint">Um encontro é um combate: junta heróis e criaturas numa ordem de iniciativa.</p>
        <div className="fv-live-inline">
          <input className="fv-input" placeholder="Emboscada na estrada (opcional)" value={encName} onChange={(e) => setEncName(e.target.value)} maxLength={60} />
          <button type="button" className="fv-btn-gold" disabled={s.busy} onClick={() => void s.createEncounter(encName || undefined)}>
            Preparar encontro
          </button>
        </div>
      </section>
    );
  }

  const inEncounter = new Set(s.combatants.map((c) => c.sheetId).filter(Boolean));
  const missing = heroes.filter((h) => !inEncounter.has(h.share.sheetId));
  const enemiesWithout = s.combatants.filter((c) => c.type !== 'player' && c.initiative === null).length;
  const enemies = s.combatants.filter((c) => c.type !== 'player').length;

  return (
    <>
      <section className="fv-panel fv-live-card">
        <div className="fv-live-card-head">
          <div className="fv-label">Heróis da mesa</div>
          {missing.length > 1 && (
            <button type="button" className="fv-live-link" disabled={s.busy} onClick={() => void s.addCombatants(missing.map(heroCombatant))}>
              Adicionar todos
            </button>
          )}
        </div>
        {heroes.length === 0 && <p className="fv-live-hint">Nenhuma ficha vinculada. Os jogadores vinculam na sala da mesa.</p>}
        <div className="fv-live-chips">
          {heroes.map((h) => {
            const added = inEncounter.has(h.share.sheetId);
            return (
              <button key={h.share.id} type="button" className={'fv-live-chip' + (added ? ' is-on' : '')} disabled={added || s.busy} onClick={() => void s.addCombatant(heroCombatant(h))}>
                {added ? '✓ ' : '+ '}
                {h.snapshot?.name ?? 'Ficha não visível'}
              </button>
            );
          })}
        </div>
      </section>

      <CreatureForm />

      <section className="fv-panel fv-live-card">
        <div className="fv-label">Iniciativa dos inimigos</div>
        <p className="fv-live-hint">Um d20 por grupo (iguais agem juntos) e um para cada criatura solta. Os jogadores rolam a própria.</p>
        <div className="fv-live-inline">
          <button type="button" className="fv-btn-gold" disabled={s.busy || enemiesWithout === 0} onClick={() => void s.rollEnemies(false)}>
            Rolar {enemiesWithout > 0 ? `${enemiesWithout} pendente${enemiesWithout > 1 ? 's' : ''}` : 'inimigos'}
          </button>
          <button type="button" className="fv-btn-ghost" disabled={s.busy || enemies === 0} onClick={() => void s.rollEnemies(true)}>
            Rolar todos de novo
          </button>
        </div>
      </section>
    </>
  );
}

function CreatureForm() {
  const s = useSessionStore();
  const [f, setF] = useState({ name: '', type: 'monster' as 'monster' | 'npc', qty: 1, bonus: 0, hp: '', ac: '', hidden: false, together: true });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v))));
  const submit = () => {
    if (!f.name.trim()) return;
    void s.addCombatants(buildCreatures({ ...f, hp: num(f.hp), ac: num(f.ac) }));
    setF((cur) => ({ ...cur, name: '', qty: 1 }));
  };
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-label">Criatura ou NPC</div>
      <form
        className="fv-live-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input className="fv-input fv-live-f-name" placeholder="Nome (ex.: Goblin)" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={50} required />
        <div className="fv-live-seg" role="group" aria-label="Tipo">
          {(['monster', 'npc'] as const).map((t) => (
            <button key={t} type="button" className={f.type === t ? 'is-on' : ''} onClick={() => set('type', t)}>
              {t === 'monster' ? 'Monstro' : 'NPC'}
            </button>
          ))}
        </div>
        <label>Qtd.<input className="fv-input" type="number" min={1} max={20} value={f.qty} onChange={(e) => set('qty', Number(e.target.value) || 1)} /></label>
        <label>Inic.<input className="fv-input" type="number" min={-5} max={15} value={f.bonus} onChange={(e) => set('bonus', Number(e.target.value) || 0)} /></label>
        <label>PV<input className="fv-input" inputMode="numeric" value={f.hp} onChange={(e) => set('hp', e.target.value)} /></label>
        <label>CA<input className="fv-input" inputMode="numeric" value={f.ac} onChange={(e) => set('ac', e.target.value)} /></label>
        <div className="fv-live-checks">
          {f.qty > 1 && (
            <label><input type="checkbox" checked={f.together} onChange={(e) => set('together', e.target.checked)} /> Agem juntos</label>
          )}
          <label><input type="checkbox" checked={f.hidden} onChange={(e) => set('hidden', e.target.checked)} /> Oculto dos jogadores</label>
        </div>
        <button type="submit" className="fv-btn-gold" disabled={s.busy || !f.name.trim()}>
          Adicionar{f.qty > 1 ? ` ${f.qty}` : ''}
        </button>
      </form>
    </section>
  );
}
