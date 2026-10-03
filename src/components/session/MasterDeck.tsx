import { useState } from 'react';
import { confirmAction } from '@/store/feedbackStore';
import { derivedOf } from '@/lib/derivedCache';
import type { NewCombatant } from '@/services/encounterService';
import { useSessionStore } from '@/store/sessionStore';
import type { Character } from '@/types/character';
import type { SharedCharacterSheet } from '@/types/models';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { encounterBudget } from '@/engine/monsters';

export interface SharedHero {
  share: SharedCharacterSheet;
  snapshot: Character | null;
}

/** Combatente a partir da ficha vinculada (sem escrever na ficha: só lê o snapshot). */
export function heroCombatant(h: SharedHero): NewCombatant {
  const snap = h.snapshot;
  if (!snap) return { type: 'player', name: 'Herói', sheetId: h.share.sheetId };
  const d = derivedOf(snap);
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
const DIFF_CLASS: Record<string, string> = { trivial: 'is-trivial', fácil: 'is-easy', médio: 'is-medium', difícil: 'is-hard', mortal: 'is-deadly' };

/** Dificuldade do encontro (Guia do Mestre): heróis no encontro × monstros do bestiário. */
export function EncounterDifficulty({ heroes }: { heroes: SharedHero[] }) {
  const s = useSessionStore();
  const levels = s.combatants
    .filter((c) => c.type === 'player')
    .map((c) => heroes.find((h) => h.share.sheetId === c.sheetId)?.snapshot?.level ?? 0)
    .filter((l) => l > 0);
  const foes = s.combatants.filter((c) => c.type !== 'player' && c.monsterRef && MONSTER_BY_ID[c.monsterRef]);
  const unknown = s.combatants.filter((c) => c.type === 'monster' && !c.monsterRef).length;
  const b = encounterBudget(levels, foes.map((c) => MONSTER_BY_ID[c.monsterRef!].xp));
  if (!b || !foes.length) return null;
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-live-card-head">
        <div className="fv-label">Dificuldade</div>
        <span className={'fv-diff ' + DIFF_CLASS[b.difficulty]}>{b.difficulty}</span>
      </div>
      <div className="fv-diff-bar" aria-hidden>
        {(['easy', 'medium', 'hard', 'deadly'] as const).map((k) => (
          <i key={k} style={{ left: `${Math.min(100, (b.thresholds[k] / (b.thresholds.deadly * 1.25)) * 100)}%` }} />
        ))}
        <b style={{ width: `${Math.min(100, (b.adjusted / (b.thresholds.deadly * 1.25)) * 100)}%` }} />
      </div>
      <p className="fv-live-hint">
        {b.xp.toLocaleString('pt-BR')} XP ({b.adjusted.toLocaleString('pt-BR')} ajustado, ×{b.multiplier}) para {levels.length} herói{levels.length === 1 ? '' : 's'} de nível {[...new Set(levels)].join('/')}.
        {' '}Vitória: <b>{b.perPlayer.toLocaleString('pt-BR')} XP</b> por herói.
        {unknown > 0 && ` ${unknown} criatura${unknown > 1 ? 's' : ''} manual${unknown > 1 ? 'is' : ''} fora da conta.`}
      </p>
    </section>
  );
}

/** NPCs da campanha entram no encontro com os números secretos do mestre. */
/**
 * Recompensa: XP dos monstros derrotados (bestiário, PV 0) dividido entre os
 * heróis do encontro. O valor vai para a ficha de cada jogador sozinho.
 */
export function XpAward() {
  const s = useSessionStore();
  const heroes = s.combatants.filter((c) => c.type === 'player' && c.sheetId);
  const defeated = s.combatants.filter((c) => c.type !== 'player' && c.monsterRef && (c.hpCurrent ?? 1) <= 0);
  const pool = defeated.reduce((n, c) => n + (MONSTER_BY_ID[c.monsterRef!]?.xp ?? 0), 0);
  const suggested = heroes.length ? Math.floor(pool / heroes.length) : 0;
  const [amount, setAmount] = useState('');
  if (!heroes.length) return null;
  const value = amount.trim() === '' ? suggested : Number(amount);
  return (
    <section className="fv-panel fv-live-card">
      <div className="fv-label">Recompensa em XP</div>
      <p className="fv-live-hint">
        {defeated.length
          ? `${defeated.length} derrotado${defeated.length > 1 ? 's' : ''} = ${pool.toLocaleString('pt-BR')} XP ÷ ${heroes.length} herói${heroes.length > 1 ? 's' : ''}.`
          : 'Monstros do bestiário com 0 PV entram na conta sozinhos. Ou digite um valor (marco, missão…).'}
      </p>
      <div className="fv-xp-award">
        <input className="fv-input" inputMode="numeric" placeholder={String(suggested)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} aria-label="XP por herói" />
        <button
          type="button"
          className="fv-btn-gold"
          disabled={s.busy || !value}
          onClick={async () => {
            if (await confirmAction({ title: `Dar ${value} XP a cada herói?`, message: `Recebem: ${heroes.map((h) => h.name).join(', ')}.`, confirmLabel: 'Dar XP' })) {
              void s.awardXp(value, s.encounter?.name);
              setAmount('');
            }
          }}
        >
          Dar {value || 0} XP a cada herói
        </button>
      </div>
    </section>
  );
}
