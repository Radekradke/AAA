import { useSessionStore } from '@/store/sessionStore';
import { encounterService } from '@/services/encounterService';
import { toast } from '@/store/feedbackStore';
import type { Combatant } from '@/types/session';
import type { NewCombatant } from '@/services/encounterService';
import type { CampaignNpc, NpcSecret } from '@/types/npc';
import type { Character } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { MONSTER_BY_ID } from '@/data/bestiary';

/**
 * Ações do mestre com DESFAZER (aviso com botão). Só onde desfazer é seguro e
 * exato: PV de criatura/NPC (a linha do encontro), ocultar/revelar e remoção
 * acidental. Dano em herói vai para a ficha do jogador por evento — lá o
 * desfazer não seria exato (PV temporário, testes contra a morte), então o
 * aviso não oferece.
 */
const fresh = (id: string) => useSessionStore.getState().combatants.find((c) => c.id === id) ?? null;

export async function hpWithUndo(c: Combatant, delta: number, opts?: { crit?: boolean; by?: { sheetId: string; name: string } | null }): Promise<void> {
  if (!delta) return;
  const s = useSessionStore.getState();
  await s.changeHp(c, delta, opts);
  const word = delta < 0 ? `${-delta} de dano em ${c.name}` : `${delta} de cura em ${c.name}`;
  if (c.type === 'player') {
    toast(`${word} — enviado para a ficha.`, { tone: 'info' });
    return;
  }
  const before = c.hpCurrent;
  toast(`${word}.`, {
    tone: delta < 0 ? 'danger' : 'ok',
    action: {
      label: 'Desfazer',
      run: () => {
        const now = fresh(c.id);
        if (now && before !== null) void useSessionStore.getState().updateCombatant(now.id, { hp_current: before });
      },
    },
  });
}

export async function toggleHiddenWithUndo(c: Combatant): Promise<void> {
  const s = useSessionStore.getState();
  await s.updateCombatant(c.id, { hidden: !c.hidden });
  toast(c.hidden ? `${c.name} foi revelado aos jogadores.` : `${c.name} ficou oculto dos jogadores.`, {
    tone: 'info',
    action: { label: 'Desfazer', run: () => void useSessionStore.getState().updateCombatant(c.id, { hidden: c.hidden }) },
  });
}

/** Tira do encontro; Desfazer recria a linha com iniciativa, PV e condições. */
export async function removeWithUndo(c: Combatant): Promise<void> {
  const s = useSessionStore.getState();
  await s.removeCombatant(c.id);
  toast(`${c.name} saiu do encontro.`, {
    tone: 'danger',
    action: {
      label: 'Desfazer',
      run: () => {
        const enc = useSessionStore.getState().encounter;
        if (!enc || enc.id !== c.encounterId) return;
        void (async () => {
          try {
            const back = await encounterService.add(enc.id, {
              type: c.type,
              name: c.name,
              sheetId: c.sheetId,
              initiativeBonus: c.initiativeBonus,
              hpCurrent: c.hpCurrent,
              hpMax: c.hpMax,
              armorClass: c.armorClass,
              hidden: c.hidden,
              groupKey: c.groupKey,
              monsterRef: c.monsterRef,
            });
            if (c.initiative !== null) await encounterService.setInitiative(back.id, c.initiative);
            if (c.conditions.length) await encounterService.update(back.id, { conditions: c.conditions });
          } catch (e) {
            toast(`Não deu para desfazer: ${(e as Error).message}`, { tone: 'danger' });
          } finally {
            await useSessionStore.getState().refresh();
          }
        })();
      },
    },
  });
}

/**
 * Improviso: adicionar criatura sem encontro aberto cria um na hora
 * ("Encontro improvisado"). Sem sessão aberta, avisa — o combate vive na sessão.
 */
export async function ensureEncounter(name = 'Encontro improvisado'): Promise<boolean> {
  const s = useSessionStore.getState();
  if (!s.session) {
    toast('Abra a sessão para começar um combate.', { tone: 'info' });
    return false;
  }
  if (s.encounter) return true;
  await s.createEncounter(name);
  return !!useSessionStore.getState().encounter;
}

export async function addToEncounter(list: NewCombatant[], label?: string): Promise<void> {
  if (!list.length || !(await ensureEncounter())) return;
  await useSessionStore.getState().addCombatants(list);
  if (!useSessionStore.getState().error) toast(label ?? `${list.length === 1 ? list[0].name : `${list.length} criaturas`} no encontro.`);
}

/** NPC da campanha vira combatente com os números secretos do mestre (ou da ficha/bestiário). */
export function npcToCombatant(n: CampaignNpc, secrets: Record<string, NpcSecret>, characters: Character[]): NewCombatant {
  const st = secrets[n.id]?.stats ?? {};
  const sheet = st.sheetId ? characters.find((c) => c.id === st.sheetId) : undefined;
  const d = sheet ? deriveCharacter(sheet) : null;
  const base = st.monsterRef ? MONSTER_BY_ID[st.monsterRef] : undefined;
  return {
    type: 'npc',
    name: n.name,
    initiativeBonus: d?.initiative ?? st.initiativeBonus ?? 0,
    hpCurrent: d ? sheet!.hpCurrent ?? d.maxHp : st.hp ?? base?.hp ?? null,
    hpMax: d?.maxHp ?? st.hp ?? base?.hp ?? null,
    armorClass: d?.ac ?? st.ac ?? base?.ac ?? null,
    hidden: !n.revealed,
    monsterRef: st.monsterRef ?? null,
  };
}
