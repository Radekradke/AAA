import type { Character } from '@/types/character';
import type { NpcStats } from '@/types/npc';
import { derivedOf } from './derivedCache';
import { heroAvatar, shortSubtitle } from './summary';
import { processPortraitFile } from './portrait';

/**
 * Herói da conta do mestre → NPC da campanha. O NPC nasce oculto dos
 * jogadores (o mestre revela quando quiser), com papel "Raça · Classe nv",
 * CA/PV/iniciativa/nível da ficha e o vínculo com ela (sheetId) — o mestre
 * continua controlando como um herói.
 */
export function npcFromHero(c: Character): { name: string; role: string; stats: NpcStats; notes: string } {
  const d = derivedOf(c);
  return {
    name: (c.name || 'Sem nome').slice(0, 80),
    role: shortSubtitle(c).slice(0, 120),
    stats: { ac: d.ac, hp: d.maxHp, initiativeBonus: d.initiative, level: c.level, sheetId: c.id },
    notes: `Importado da sua ficha "${c.name || 'Sem nome'}".`,
  };
}

/** Já existe um NPC ligado a esta ficha? */
export function importedSheetIds(secrets: Record<string, { stats: NpcStats }>): Set<string> {
  return new Set(Object.values(secrets).map((s) => s.stats.sheetId).filter((id): id is string => !!id));
}

/**
 * Retrato leve (data URL) a partir da arte do herói — oficial ou enviada.
 * NPC vai para o banco e para o diário de todos: 320×400, JPEG/WebP.
 * Falhou (arte fora do ar)? O NPC fica com a inicial.
 */
export async function npcPortraitFromHero(c: Character): Promise<string | null> {
  try {
    const res = await fetch(heroAvatar(c));
    if (!res.ok) return null;
    const blob = await res.blob();
    const file = new File([blob], 'retrato', { type: blob.type || 'image/webp' });
    const { dataUrl } = await processPortraitFile(file, { cutout: false, max: { w: 320, h: 400 }, quality: 0.8 });
    return dataUrl;
  } catch {
    return null;
  }
}
