import type { Character } from '@/types/character';
import type { Feat, Race, Spell } from '@/types/dnd';
import { createDraftCharacter } from '@/engine/characterBuilder';
import { characterImportError } from '@/engine/characterImport';
import { newId } from '@/store/character/ids';
import { APP_VERSION } from '@/lib/appVersion';

/**
 * Backup completo do perfil: todos os heróis, as imagens das pistas do diário
 * (que moram fora da ficha) e a biblioteca de homebrew. Um arquivo só, que
 * volta pelo "Restaurar backup" — inclusive em outro aparelho ou navegador.
 *
 * Este módulo é puro (montar, ler, planejar); quem toca no store e no
 * IndexedDB é o backupActions.ts.
 */

export const BACKUP_FORMAT = 'ficha-viva-backup';
export const BACKUP_VERSION = 1;

export interface FichaVivaBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  appVersion: string;
  profile: { id: string; name: string };
  characters: Character[];
  /** id da imagem → data URL. */
  clueImages: Record<string, string>;
  homebrew: { races: Race[]; spells: Spell[]; feats: Feat[] };
}

export interface BackupInput {
  profile: { id: string; name: string };
  characters: Character[];
  clueImages: Record<string, string>;
  homebrew: { races: Race[]; spells: Spell[]; feats: Feat[] };
  now?: number;
}

export function buildBackup(input: BackupInput): FichaVivaBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: input.now ?? Date.now(),
    appVersion: APP_VERSION,
    profile: input.profile,
    characters: input.characters.filter((c) => !c.draft),
    clueImages: input.clueImages,
    homebrew: input.homebrew,
  };
}

/** Ids das imagens de pista usadas pelos heróis (as que o backup precisa levar). */
export function clueImageIds(characters: readonly Character[]): string[] {
  const ids = new Set<string>();
  for (const c of characters) for (const clue of c.diary?.clues ?? []) if (clue.imageId) ids.add(clue.imageId);
  return [...ids];
}

