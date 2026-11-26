import { useSessionStore } from '@/store/sessionStore';
import type { KillBy } from '@/store/sessionStore';
import { sessionService } from '@/services/sessionService';
import { encounterService } from '@/services/encounterService';
import { confirmAction, toast } from '@/store/feedbackStore';
import type { Combatant } from '@/types/session';
import type { NewCombatant } from '@/services/encounterService';
import type { CampaignNpc, NpcSecret } from '@/types/npc';
import type { Character } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { rollEnemyInitiatives, rollInitiative } from '@/engine/encounter';

/**
 * Ações do mestre com DESFAZER (aviso com botão). Só onde desfazer é seguro e
 * exato: PV de criatura/NPC (a linha do encontro), ocultar/revelar e remoção
 * acidental. Dano em herói vai para a ficha do jogador por evento — lá o
 * desfazer não seria exato (PV temporário, testes contra a morte), então o
 * aviso não oferece.
 */
const fresh = (id: string) => useSessionStore.getState().combatants.find((c) => c.id === id) ?? null;

export async function hpWithUndo(c: Combatant, delta: number, opts?: { crit?: boolean; by?: KillBy | null }): Promise<void> {
  if (!delta) return;
  const s = useSessionStore.getState();
  await s.changeHp(c, delta, opts);
  if (useSessionStore.getState().error) return;
  const word = delta < 0 ? `${-delta} de dano em ${c.name}` : `${delta} de cura em ${c.name}`;
  if (c.type === 'player') {
    toast(`${word} — enviado para a ficha.`, { tone: 'info' });
    return;
  }
  const before = c.hpCurrent;
  const after = fresh(c.id)?.hpCurrent;
  toast(`${word}.`, {
    tone: delta < 0 ? 'danger' : 'ok',
    action: {
      label: 'Desfazer',
      run: () => {
        const now = fresh(c.id);
        if (!now || before === null) return;
        if (now.hpCurrent !== after) {
          toast('Os PV mudaram desde essa ação. Confira o valor e corrija no Inspetor.', { tone: 'info' });
          return;
        }
        void (async () => {
          const st = useSessionStore.getState();
          await st.updateCombatant(now.id, { hp_current: before });
          if (useSessionStore.getState().error || !st.me || !st.session || !st.campaignId) return;
          await sessionService.log(st.session.id, st.campaignId, st.me.userId, 'combatant_hp_undo',
            { name: now.name, before: now.hpCurrent, after: before }, now.hidden ? 'master' : 'public', { targetId: now.id });
          await st.refresh();
        })().catch((err: Error) => toast(err.message, { tone: 'danger' }));
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

/** "Kael", "Kael e Lyra", "Kael, Lyra e Tor". */
export function namesList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/**
 * Quem ainda falta rolar ao apertar "Iniciar combate": criaturas o mestre
 * rola sempre (uma rolagem por grupo, como no painel); heróis dependem da
 * escolha dele (rolar por eles ou esperar os jogadores).
 */
export function missingInitiatives(list: Combatant[], rollHeroes: boolean, rand: () => number = Math.random): { id: string; value: number }[] {
  const creatures = rollEnemyInitiatives(list, false, rand);
  const heroes = rollHeroes
    ? list.filter((c) => c.type === 'player' && c.initiative === null).map((c) => ({ id: c.id, value: rollInitiative(c.initiativeBonus, rand) }))
    : [];
  return [...creatures, ...heroes];
}

/**
 * Iniciar combate sem deixar ninguém no fim da fila por esquecimento:
 * criaturas sem iniciativa são roladas; heróis sem iniciativa, o mestre
 * escolhe — rolar por eles agora ou esperar os jogadores rolarem na ficha.
 */
export async function startCombatSmart(): Promise<void> {
  const s = useSessionStore.getState();
  if (!s.encounter) return;
  const heroes = s.combatants.filter((c) => c.type === 'player' && c.initiative === null);
  let rollHeroes = false;
  if (heroes.length) {
    const names = heroes.map((c) => c.name);
    rollHeroes = await confirmAction({
      title: `${namesList(names)} ainda não ${names.length > 1 ? 'rolaram' : 'rolou'} iniciativa`,
      message: 'Role por eles agora (d20 + bônus de iniciativa do herói) ou espere os jogadores rolarem na ficha — o combate começa quando você apertar de novo.',
      confirmLabel: names.length > 1 ? 'Rolar por eles e começar' : 'Rolar e começar',
      cancelLabel: 'Esperar',
    });
    if (!rollHeroes) return;
  }
  const values = missingInitiatives(s.combatants, rollHeroes);
  if (values.length) {
    await s.setInitiatives(values);
    if (useSessionStore.getState().error) return;
  }
  await useSessionStore.getState().startCombat();
  if (useSessionStore.getState().error || !values.length) return;
  const byId = new Map(useSessionStore.getState().combatants.map((c) => [c.id, c]));
  const heroText = heroes.filter((h) => values.some((v) => v.id === h.id)).map((h) => `${h.name} ${byId.get(h.id)?.initiative ?? ''}`.trim());
  const creatureCount = values.length - heroText.length;
  toast(
    `Iniciativa rolada${creatureCount ? ` para ${creatureCount} criatura${creatureCount > 1 ? 's' : ''}` : ''}${heroText.length ? `${creatureCount ? ' e' : ''} para ${namesList(heroText)}` : ''}.`,
    { tone: 'info' },
  );
}
