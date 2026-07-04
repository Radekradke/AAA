import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { campaignService } from '@/services/campaignService';
import { cloudEnabled } from '@/services/supabaseClient';
import type { Campaign } from '@/types/models';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

/** Mesas/Campanhas: o mestre cria a sala; jogadores entram por convite. */
export function Campaigns() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const t = useTheme();
  const canCloud = cloudEnabled() && !!user && !user.guest;

  const [asMaster, setAsMaster] = useState<Campaign[]>([]);
  const [asPlayer, setAsPlayer] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!canCloud || !user) return;
    campaignService.myCampaigns(user.id).then((r) => { setAsMaster(r.asMaster); setAsPlayer(r.asPlayer); }).catch((e) => setError(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [canCloud, user?.id]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const c = await campaignService.createCampaign(user.id, name);
      navigate(`/mesa/${c.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar a mesa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll actions={<Button onClick={() => navigate('/personagens')} style={{ fontSize: 12.5 }}>Heróis</Button>}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(80px,11vh,110px) var(--page-x) 40px' }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(22px,4vw,30px)', color: 'var(--ink)' }}>
          Mesas de Campanha
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--muted)' }}>
          O mestre cria a sala e envia o link; jogadores vinculam suas fichas e o mestre acompanha tudo.
        </p>

        {!canCloud && (
          <EmptyState
            icon="banner"
            title="As mesas vivem na nuvem"
            hint="Entre com uma conta (e-mail ou Google) para criar ou participar de uma mesa — o modo convidado/offline não alcança a sala."
            action={<button className="fv-btn-gold" style={{ minHeight: 42, padding: '0 22px', fontSize: 13.5 }} onClick={() => navigate('/entrar')}>Entrar</button>}
          />
        )}

        {canCloud && (
          <>
            <div className="fv-panel" style={{ padding: 16, marginBottom: 18 }}>
              <div className="fv-label" style={{ marginBottom: 10 }}>Criar nova mesa (você será o mestre)</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="fv-input"
                  placeholder="Nome da campanha — ex.: A Maldição de Vharlok"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void create(); }}
                  style={{ flex: '1 1 220px' }}
                />
                <button onClick={() => void create()} disabled={busy || !name.trim()} className="fv-btn-gold" style={{ minHeight: 46, padding: '0 24px', fontSize: 14, opacity: busy || !name.trim() ? 0.6 : 1 }}>
                  {busy ? 'Criando…' : 'Fundar Mesa'}
                </button>
              </div>
              {error && <div style={{ marginTop: 9, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
            </div>

            {[{ label: 'Mesas que você comanda', list: asMaster, role: 'Mestre' }, { label: 'Mesas onde você joga', list: asPlayer, role: 'Jogador' }].map((g) => (
              <div key={g.label} style={{ marginBottom: 18 }}>
                <div className="fv-label" style={{ marginBottom: 10 }}>{g.label}</div>
                {g.list.length === 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {g.role === 'Mestre' ? 'Nenhuma ainda — funde a primeira acima.' : 'Nenhuma — peça o link de convite ao seu mestre.'}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 10 }}>
                  {g.list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/mesa/${c.id}`)}
                      className="fv-surface"
                      style={{ cursor: 'pointer', textAlign: 'left', padding: '14px 15px', border: '1px solid ' + hexA(t.gold, 0.3) }}
                    >
                      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15.5, color: 'var(--ink)' }}>{c.name}</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: g.role === 'Mestre' ? t.gold : 'var(--acc)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{g.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Screen>
  );
}
