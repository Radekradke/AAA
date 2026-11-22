import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { backupDue, lastBackupAt, snoozeBackupReminder } from '@/lib/backup';
import { isCloudUserId } from '@/lib/identity';

/**
 * Lembrete gentil para quem joga sem conta na nuvem: os heróis existem só
 * neste aparelho. Aparece se nunca houve backup (depois de alguns dias de uso)
 * ou se o último tem mais de 14 dias. "Lembrar depois" cala por 7 dias.
 */
export function BackupReminder() {
  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const heroes = useMemo(() => (user ? characters.filter((c) => c.ownerId === user.id && !c.draft) : []), [characters, user]);
  const due = useMemo(() => !!user && backupDue({ cloud: isCloudUserId(user.id), heroes }), [user, heroes]);
  if (!user || closed || !due) return null;

  const last = lastBackupAt();
  const days = last ? Math.floor((Date.now() - last) / 86_400_000) : 0;

  const download = async () => {
    setBusy(true);
    try {
      const { collectBackup, downloadBackup } = await import('@/lib/backupActions');
      downloadBackup(await collectBackup({ id: user.id, name: user.name }));
      toast('Backup baixado. Guarde o arquivo num lugar seguro (nuvem, e-mail, pendrive).', { tone: 'ok', ms: 6000 });
      setClosed(true);
    } catch {
      toast('Não consegui montar o backup. Tente em Configurações → Backup.', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fv-panel fv-rescue" aria-labelledby="fv-backup-remind-t">
      <div className="fv-rescue-head">
        <div>
          <h2 id="fv-backup-remind-t">{last ? `Seu último backup foi há ${days} dias` : 'Seus heróis vivem só neste aparelho'}</h2>
          <p>
            Sem conta na nuvem, um backup em arquivo é o que traz tudo de volta se o aparelho for trocado ou o navegador limpar os dados. Leva um segundo.
          </p>
        </div>
        <div className="fv-rescue-actions">
          <button type="button" className="fv-btn-gold fv-rescue-btn" onClick={() => void download()} disabled={busy} aria-busy={busy}>
            {busy ? 'Preparando…' : 'Baixar backup'}
          </button>
          <button
            type="button"
            className="fv-btn-ghost fv-rescue-btn"
            onClick={() => {
              snoozeBackupReminder();
              setClosed(true);
            }}
          >
            Lembrar depois
          </button>
        </div>
      </div>
    </section>
  );
}
