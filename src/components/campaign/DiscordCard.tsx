import { useEffect, useState } from 'react';
import { isDiscordWebhook } from '@/engine/discord';
import { sendTest, setTableWebhook } from '@/lib/discordRelay';
import { discordService } from '@/services/discordService';
import { toast } from '@/store/feedbackStore';

/** Como pegar o endereço no Discord (aparece nas duas telas). */
export function WebhookHowTo() {
  return (
    <details className="fv-discord-how">
      <summary>Como pegar o webhook</summary>
      <ol>
        <li>No Discord, abra as configurações do canal (engrenagem ao lado do nome).</li>
        <li>Integrações → Webhooks → Novo webhook.</li>
        <li>Copie a URL do webhook e cole aqui.</li>
      </ol>
    </details>
  );
}

/**
 * Campo do webhook: mostra só o fim do endereço (ele é segredo), testa,
 * salva e remove. Usado na sala (mestre) e em Configurações (pessoal).
 */
export function WebhookField({ saved, who, onSave, onRemove, label }: { saved: string | null; who: string; onSave: (url: string) => Promise<void> | void; onRemove: () => Promise<void> | void; label: string }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = isDiscordWebhook(draft.trim());

  const run = async (fn: () => Promise<unknown> | unknown, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok, { tone: 'ok' });
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const test = (url: string) =>
    run(async () => {
      if (!(await sendTest(url, who))) throw new Error('O Discord não aceitou. Confira se o webhook não foi apagado.');
    }, 'Mensagem de teste enviada ao canal.');

  if (saved) {
    return (
      <div className="fv-discord-field">
        <span className="fv-discord-saved" title="O endereço completo fica escondido">Webhook ligado · …{saved.slice(-6)}</span>
        <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void test(saved)}>Testar envio</button>
        <button type="button" className="fv-btn-ghost is-danger" disabled={busy} onClick={() => void run(onRemove, 'Discord desligado.')}>Remover</button>
      </div>
    );
  }
  return (
    <form className="fv-discord-field" onSubmit={(e) => { e.preventDefault(); if (valid) void run(async () => { await onSave(draft.trim()); setDraft(''); }, 'Discord ligado.'); }}>
      <input className="fv-input" type="password" autoComplete="off" aria-label={label} placeholder="https://discord.com/api/webhooks/…" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button type="button" className="fv-btn-ghost" disabled={!valid || busy} onClick={() => void test(draft.trim())}>Testar</button>
      <button type="submit" className="fv-btn-gold" disabled={!valid || busy}>Salvar</button>
      {draft && !valid && <small className="fv-discord-bad">Não parece um webhook do Discord.</small>}
    </form>
  );
}

/**
 * Discord da mesa (só o mestre vê): rolagens públicas da mesa ao vivo vão
 * para o canal. O webhook fica no banco, legível só pelo mestre.
 */
export function DiscordCard({ campaignId }: { campaignId: string }) {
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    discordService.get(campaignId).then((d) => {
      if (!alive) return;
      setSaved(d?.webhookUrl ?? null);
      setTableWebhook(campaignId, d?.enabled ? d.webhookUrl : null);
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [campaignId]);

  return (
    <section className="fv-panel fv-discord" aria-labelledby="fv-discord-title">
      <h2 id="fv-discord-title" className="fv-label">Discord da mesa</h2>
      <p className="fv-discord-hint">
        Na mesa ao vivo, as rolagens <b>públicas</b> aparecem no canal com o nome do herói e o total. "Só mestre" e "Só eu" não vão. O envio sai do seu navegador, então a mesa precisa estar aberta com você.
      </p>
      <WebhookField
        saved={saved}
        who="Mestre"
        label="Webhook do Discord da mesa"
        onSave={async (url) => {
          await discordService.save(campaignId, url);
          setSaved(url);
          setTableWebhook(campaignId, url);
        }}
        onRemove={async () => {
          await discordService.remove(campaignId);
          setSaved(null);
          setTableWebhook(campaignId, null);
        }}
      />
      <WebhookHowTo />
    </section>
  );
}
