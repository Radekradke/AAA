import { useCharacterStore } from '@/store/characterStore';
import { mergeHomebrewLibrary, useHomebrewStore } from '@/store/homebrewStore';
import { exportClueImages, importClueImages } from '@/lib/clueImageStore';
import { recordVersion } from '@/services/sheetHistory';
import { backupFileName, buildBackup, clueImageIds, markBackup } from './backup';
import type { FichaVivaBackup, RestorePlan } from './backup';

/** Monta o backup do perfil atual (heróis, imagens das pistas, homebrew). */
export async function collectBackup(profile: { id: string; name: string }): Promise<FichaVivaBackup> {
  const characters = useCharacterStore.getState().characters.filter((c) => c.ownerId === profile.id && !c.draft);
  const clueImages = await exportClueImages(clueImageIds(characters), profile.id);
  const { races, spells, feats } = useHomebrewStore.getState();
  return buildBackup({ profile, characters, clueImages, homebrew: { races, spells, feats } });
}

/** Baixa o arquivo e anota a data (o lembrete conta a partir daqui). */
export function downloadBackup(backup: FichaVivaBackup): void {
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(backup.exportedAt);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackup(backup.exportedAt);
}

export interface RestoreSummary {
  added: number;
  replaced: number;
  images: number;
  homebrew: number;
}

/**
 * Aplica o plano. Ordem: imagens e homebrew primeiro (a ficha restaurada já
 * abre com a raça própria registrada e as pistas com imagem), heróis depois.
 * `useBackup`: nos conflitos, fica a versão do backup; senão, a deste aparelho.
 */
export async function applyRestore(backup: FichaVivaBackup, plan: RestorePlan, userId: string, useBackup: boolean): Promise<RestoreSummary> {
  const images = await importClueImages(backup.clueImages);
  const homebrew = mergeHomebrewLibrary(backup.homebrew);
  const take = useBackup ? plan.conflicts.map((c) => c.incoming) : [];
  // a versão deste aparelho vai para o histórico antes de ser trocada (dá para voltar)
  if (useBackup) await Promise.all(plan.conflicts.map((c) => recordVersion(c.existing, 'restore', 'Antes de restaurar o backup').catch(() => undefined)));
  const { added, replaced } = useCharacterStore
    .getState()
    .restoreBackupCharacters([...plan.fresh, ...take], userId, take.map((c) => c.id));
  return { added, replaced, images, homebrew };
}
