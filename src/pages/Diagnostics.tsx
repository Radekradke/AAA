import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { getSupabase, cloudEnabled } from '@/services/supabaseClient';

/**
 * Diagnóstico da nuvem: mostra, em tempo real, se o Supabase está
 * configurado, se há sessão ativa (auth.uid) e qual o erro EXATO que o
 * banco devolve ao ler fichas/campanhas. Serve para depurar login com
 * Google, recursão de RLS (erro 500) e políticas.
 */
type Check = { label: string; ok: boolean | null; detail: string };

function line(label: string, ok: boolean | null, detail: string): Check {
  return { label, ok, detail };
}

/** Corre uma promessa com teto de tempo, para nenhuma checagem travar a tela. */
function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`tempo esgotado (${ms / 1000}s) — rede/proxy não respondeu`)), ms)),
  ]);
}

export function Diagnostics() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const out: Check[] = [];
    const push = (c: Check) => { out.push(c); setChecks([...out]); }; // exibe progressivamente
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    push(line('Nuvem configurada (env)', cloudEnabled(), cloudEnabled() ? 'VITE_SUPABASE_URL e ANON_KEY presentes' : 'Faltam variáveis de ambiente — o app roda offline.'));
    push(line('Project URL', !!url, url ? url : 'ausente'));
    push(line('Chave anon/publishable', !!key, key ? `${key.slice(0, 12)}… (${key.startsWith('sb_') ? 'nova (publishable)' : key.startsWith('eyJ') ? 'JWT legada' : 'formato desconhecido'})` : 'ausente'));

    const sb = getSupabase();
    if (!sb) {
      push(line('Sessão', false, 'Sem cliente Supabase (nuvem desligada).'));
      setBusy(false);
      return;
    }

    // Sessão / auth.uid
    try {
      const { data, error } = await withTimeout(sb.auth.getSession(), 8000);
      const u = data.session?.user;
      if (error) push(line('Sessão (getSession)', false, error.message));
      else if (u) {
        const exp = data.session?.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString('pt-BR') : '—';
        push(line('Sessão ativa', true, `Logado como ${u.email ?? u.id}\nauth.uid = ${u.id}\nprovedor: ${(u.app_metadata as { provider?: string })?.provider ?? '—'}\nexpira: ${exp}`));
      } else {
        push(line('Sessão ativa', false, 'Nenhuma sessão — o banco te trata como anônimo (auth.uid nulo). Entre com e-mail ou Google.'));
      }
    } catch (e) {
      push(line('Sessão (getSession)', false, e instanceof Error ? e.message : String(e)));
    }

    // Leitura de fichas (revela recursão de RLS / auth)
    try {
      const { error, status } = await withTimeout(sb.from('sheets').select('id').limit(1), 8000);
      if (error) push(line('Ler tabela sheets', false, `HTTP ${status} · ${error.code ?? ''} ${error.message}${/recursion/i.test(error.message) ? '\n→ Recursão de RLS: re-execute o script da seção 5 do docs/SUPABASE.md.' : ''}`));
      else push(line('Ler tabela sheets', true, `OK (HTTP ${status})`));
    } catch (e) {
      push(line('Ler tabela sheets', false, e instanceof Error ? e.message : String(e)));
    }

    // Leitura de campanhas (Modo Mestre)
    try {
      const { error, status } = await withTimeout(sb.from('campaigns').select('id').limit(1), 8000);
      if (error) push(line('Ler tabela campaigns', false, `HTTP ${status} · ${error.code ?? ''} ${error.message}${/recursion/i.test(error.message) ? '\n→ Recursão de RLS: re-execute o script da seção 5.' : ''}${/does not exist|relation/i.test(error.message) ? '\n→ Tabelas de campanha não criadas: rode o script da seção 5.' : ''}`));
      else push(line('Ler tabela campaigns', true, `OK (HTTP ${status})`));
    } catch (e) {
      push(line('Ler tabela campaigns', false, e instanceof Error ? e.message : String(e)));
    }

    setBusy(false);
  }, []);

  useEffect(() => { void run(); }, [run]);

  return (
    <Screen scroll actions={<Button onClick={() => navigate('/entrar')} style={{ fontSize: 12.5 }}>Entrar</Button>}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(80px,11vh,110px) var(--page-x) 40px' }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(22px,4vw,30px)', color: 'var(--ink)' }}>
          Diagnóstico da Nuvem
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--muted)' }}>
          Verifica a conexão com o Supabase, a sessão (auth.uid) e o erro exato do banco. Útil para depurar o login com Google e as salas.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => void run()} disabled={busy} className="fv-btn-gold" style={{ minHeight: 42, padding: '0 20px', fontSize: 14, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Verificando…' : '↺ Rodar novamente'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checks.map((c, i) => (
            <div key={i} className="fv-panel" style={{ padding: '12px 14px', borderLeft: '3px solid ' + (c.ok === null ? 'var(--muted)' : c.ok ? '#3FC56B' : 'var(--danger)') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, flex: 'none', background: c.ok === null ? 'var(--muted)' : c.ok ? '#3FC56B' : 'var(--danger)', boxShadow: c.ok ? '0 0 8px #3FC56B' : c.ok === false ? '0 0 8px var(--danger)' : 'none' }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.label}</span>
              </div>
              <div style={{ marginTop: 5, marginLeft: 19, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'pre-wrap', fontFamily: "'Chakra Petch', monospace" }}>{c.detail}</div>
            </div>
          ))}
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
          Dica: se “Ler tabela sheets/campaigns” falhar com <b style={{ color: 'var(--ink)' }}>recursion</b> ou <b style={{ color: 'var(--ink)' }}>HTTP 500</b>, re-execute o script da seção 5 de <b style={{ color: 'var(--ink)' }}>docs/SUPABASE.md</b>. Se “Sessão ativa” estiver vermelho logo após entrar com Google, confira as <b style={{ color: 'var(--ink)' }}>Redirect URLs</b> no Supabase.
        </p>
      </div>
    </Screen>
  );
}
