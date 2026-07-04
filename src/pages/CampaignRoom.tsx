import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { campaignService, campaignNotes, subscribeRoom } from '@/services/campaignService';
import type { CampaignNote } from '@/services/campaignService';
import { DEFAULT_MASTER_PERMISSION } from '@/types/models';
import type { MasterPermission } from '@/types/models';
import { syncNow } from '@/services/offlineSyncService';
import { deriveCharacter } from '@/engine/dndRules';
import { getRace } from '@/data/races';
import { getClass } from '@/data/classes';
import { ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { modStr } from '@/engine/dice';
import type { Campaign, SharedCharacterSheet } from '@/types/models';
import type { Character } from '@/types/character';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';

/**
 * Sala da campanha: o mestre vê o link de convite e os cards vivos das
 * fichas dos jogadores (snapshot da nuvem, conforme permissões); o
 * jogador vincula/desvincula a própria ficha.
 */
export function CampaignRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const t = useTheme();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [shares, setShares] = useState<{ share: SharedCharacterSheet; snapshot: Character | null }[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [noteKind, setNoteKind] = useState<CampaignNote['kind']>('nota');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const isMaster = !!campaign && !!user && campaign.masterId === user.id;
  const mySheets = useMemo(
    () => characters.filter((c) => c.ownerId === user?.id && !c.draft),
    [characters, user?.id],
  );

  const load = useCallback(() => {
    if (!id) return;
    campaignService.getCampaign(id).then((c) => {
      setCampaign(c);
      if (!c) setError('Mesa não encontrada — você faz parte dela?');
    }).catch((e) => setError(e.message));
    campaignService.sharedSheets(id).then(setShares).catch(() => undefined);
    campaignNotes.list(id).then(setNotes).catch(() => undefined);
  }, [id]);
  useEffect(load, [load]);

  // AO VIVO: PV, vínculos e crônica atualizam sem apertar "Atualizar"
  useEffect(() => {
    if (!id) return;
    return subscribeRoom(id, load);
  }, [id, load]);

  // mestre: garante um convite reutilizável
  useEffect(() => {
    if (campaign && user && isMaster) {
      campaignService.ensureInvite(campaign, user.id)
        .then((inv) => setInvite(`${window.location.origin}/sala/${inv.token}`))
        .catch(() => undefined);
    }
  }, [campaign, user, isMaster]);

  const copy = () => {
    if (!invite) return;
    void navigator.clipboard.writeText(invite).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const share = async (sheetId: string) => {
    if (!id || !user) return;
    await syncNow(user.id); // garante que a ficha está na nuvem antes de vincular
    await campaignService.shareSheet(id, sheetId, user.id).catch((e) => setError(e.message));
    load();
  };
  const unshare = async (sheetId: string) => {
    if (!id) return;
    await campaignService.unshareSheet(id, sheetId).catch((e) => setError(e.message));
    load();
  };

  const sharedIds = new Set(shares.map((s) => s.share.sheetId));

  return (
    <Screen scroll actions={<Button onClick={() => navigate('/mesas')} style={{ fontSize: 12.5 }}>Mesas</Button>}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(80px,11vh,110px) var(--page-x) 40px' }}>
        <div className="fv-label" style={{ marginBottom: 4 }}>{isMaster ? 'Você comanda esta mesa' : 'Mesa de campanha'}</div>
        <h1 style={{ margin: '0 0 16px', fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(21px,3.6vw,28px)', color: 'var(--ink)' }}>
          {campaign?.name ?? 'Carregando…'}
        </h1>
        {error && <div style={{ marginBottom: 12, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        {/* convite (mestre) */}
        {isMaster && invite && (
          <div className="fv-panel" style={{ padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div className="fv-label" style={{ fontSize: 10.5, marginBottom: 4 }}>Link de convite — envie aos jogadores</div>
              <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12.5, color: 'var(--acc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invite}</div>
            </div>
            <button onClick={copy} className="fv-btn-gold" style={{ minHeight: 40, padding: '0 18px', fontSize: 13 }}>
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}

        {/* jogador: vincular a própria ficha */}
        {!isMaster && campaign && (
          <div className="fv-panel" style={{ padding: 14, marginBottom: 16 }}>
            <div className="fv-label" style={{ marginBottom: 9 }}>Suas fichas nesta mesa</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mySheets.map((c) => {
                const linked = sharedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => (linked ? void unshare(c.id) : void share(c.id))}
                    style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, minHeight: 38, padding: '8px 14px', borderRadius: 999, border: '1px solid ' + (linked ? t.gold : t.line), background: linked ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.24)', color: linked ? t.gold : 'var(--ink)' }}
                  >
                    {linked ? '✓ ' : '+ '}{c.name}
                  </button>
                );
              })}
              {mySheets.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Crie um herói primeiro na tela de personagens.</span>}
            </div>
            {/* permissões granulares por ficha vinculada — você decide o que o mestre pode */}
            {shares.filter((s) => s.share.ownerId === user?.id).map(({ share }) => {
              const perms = { ...DEFAULT_MASTER_PERMISSION, ...share.permissions };
              const setPerm = (key: keyof MasterPermission) =>
                void campaignService.shareSheet(id!, share.sheetId, user!.id, { ...perms, [key]: !perms[key] }).then(load);
              const sheetName = mySheets.find((c) => c.id === share.sheetId)?.name ?? 'Ficha';
              const defs: { key: keyof MasterPermission; label: string }[] = [
                { key: 'view', label: 'Ver ficha' },
                { key: 'editInventory', label: 'Conceder itens' },
                { key: 'editCampaignNotes', label: 'Anotar' },
                { key: 'editProgression', label: 'XP/Nível' },
              ];
              return (
                <div key={share.id} style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>O mestre pode em <b style={{ color: 'var(--ink)' }}>{sheetName}</b>:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {defs.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setPerm(d.key)}
                        style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, minHeight: 32, padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (perms[d.key] ? t.gold : t.line), background: perms[d.key] ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.24)', color: perms[d.key] ? t.gold : 'var(--muted)' }}
                      >
                        {perms[d.key] ? '✓ ' : ''}{d.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <p style={{ margin: '9px 0 0', fontSize: 11, color: 'var(--muted)' }}>
              Ao vincular, o mestre passa a ver o snapshot da sua ficha (atributos, PV, CA, recursos). Desvincule quando quiser.
            </p>
          </div>
        )}

        {/* fichas da mesa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <div className="fv-label">Heróis da mesa · {shares.length}</div>
          <button onClick={load} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--acc)', fontSize: 12, fontWeight: 600 }}>↺ Atualizar</button>
        </div>
        {shares.length === 0 && (
          <EmptyState icon="crest" title="Nenhuma ficha vinculada ainda" hint={isMaster ? 'Envie o link de convite — quando os jogadores vincularem as fichas, elas aparecem aqui ao vivo.' : 'Vincule sua ficha acima para o mestre acompanhar.'} />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 265px), 1fr))', gap: 12 }}>
          {shares.map(({ share, snapshot }) => (
            <SheetCard key={share.id} snapshot={snapshot} mine={share.ownerId === user?.id} />
          ))}
        </div>

        {/* Crônica da Mesa: notas, NPCs e missões (mestre escreve, todos leem) */}
        {campaign && (
          <div style={{ marginTop: 22 }}>
            <div className="fv-label" style={{ marginBottom: 10 }}>Crônica da Mesa · {notes.length}</div>
            {isMaster && (
              <div className="fv-panel" style={{ padding: 13, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['nota', 'npc', 'missao'] as const).map((k) => (
                    <button key={k} onClick={() => setNoteKind(k)} style={{ cursor: 'pointer', fontSize: 11.5, fontWeight: 700, minHeight: 32, padding: '5px 13px', borderRadius: 999, border: '1px solid ' + (noteKind === k ? t.gold : t.line), background: noteKind === k ? hexA(t.gold, 0.12) : 'transparent', color: noteKind === k ? t.gold : 'var(--muted)' }}>
                      {k === 'nota' ? 'Nota' : k === 'npc' ? 'NPC' : 'Missão'}
                    </button>
                  ))}
                  <input className="fv-input" placeholder="Título" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} style={{ flex: '1 1 160px', minHeight: 38, padding: '7px 12px', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="fv-input" placeholder="Detalhes (opcional)" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} style={{ flex: '1 1 220px', minHeight: 38, padding: '7px 12px', fontSize: 13 }} />
                  <button
                    onClick={() => {
                      if (!noteTitle.trim() || !user) return;
                      void campaignNotes.add(campaign.id, user.id, noteKind, noteTitle, noteBody).then(() => { setNoteTitle(''); setNoteBody(''); load(); });
                    }}
                    disabled={!noteTitle.trim()}
                    className="fv-btn-gold"
                    style={{ minHeight: 38, padding: '0 18px', fontSize: 13, opacity: noteTitle.trim() ? 1 : 0.5 }}
                  >
                    Registrar
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 9 }}>
              {notes.map((n) => (
                <div key={n.id} className="fv-surface" style={{ padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: n.kind === 'missao' ? t.gold : n.kind === 'npc' ? t.acc : 'var(--muted)' }}>
                      {n.kind === 'nota' ? 'NOTA' : n.kind === 'npc' ? 'NPC' : 'MISSÃO'}
                    </span>
                    {isMaster && (
                      <button onClick={() => void campaignNotes.remove(n.id).then(load)} aria-label="Remover" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12 }}>✕</button>
                    )}
                  </div>
                  <div style={{ marginTop: 3, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{n.title}</div>
                  {n.body && <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>{n.body}</div>}
                </div>
              ))}
              {notes.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{isMaster ? 'Registre a primeira nota, NPC ou missão da campanha.' : 'O mestre ainda não registrou nada.'}</span>}
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}

/** Card vivo da ficha compartilhada (leitura, estilo aba Mesa). */
function SheetCard({ snapshot, mine }: { snapshot: Character | null; mine: boolean }) {
  const t = useTheme();
  if (!snapshot) {
    return (
      <div className="fv-surface" style={{ padding: 14, fontSize: 12.5, color: 'var(--muted)' }}>
        Ficha vinculada — snapshot ainda não sincronizado (peça ao jogador para abrir o app online).
      </div>
    );
  }
  const d = deriveCharacter(snapshot);
  const pct = Math.max(0, Math.min(100, Math.round((snapshot.hpCurrent / Math.max(1, d.maxHp)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';
  return (
    <div className="fv-surface" style={{ padding: '13px 14px', border: '1px solid ' + hexA(mine ? t.acc : t.gold, 0.35) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <div style={{ minWidth: 0, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {snapshot.name}
        </div>
        {mine && <span style={{ flex: 'none', fontSize: 9, letterSpacing: '.1em', color: t.acc }}>SUA</span>}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--acc)' }}>
        {getRace(snapshot.raceId).label} · {getClass(snapshot.classId).label} · Nível {snapshot.level}
      </div>
      {/* PV */}
      <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 17, color: hpColor }}>
          {snapshot.hpCurrent}<span style={{ fontSize: '.65em', color: 'var(--muted)' }}>/{d.maxHp}</span>
        </span>
        <div style={{ flex: 1, height: 8, borderRadius: 3, background: 'rgba(0,0,0,.4)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: hpColor, transition: 'width .3s' }} />
        </div>
        <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--muted)' }}>CA <b style={{ color: 'var(--ink)' }}>{d.ac}</b></span>
      </div>
      {/* atributos */}
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
        {d.abilityList.map((a) => (
          <div key={a.key} style={{ textAlign: 'center', padding: '3px 0', borderRadius: 4, background: hexA(ABILITY_COLORS[a.key], 0.09) }}>
            <div style={{ fontSize: 7.5, fontFamily: "'Chakra Petch', monospace", color: ABILITY_COLORS[a.key] }}>{ABILITY_SHORT[a.key]}</div>
            <div style={{ fontSize: 11.5, fontFamily: "'Chakra Petch', monospace", fontWeight: 700, color: 'var(--ink)' }}>{modStr(a.mod)}</div>
          </div>
        ))}
      </div>
      {snapshot.combat.conditions.length > 0 && (
        <div style={{ marginTop: 7, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {snapshot.combat.conditions.map((c) => (
            <span key={c} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, border: '1px solid ' + hexA(t.danger, 0.5), color: t.danger }}>{c}</span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
        <Icon name="moon" size={10} /> Desloc. {String(d.speed).replace('.', ',')} m · Percep. passiva {d.passivePerception} · Prof. {modStr(d.proficiency)}
      </div>
    </div>
  );
}