/** "ficha-viva-backup-2026-11-22.json" */
export function backupFileName(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `ficha-viva-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export interface ParsedBackup {
  backup: FichaVivaBackup;
  /** Heróis que não passaram na validação (o resto entra). */
  skipped: { name: string; error: string }[];
}

export type ParseResult = ({ ok: true } & ParsedBackup) | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const named = (key: string) => (x: unknown) => isRecord(x) && typeof x.id === 'string' && typeof x[key] === 'string';

/** Lê o arquivo. Aceita só o backup completo; uma ficha avulsa tem caminho próprio (Importar). */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Este arquivo não é um backup da Ficha Viva (não consegui ler o conteúdo).' };
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) {
    if (isRecord(raw) && typeof raw.name === 'string' && ('classId' in raw || 'raceId' in raw)) {
      return { ok: false, error: 'Este arquivo é uma ficha avulsa. Use “Importar” na lista de heróis para trazê-la.' };
    }
    return { ok: false, error: 'Este arquivo não é um backup da Ficha Viva.' };
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, error: 'Backup feito por uma versão mais nova do app. Atualize o app e tente de novo.' };
  }
  if (!Array.isArray(raw.characters)) return { ok: false, error: 'Backup danificado: a lista de heróis está faltando.' };

  const characters: Character[] = [];
  const skipped: ParsedBackup['skipped'] = [];
  const seen = new Set<string>();
  for (const item of raw.characters) {
    const name = isRecord(item) && typeof item.name === 'string' && item.name.trim() ? item.name : 'Herói sem nome';
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || typeof item.ownerId !== 'string') {
      skipped.push({ name, error: 'Ficha sem identificação.' });
      continue;
    }
    if (seen.has(item.id) || item.draft) continue;
    const error = characterImportError(item, createDraftCharacter({ ownerId: item.ownerId }));
    if (error) {
      skipped.push({ name, error });
      continue;
    }
    seen.add(item.id);
    characters.push(item as unknown as Character);
  }

  const images: Record<string, string> = {};
  if (isRecord(raw.clueImages)) {
    for (const [id, url] of Object.entries(raw.clueImages)) if (typeof url === 'string' && url.startsWith('data:image/')) images[id] = url;
  }
  const hb = isRecord(raw.homebrew) ? raw.homebrew : {};
  const list = <T,>(v: unknown, key: string) => (Array.isArray(v) ? (v.filter(named(key)) as T[]) : []);
  const profile = isRecord(raw.profile) ? raw.profile : {};

  return {
    ok: true,
    skipped,
    backup: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
      appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : '?',
      profile: { id: typeof profile.id === 'string' ? profile.id : '', name: typeof profile.name === 'string' ? profile.name : '' },
      characters,
      clueImages: images,
      homebrew: { races: list<Race>(hb.races, 'label'), spells: list<Spell>(hb.spells, 'name'), feats: list<Feat>(hb.feats, 'label') },
    },
  };
}

export interface RestoreConflict {
  incoming: Character;
  existing: Character;
  /** Qual versão foi editada por último. */
  newer: 'backup' | 'device';
}

export interface RestorePlan {
  /** Entram como heróis novos neste perfil. */
  fresh: Character[];
  /** Já existem aqui, com conteúdo diferente: a pessoa escolhe qual fica. */
  conflicts: RestoreConflict[];
  /** Já estão aqui exatamente como no backup. */
  unchanged: number;
}

/**
 * O que a restauração faria. Herói com o mesmo id em OUTRO perfil (ou outra
 * conta) não é tocado: entra como cópia, com id novo.
 */
export function planRestore(backup: FichaVivaBackup, current: readonly Character[], userId: string): RestorePlan {
  const byId = new Map(current.map((c) => [c.id, c]));
  const plan: RestorePlan = { fresh: [], conflicts: [], unchanged: 0 };
  for (const incoming of backup.characters) {
    const existing = byId.get(incoming.id);
    if (!existing) plan.fresh.push(incoming);
    else if (existing.ownerId !== userId) plan.fresh.push({ ...incoming, id: newId('pc'), syncBase: undefined, lastSyncedAt: undefined });
    else if (existing.updatedAt === incoming.updatedAt) plan.unchanged++;
    else plan.conflicts.push({ incoming, existing, newer: incoming.updatedAt > existing.updatedAt ? 'backup' : 'device' });
  }
  return plan;
}

// ── lembrete de backup (só para quem joga offline: com nuvem, a cópia já existe) ──

const LAST_KEY = 'fv-last-backup';
const SNOOZE_KEY = 'fv-backup-snooze';
export const BACKUP_REMIND_MS = 14 * 24 * 60 * 60 * 1000;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* sem localStorage: o lembrete só não se lembra */
  }
}

export const lastBackupAt = (): number => readNumber(LAST_KEY);
export const markBackup = (at = Date.now()) => writeNumber(LAST_KEY, at);
export const snoozeBackupReminder = (now = Date.now()) => writeNumber(SNOOZE_KEY, now + SNOOZE_MS);

/**
 * Hora de lembrar? Só sem nuvem, com heróis, e nunca feito ou feito há mais de
 * 14 dias — respeitando o "lembrar depois". O 1º lembrete espera o herói mais
 * antigo ter 3 dias (quem acabou de chegar não precisa disso ainda).
 */
export function backupDue(opts: { now?: number; cloud: boolean; heroes: readonly Pick<Character, 'createdAt'>[] }): boolean {
  const now = opts.now ?? Date.now();
  if (opts.cloud || !opts.heroes.length) return false;
  if (readNumber(SNOOZE_KEY) > now) return false;
  const last = lastBackupAt();
  if (last) return now - last > BACKUP_REMIND_MS;
  const oldest = Math.min(...opts.heroes.map((h) => h.createdAt || now));
  return now - oldest > 3 * 24 * 60 * 60 * 1000;
}
