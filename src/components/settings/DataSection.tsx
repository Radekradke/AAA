import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { formatBytes, requestPersistentStorage, storageStatus } from '@/lib/storagePersist';
import type { StorageStatus } from '@/lib/storagePersist';
import { lastBackupAt } from '@/lib/backup';
import type { FichaVivaBackup, ParsedBackup, RestorePlan } from '@/lib/backup';
import { isCloudUserId } from '@/lib/identity';
import { Modal } from '@/components/ui/Modal';
import { SetRow } from './SetRow';

const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

interface PendingRestore extends ParsedBackup {
  plan: RestorePlan;
}

/**
 * Configurações → Backup: proteção do armazenamento, espaço usado, backup
 * completo (heróis + imagens das pistas + homebrew) e restauração.
 */
export function DataSection({ iosNotInstalled, onIosGuide }: { iosNotInstalled: boolean; onIosGuide: () => void }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useCharactersHydrated();
  const heroCount = useCharacterStore((s) => (user ? s.characters.filter((c) => c.ownerId === user.id && !c.draft).length : 0));
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [lastAt, setLastAt] = useState(lastBackupAt);
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cloud = !!user && isCloudUserId(user.id);

  useEffect(() => {
    let alive = true;
    void storageStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  const protect = async () => {
    const ok = await requestPersistentStorage();
    setStatus(await storageStatus());
    toast(ok ? 'Armazenamento protegido: o navegador não apaga mais os heróis sozinho.' : 'O navegador não liberou a proteção agora. Faça backups de vez em quando.', {
      tone: ok ? 'ok' : 'info',
    });
  };

  const backup = async () => {
    if (!user) return;
    setBusy('backup');
    try {
      const { collectBackup, downloadBackup } = await import('@/lib/backupActions');
      const data = await collectBackup({ id: user.id, name: user.name });
      downloadBackup(data);
      setLastAt(data.exportedAt);
      const imgs = Object.keys(data.clueImages).length;
      toast(`Backup baixado: ${data.characters.length} herói(s)${imgs ? `, ${imgs} imagem(ns) do diário` : ''}.`, { tone: 'ok' });
    } catch {
      toast('Não consegui montar o backup. Tente de novo.', { tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setBusy('restore');
    void file
      .text()
      .then(async (text) => {
        const { parseBackup, planRestore } = await import('@/lib/backup');
        const parsed = parseBackup(text);
        if (!parsed.ok) return void toast(parsed.error, { tone: 'danger', ms: 7000 });
        const plan = planRestore(parsed.backup, useCharacterStore.getState().characters, user.id);
        setPending({ backup: parsed.backup, skipped: parsed.skipped, plan });
      })
      .catch(() => toast('Não consegui ler o arquivo.', { tone: 'danger' }))
      .finally(() => setBusy(null));
  };

  const persistHint = !status
    ? 'Verificando…'
    : !status.supported
      ? 'Este navegador não oferece proteção. Mantenha um backup em dia.'
      : status.persisted
        ? 'Protegido: o navegador não apaga os heróis para liberar espaço.'
        : 'Sem proteção, o navegador pode apagar os dados deste site quando faltar espaço ou após dias sem uso.';

  return (
    <section id="cfg-seguranca" className="fv-panel fv-set-card" aria-labelledby="cfg-seguranca-t">
      <h2 id="cfg-seguranca-t">Backup e armazenamento</h2>
      <p className="fv-set-lead">
        {cloud
          ? 'Seus heróis também ficam na sua conta na nuvem. O backup é uma cópia extra, em arquivo, que você guarda onde quiser.'
          : 'Sem conta na nuvem, os heróis existem só neste aparelho. Um backup em arquivo é o que salva tudo se o aparelho for trocado, formatado ou o navegador limpar os dados.'}
      </p>

      <SetRow title="Proteção do armazenamento" hint={persistHint}>
        {status?.supported && !status.persisted ? (
          <button type="button" className="fv-btn-gold fv-set-btn" onClick={() => void protect()}>
            Proteger
          </button>
        ) : (
          <span className={'fv-set-state' + (status?.persisted ? ' is-ok' : '')}>{status?.persisted ? 'Ativa' : '—'}</span>
        )}
      </SetRow>

      {iosNotInstalled && (
        <SetRow title="iPhone e iPad" hint="O Safari apaga dados de sites que ficam 7 dias sem uso. Instalado na Tela de Início, o app fica de fora dessa limpeza.">
          <button type="button" className="fv-btn-ghost fv-set-btn" onClick={onIosGuide}>
            Como instalar
          </button>
        </SetRow>
      )}

      {status?.usage !== undefined && (
        <SetRow
          title="Espaço usado"
          hint={`${status.quota ? `De ${formatBytes(status.quota)} disponíveis para este site. ` : ''}Inclui fichas, imagens do diário e o app para uso offline.`}
        >
          <span className="fv-set-state">{formatBytes(status.usage)}</span>
        </SetRow>
      )}

      <SetRow
        title="Backup completo"
        hint={
          !user
            ? 'Entre (ou continue offline) para fazer o backup dos seus heróis.'
            : `Todos os seus heróis, as imagens das pistas do diário e o seu homebrew, num arquivo só. ${
                lastAt ? `Último backup: ${dateLabel(lastAt)}.` : 'Nenhum backup feito neste aparelho ainda.'
              }`
        }
      >
        <button
          type="button"
          className="fv-btn-ghost fv-set-btn"
          disabled={!user || !hydrated || !heroCount || busy !== null}
          aria-busy={busy === 'backup'}
          onClick={() => void backup()}
        >
          {busy === 'backup' ? 'Preparando…' : 'Baixar backup'}
        </button>
      </SetRow>

      <SetRow title="Restaurar backup" hint="Traz de volta os heróis de um arquivo de backup. Antes de mudar qualquer coisa, mostra o que entra — nada é apagado.">
        <button
          type="button"
          className="fv-btn-ghost fv-set-btn"
          disabled={!user || !hydrated || busy !== null}
          aria-busy={busy === 'restore'}
          onClick={() => fileRef.current?.click()}
        >
          {busy === 'restore' ? 'Lendo…' : 'Escolher arquivo'}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pick} />
      </SetRow>

      {pending && user && <RestoreBackupModal pending={pending} userId={user.id} onClose={() => setPending(null)} />}
    </section>
  );
}

function RestoreBackupModal({ pending, userId, onClose }: { pending: PendingRestore; userId: string; onClose: () => void }) {
  const { backup, plan, skipped } = pending;
  const [useBackup, setUseBackup] = useState(false);
  const [running, setRunning] = useState(false);
  const images = Object.keys(backup.clueImages).length;
  const homebrew = backup.homebrew.races.length + backup.homebrew.spells.length + backup.homebrew.feats.length;
  const nothing = !plan.fresh.length && !plan.conflicts.length && !images && !homebrew;

  const run = async () => {
    setRunning(true);
    try {
      const { applyRestore } = await import('@/lib/backupActions');
      const r = await applyRestore(backup as FichaVivaBackup, plan, userId, useBackup);
      const parts = [
        r.added && `${r.added} herói(s) novo(s)`,
        r.replaced && `${r.replaced} substituído(s)`,
        r.images && `${r.images} imagem(ns) do diário`,
        r.homebrew && `${r.homebrew} item(ns) de homebrew`,
      ].filter(Boolean);
      toast(parts.length ? `Backup restaurado: ${parts.join(', ')}.` : 'Tudo do backup já estava neste aparelho.', { tone: 'ok', ms: 6000 });
      onClose();
    } catch {
      toast('A restauração falhou no meio. Nada foi apagado — tente de novo.', { tone: 'danger' });
      setRunning(false);
    }
  };

  return (
    <Modal
      title="Restaurar backup"
      icon="download"
      onClose={onClose}
      maxWidth={520}
      footer={
        <div className="fv-restore-foot">
          <button type="button" className="fv-btn-ghost fv-set-btn" onClick={onClose} disabled={running}>
            Cancelar
          </button>
          <button type="button" className="fv-btn-gold fv-set-btn" onClick={() => void run()} disabled={running || nothing}>
            {running ? 'Restaurando…' : 'Restaurar'}
          </button>
        </div>
      }
    >
      <div className="fv-restore">
        <p className="fv-restore-meta">
          Backup de <b>{backup.profile.name || 'um perfil'}</b>
          {backup.exportedAt ? ` · ${dateLabel(backup.exportedAt)}` : ''}
        </p>
        <ul className="fv-restore-counts">
          <li>
            <b>{plan.fresh.length}</b> herói(s) novo(s) para este perfil
          </li>
          {plan.unchanged > 0 && (
            <li>
              <b>{plan.unchanged}</b> já está(ão) aqui igualzinho — fica(m) como está(ão)
            </li>
          )}
          {images > 0 && (
            <li>
              <b>{images}</b> imagem(ns) de pistas do diário
            </li>
          )}
          {homebrew > 0 && (
            <li>
              <b>{homebrew}</b> raça(s), magia(s) ou talento(s) de homebrew
            </li>
          )}
        </ul>

        {plan.conflicts.length > 0 && (
          <fieldset className="fv-restore-conflicts">
            <legend>
              {plan.conflicts.length === 1 ? '1 herói existe' : `${plan.conflicts.length} heróis existem`} aqui e no backup, com diferenças
            </legend>
            <ul>
              {plan.conflicts.map((c) => (
                <li key={c.incoming.id}>
                  <b>{c.incoming.name}</b>
                  <small>
                    {c.newer === 'backup' ? 'O backup é mais recente' : 'Este aparelho é mais recente'} · aqui: nível {c.existing.level}, backup: nível {c.incoming.level}
                  </small>
                </li>
              ))}
            </ul>
            <label className="fv-restore-choice">
              <input type="radio" name="fv-restore-choice" checked={!useBackup} onChange={() => setUseBackup(false)} />
              <span>
                <b>Manter os deste aparelho</b>
                <small>Só entra o que não existe aqui.</small>
              </span>
            </label>
            <label className="fv-restore-choice">
              <input type="radio" name="fv-restore-choice" checked={useBackup} onChange={() => setUseBackup(true)} />
              <span>
                <b>Usar os do backup</b>
                <small>A versão deste aparelho vai para o histórico da ficha (dá para voltar).</small>
              </span>
            </label>
          </fieldset>
        )}

        {skipped.length > 0 && (
          <div className="fv-restore-skipped" role="note">
            <b>{skipped.length} ficha(s) do arquivo não passaram na conferência e ficam de fora:</b>
            <ul>
              {skipped.slice(0, 5).map((s, i) => (
                <li key={i}>
                  {s.name}: {s.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {nothing && <p className="fv-restore-meta">Tudo deste backup já está neste aparelho.</p>}
      </div>
    </Modal>
  );
}
