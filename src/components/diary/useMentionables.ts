import { useEffect, useMemo, useState } from 'react';
import type { Character } from '@/types/character';
import type { Mentionable } from '@/engine/diary';
import { knownPlaces, norm } from '@/engine/diary';
import { useSheetNpcs } from './NpcMentions';
import { cloudEnabled, getSupabase } from '@/services/supabaseClient';
import { campaignService } from '@/services/campaignService';
import { useAuthStore } from '@/store/authStore';
import { heroAvatar, shortSubtitle } from '@/lib/summary';

/**
 * Heróis dos outros jogadores das mesmas campanhas desta ficha (para citar
 * com @). Fica guardado no aparelho: o diário cita os colegas mesmo offline.
 */
export function useSheetHeroes(sheetId: string): Mentionable[] {
  const user = useAuthStore((s) => s.user);
  const key = `fv-heroes-${sheetId}`;
  const [heroes, setHeroes] = useState<Mentionable[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const client = getSupabase();
    if (!cloudEnabled() || !client || !user || user.guest) return;
    let alive = true;
    void (async () => {
      try {
        const { data: links } = await client.from('shared_sheets').select('campaign_id').eq('sheet_id', sheetId);
        const ids = [...new Set((links ?? []).map((l: { campaign_id: string }) => l.campaign_id))];
        const seen = new Map<string, Mentionable>();
        for (const cid of ids) {
          for (const { share, snapshot } of await campaignService.sharedSheets(cid)) {
            if (share.sheetId === sheetId || !snapshot?.name?.trim() || seen.has(share.sheetId)) continue;
            seen.set(share.sheetId, {
              key: `hero:${share.sheetId}`,
              kind: 'hero',
              name: snapshot.name.trim(),
              portrait: snapshot.portrait || heroAvatar(snapshot),
              role: shortSubtitle(snapshot),
            });
          }
        }
        const list = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
        if (!alive) return;
        localStorage.setItem(key, JSON.stringify(list));
        setHeroes(list);
      } catch {
        /* offline: fica a lista guardada */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sheetId, user, key]);
  return heroes;
}

/** Quem dá para citar no diário desta ficha: NPCs revelados, heróis do grupo e lugares já marcados. */
export function useMentionables(char: Character): { people: Mentionable[]; places: Mentionable[] } {
  const npcs = useSheetNpcs(char.id);
  const heroes = useSheetHeroes(char.id);
  const people = useMemo(() => {
    const list: Mentionable[] = [
      ...npcs.map((n) => ({ key: `npc:${n.id}`, kind: 'npc' as const, name: n.name, portrait: n.portrait, role: n.role, summary: n.summary })),
      ...heroes,
    ];
    // mesmo nome em duas mesas: fica um só
    const seen = new Set<string>();
    return list.filter((m) => m.name.trim() && !seen.has(norm(m.name)) && seen.add(norm(m.name)));
  }, [npcs, heroes]);
  const places = useMemo(() => knownPlaces(char), [char]);
  return { people, places };
}
