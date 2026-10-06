import { useUiStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { addCrit, addDeed, DEED_KINDS } from '@/engine/deeds';
import type { DeedDef, DeedKind } from '@/engine/deeds';
import { availableTitles, titleName } from '@/engine/titles';
import { addHunt, isHuntRef } from '@/engine/hunts';
import type { Character } from '@/types/character';

/** Aviso de selo novo na carta do herói. */
export function announceDeeds(fresh: DeedDef[]): void {
  for (const d of fresh) toast(`Feito conquistado: ${d.name}! — ${d.desc}`, { tone: 'ok', ms: 6500 });
}

/** Grava os feitos e avisa os títulos que eles acabaram de liberar. */
function saveDeeds(char: Character, deeds: Character['deeds']): void {
  const before = new Set(availableTitles(char).map((t) => t.id));
  useCharacterStore.getState().setDeeds(char.id, deeds!);
  for (const t of availableTitles({ ...char, deeds })) {
    if (!before.has(t.id)) toast(`Novo título: ${titleName(t, char.gender)}! “${t.lore}” — escolha em Retrato → Título.`, { tone: 'ok', ms: 7500 });
  }
}

/** Soma um contador na ficha e devolve os selos recém-conquistados. */
export function recordDeed(id: string, kind: DeedKind, by = 1): DeedDef[] {
  const char = useCharacterStore.getState().getCharacter(id);
  if (!char || !by) return [];
  const res = addDeed(char.deeds, kind, by);
  saveDeeds(char, res.deeds);
  return res.unlocked;
}

/** 20 natural (com a "Fúria dos dados" no 3º do dia). */
function recordCrit(id: string): DeedDef[] {
  const store = useCharacterStore.getState();
  const char = store.getCharacter(id);
  if (!char) return [];
  const res = addCrit(char.deeds);
  saveDeeds(char, res.deeds);
  return res.unlocked;
}

/**
 * Golpe final numa criatura do bestiário: soma no bestiário de caçadas e
 * avisa a carta nova ou o que o herói passou a saber dela.
 */
export async function recordHunt(sheetId: string, monsterRef: string): Promise<void> {
  const char = useCharacterStore.getState().getCharacter(sheetId);
  if (!char || !isHuntRef(monsterRef)) return;
  const res = addHunt(char.deeds, monsterRef);
  if (res.deeds === char.deeds) return;
  useCharacterStore.getState().setDeeds(sheetId, res.deeds);
  if (!res.tier) return;
  // nome da criatura sob demanda (o bestiário não pesa a primeira tela)
  const name = (await import('@/data/bestiary')).MONSTER_BY_ID[monsterRef]?.name ?? 'criatura';
  if (res.tier.min === 1) toast(`Nova carta de caçada: ${name}! Veja em Retrato → Suas cartas.`, { tone: 'ok', ms: 6500 });
  else toast(`Caçada — ${name}: ${res.tier.label}! Agora você conhece ${res.tier.reveals}.`, { tone: 'ok', ms: 7500 });
}

/** Evento do mestre (golpe final): soma cada contador válido, a caçada e avisa os selos. */
export function applyDeedKinds(sheetId: string, kinds: string[], monsterRef?: string | null): void {
  const valid = kinds.filter((k): k is DeedKind => DEED_KINDS.includes(k as DeedKind));
  announceDeeds(valid.flatMap((k) => recordDeed(sheetId, k)));
  if (monsterRef) void recordHunt(sheetId, monsterRef);
}

let started = false;

/**
 * Feitos automáticos da própria ficha (rodam em qualquer tela):
 * - 20 / 1 natural no d20 (rolagens com a ficha), 3 críticos no mesmo dia e
 *   o 20 no teste contra a morte;
 * - caiu a 0 PV / voltou de 0 PV / ficou com 1 PV.
 * O golpe final vem do mestre (evento hero_deed, em sessionStore).
 */
export function startDeedTracker(): void {
  if (started) return;
  started = true;

  useUiStore.subscribe((s, prev) => {
    const r = s.history[0];
    if (!r || r === prev.history[0] || !r.charId || r.ally || r.damage || r.sides !== 20) return;
    if (Date.now() - r.timestamp > 5000) return; // histórico hidratado, não é rolagem nova
    const store = useCharacterStore.getState();
    if (!store.getCharacter(r.charId)) return;
    if (r.crit) announceDeeds([...recordCrit(r.charId), ...(r.deathSave ? recordDeed(r.charId, 'deathSaveCrits') : [])]);
    else if (r.fail) announceDeeds(recordDeed(r.charId, 'fumbles'));
  });

  // PV de cada ficha visto por último (só conta a partir da segunda leitura)
  const lastHp = new Map<string, number>();
  for (const c of useCharacterStore.getState().characters) lastHp.set(c.id, c.hpCurrent);
  useCharacterStore.subscribe((s) => {
    const fresh: DeedDef[] = [];
    const queue: [string, 'downs' | 'comebacks' | 'clutch'][] = [];
    for (const c of s.characters) {
      if (c.draft) continue;
      const before = lastHp.get(c.id);
      lastHp.set(c.id, c.hpCurrent);
      if (before === undefined || before === c.hpCurrent) continue;
      if (before > 0 && c.hpCurrent === 0) queue.push([c.id, 'downs']);
      else if (before === 0 && c.hpCurrent > 0) queue.push([c.id, 'comebacks']);
      else if (before > 1 && c.hpCurrent === 1) queue.push([c.id, 'clutch']); // levou o golpe e ficou de pé com 1 PV
    }
    // fora do laço: recordDeed dispara esta assinatura de novo (sem mudança de PV)
    for (const [id, kind] of queue) fresh.push(...recordDeed(id, kind));
    announceDeeds(fresh);
  });
}
