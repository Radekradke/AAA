import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { catchUpHeroEvents } from '@/store/sessionStore';
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
import { toast } from '@/store/feedbackStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { derivedOf } from '@/lib/derivedCache';
import { raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { modStr } from '@/engine/dice';
import type { Campaign, InviteLink, SharedCharacterSheet } from '@/types/models';
import type { Character } from '@/types/character';
import { useInk } from '@/lib/contrast';
import { Icon, InlineIcon } from '@/components/ui/Icon';
import { SessionEntryCard } from '@/components/session/SessionEntryCard';
import { NpcGallery } from '@/components/campaign/NpcGallery';
import '@/styles/session.css';
import '@/styles/stage.css';
import '@/styles/campaign-room.css';
import { InviteCard } from '@/components/campaign/InviteCard';
import { SchemaNotice } from '@/components/campaign/SchemaNotice';
import { AgendaCard } from '@/components/campaign/AgendaCard';
import { DiscordCard } from '@/components/campaign/DiscordCard';
import { LeaveCampaignButton, MembersCard } from '@/components/campaign/MembersCard';

const PasteImportModal = lazy(() => import('@/components/character/PasteImportModal').then((m) => ({ default: m.PasteImportModal })));

// bestiário (65 criaturas com ficha e arte): só o mestre vê, baixa sob demanda
const BestiaryGallery = lazy(() => import('@/components/bestiary/BestiaryGallery').then((m) => ({ default: m.BestiaryGallery })));

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

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [invite, setInvite] = useState<InviteLink | null>(null);
  const [shares, setShares] = useState<{ share: SharedCharacterSheet; snapshot: Character | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [noteKind, setNoteKind] = useState<CampaignNote['kind']>('nota');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [pasting, setPasting] = useState(false);

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

  // jogador: dano, cura, XP e itens que o mestre mandou enquanto o app estava fechado
  useEffect(() => {
    if (campaign && user && !user.guest && campaign.masterId !== user.id) void catchUpHeroEvents(campaign.id, campaign.masterId, true);
  }, [campaign, user]);

  // mestre: garante um convite reutilizável (com código curto e QR)
  useEffect(() => {
    if (campaign && user && isMaster) {
      campaignService.ensureInvite(campaign, user.id).then(setInvite).catch(() => undefined);
    }
  }, [campaign, user, isMaster]);

  // ficha sendo vinculada/desvinculada agora (o botão mostra e não aceita toque duplo)
  const [linking, setLinking] = useState<string | null>(null);
  const heroName = (sheetId: string) => mySheets.find((c) => c.id === sheetId)?.name ?? 'Ficha';

  const share = async (sheetId: string, permissions?: MasterPermission) => {
    if (!id || !user || linking) return;
    setLinking(sheetId);
    try {
      // a ficha precisa estar na nuvem para o mestre ver a cópia atual
      await syncNow(user.id).catch(() => undefined);
      const cloud = useSaveStatusStore.getState().cloud;
      const behind = cloud === 'error' || cloud === 'offline' || cloud === 'conflict';
      await campaignService.shareSheet(id, sheetId, user.id, permissions);
      setError(null);
      toast(
        behind
          ? `${heroName(sheetId)} vinculada. A cópia do mestre atualiza quando a sincronização voltar.`
          : `${heroName(sheetId)} vinculada: o mestre já vê sua ficha.`,
        { tone: behind ? 'info' : 'ok' },
      );
    } catch (e) {
      toast(`Não consegui vincular: ${(e as Error).message}`, { tone: 'danger' });
    } finally {
      setLinking(null);
      load();
    }
  };
  const unshare = async (sheetId: string) => {
    if (!id || linking) return;
    // guarda as permissões para o "Desfazer" devolver exatamente como estava
    const before = shares.find((x) => x.share.sheetId === sheetId)?.share.permissions;
    setLinking(sheetId);
    try {
      await campaignService.unshareSheet(id, sheetId);
      setError(null);
      toast(`${heroName(sheetId)} saiu desta mesa: o mestre não vê mais a ficha.`, {
        tone: 'info',
        action: { label: 'Desfazer', run: () => void share(sheetId, before ? { ...DEFAULT_MASTER_PERMISSION, ...before } : undefined) },
      });
    } catch (e) {
      toast(`Não consegui desvincular: ${(e as Error).message}`, { tone: 'danger' });
    } finally {
      setLinking(null);
      load();
    }
  };

  const myLinkedCount = shares.filter(({ share }) => share.ownerId === user?.id).length;
  const sharedIds = new Set(shares.map((s) => s.share.sheetId));

  return (
    <Screen scroll actions={<Button className="fv-below-nav fv-room-back" onClick={() => navigate('/mesas')}>‹ Mesas</Button>}>
      <div className="fv-room">
        <div className="fv-label fv-room-kicker">{isMaster ? 'Você comanda esta mesa' : 'Mesa de campanha'}</div>
        <h1 className="fv-room-title">
          {campaign?.name ?? 'Carregando…'}
        </h1>
        {error && <div className="fv-room-error">{error}</div>}

        {/* sessão ao vivo (a mesa em si mora em /mesa/:id/jogar) */}
        {campaign && user && !user.guest && <SessionEntryCard campaignId={campaign.id} isMaster={isMaster} linkedCount={isMaster ? undefined : myLinkedCount} />}

        {/* agenda: a próxima sessão marcada e quem vai */}
        {campaign && user && !user.guest && (
          <AgendaCard
            campaignId={campaign.id}
            campaignName={campaign.name}
            isMaster={isMaster}
            userId={user.id}
            userName={user.name}
            heroName={mySheets.find((c) => sharedIds.has(c.id))?.name}
          />
        )}

        {/* banco desatualizado: o mestre vê qual script falta */}
        {isMaster && <SchemaNotice />}

        {/* Discord da mesa (mestre): rolagens públicas no canal */}
        {isMaster && campaign && user && !user.guest && <DiscordCard campaignId={campaign.id} />}

        {/* convite (mestre): código, link e QR */}
        {isMaster && invite && campaign && (
          <InviteCard invite={invite} campaignName={campaign.name} onNewCode={async () => setInvite(await campaignService.newCode(invite))} />
        )}

        {/* jogadores (mestre): quem está na mesa e remover quem deixou o grupo */}
        {isMaster && campaign && <MembersCard campaignId={campaign.id} version={shares.length} />}

        {/* jogador: vincular a própria ficha */}
        {!isMaster && campaign && (
          <div className="fv-panel fv-room-mine">
            <div className="fv-label fv-room-mine-label">Suas fichas nesta mesa</div>
            <div className="fv-room-wrap">
              {mySheets.map((c) => {
                const linked = sharedIds.has(c.id);
                const busyHere = linking === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={linked}
                    aria-busy={busyHere}
                    disabled={!!linking}
                    title={linked ? `Desvincular ${c.name} desta mesa` : `Vincular ${c.name} a esta mesa`}
                    onClick={() => (linked ? void unshare(c.id) : void share(c.id))}
                    className="fv-room-pill"
                  >
                    {busyHere ? (linked ? 'Desvinculando… ' : 'Vinculando… ') : linked ? <><InlineIcon name="check" /> </> : '+ '}{c.name}
                  </button>
                );
              })}
              {user && !user.guest && (
                <>
                  <Button onClick={() => navigate(`/criar?mesa=${encodeURIComponent(campaign.id)}`)}>Criar ficha</Button>
                  <Button onClick={() => setPasting(true)}>Importar ficha</Button>
                </>
              )}
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
                <div key={share.id} className="fv-room-perms">
                  <div className="fv-room-perms-head">O mestre pode em <b>{sheetName}</b>:</div>
                  <div className="fv-room-wrap is-tight">
                    {defs.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        aria-pressed={perms[d.key]}
                        onClick={() => setPerm(d.key)}
                        className="fv-room-pill is-small"
                      >
                        {perms[d.key] ? <><InlineIcon name="check" /> </> : ''}{d.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="fv-room-help">
              Ao vincular, o mestre passa a ver uma cópia da sua ficha (atributos, PV, CA, recursos), atualizada quando você sincroniza. O seu Diário continua só seu. Desvincule quando quiser.
            </p>
          </div>
        )}

        {pasting && user && (
          <Suspense fallback={null}>
            <PasteImportModal ownerId={user.id} onClose={() => setPasting(false)} onOpen={() => setPasting(false)} doneLabel="Voltar para vincular" />
          </Suspense>
        )}

        {/* fichas da mesa */}
        <div className="fv-room-head">
          <div className="fv-label">Heróis da mesa · {shares.length}</div>
          <button type="button" className="fv-textlink fv-room-refresh" onClick={load}><InlineIcon name="refresh" /> Atualizar</button>
        </div>
        {shares.length === 0 && (
          <EmptyState icon="crest" title="Nenhuma ficha vinculada ainda" hint={isMaster ? 'Envie o link de convite — quando os jogadores vincularem as fichas, elas aparecem aqui ao vivo.' : 'Vincule sua ficha acima para o mestre acompanhar.'} />
        )}
        <div className="fv-room-sheets">
          {shares.map(({ share, snapshot }) => (
            <SheetCard key={share.id} snapshot={snapshot} mine={share.ownerId === user?.id} />
          ))}
        </div>

        {/* NPCs da campanha: retrato + o que os jogadores sabem; segredos só do mestre */}
        {campaign && user && !user.guest && (
          <div className="fv-room-section">
            <NpcGallery campaignId={campaign.id} isMaster={isMaster} masterSheets={isMaster ? mySheets : []} />
          </div>
        )}

        {/* bestiário da mesa: criaturas em cartas, personalizáveis (só o mestre) */}
        {campaign && user && !user.guest && isMaster && (
          <Suspense fallback={null}>
            <BestiaryGallery campaignId={campaign.id} />
          </Suspense>
        )}

        {/* Crônica da Mesa: notas, NPCs e missões (mestre escreve, todos leem) */}
        {campaign && (
          <div className="fv-room-section">
            <div className="fv-label fv-room-section-label">Crônica da Mesa · {notes.length}</div>
            {isMaster && (
              <div className="fv-panel fv-room-compose">
                <div className="fv-room-wrap">
                  {(['nota', 'npc', 'missao'] as const).map((k) => (
                    <button key={k} type="button" aria-pressed={noteKind === k} onClick={() => setNoteKind(k)} className="fv-room-pill is-kind">
                      {k === 'nota' ? 'Nota' : k === 'npc' ? 'NPC' : 'Missão'}
                    </button>
                  ))}
                  <input className="fv-input" placeholder="Título (obrigatório)" aria-label="Título da nota" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                </div>
                <div className="fv-room-wrap">
                  <input className="fv-input is-wide" placeholder="Detalhes (opcional)" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
                  <button
                    onClick={() => {
                      if (!noteTitle.trim() || !user) return;
                      void campaignNotes.add(campaign.id, user.id, noteKind, noteTitle, noteBody).then(() => { setNoteTitle(''); setNoteBody(''); load(); });
                    }}
                    disabled={!noteTitle.trim()}
                    title={noteTitle.trim() ? 'Registrar na crônica da mesa' : 'Escreva um título para registrar'}
                    type="button"
                    className="fv-btn-gold fv-room-save"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            )}
            <div className="fv-room-notes">
              {notes.map((n) => (
                <div key={n.id} className="fv-surface fv-room-note">
                  <div className="fv-room-note-top">
                    <span className={'fv-room-note-kind is-' + n.kind}>
                      {n.kind === 'nota' ? 'NOTA' : n.kind === 'npc' ? 'NPC' : 'MISSÃO'}
                    </span>
                    {isMaster && (
                      <button onClick={() => void campaignNotes.remove(n.id).then(load)} aria-label="Remover" className="fv-room-note-del"><InlineIcon name="close" size={12} /></button>
                    )}
                  </div>
                  <div className="fv-room-note-title">{n.title}</div>
                  {n.body && <div className="fv-room-note-body">{n.body}</div>}
                </div>
              ))}
              {notes.length === 0 && <span className="fv-room-muted">{isMaster ? 'Registre a primeira nota, NPC ou missão da campanha.' : 'O mestre ainda não registrou nada.'}</span>}
            </div>
          </div>
        )}

        {/* jogador: sair da mesa (fim da página, longe dos toques do dia a dia) */}
        {!isMaster && campaign && <LeaveCampaignButton campaignId={campaign.id} campaignName={campaign.name} />}
      </div>
    </Screen>
  );
}

/** Card vivo da ficha compartilhada (leitura, estilo aba Mesa). */
function SheetCard({ snapshot, mine }: { snapshot: Character | null; mine: boolean }) {
  const ink = useInk();
  if (!snapshot) {
    return (
      <div className="fv-surface fv-room-sheet-wait">
        Ficha vinculada, mas ainda não chegou à nuvem. Peça ao jogador para abrir o app com internet.
      </div>
    );
  }
  const d = derivedOf(snapshot);
  const pct = Math.max(0, Math.min(100, Math.round((snapshot.hpCurrent / Math.max(1, d.maxHp)) * 100)));
  const hpColor = pct >= 60 ? '#3FC56B' : pct >= 30 ? '#E0A93E' : '#FF4D3A';
  return (
    <div className={'fv-surface fv-room-sheet' + (mine ? ' is-mine' : '')}>
      <div className="fv-room-sheet-top">
        <div className="fv-room-sheet-name">
          {snapshot.name}
        </div>
        {mine && <span className="fv-room-sheet-mine">SUA</span>}
      </div>
      <div className="fv-room-sheet-sub">
        {raceOf(snapshot).label}{raceOf(snapshot).homebrew ? ' (homebrew)' : ''} · {getClass(snapshot.classId).label} · Nível {snapshot.level}
      </div>
      {/* PV */}
      <div className="fv-room-sheet-hp">
        <span className="fv-room-sheet-hpnum" style={{ color: ink(hpColor) }}>
          {snapshot.hpCurrent}<span>/{d.maxHp}</span>
        </span>
        <div className="fv-room-sheet-bar">
          <div style={{ width: `${pct}%`, background: hpColor }} />
        </div>
        <span className="fv-room-sheet-meta">CA <b>{d.ac}</b></span>
      </div>
      {/* atributos */}
      <div className="fv-room-sheet-abs">
        {d.abilityList.map((a) => (
          <div key={a.key} className="fv-room-sheet-ab" style={{ '--ab': ABILITY_COLORS[a.key] } as React.CSSProperties}>
            <div className="fv-room-sheet-ab-key" style={{ color: ink(ABILITY_COLORS[a.key]) }}>{ABILITY_SHORT[a.key]}</div>
            <div className="fv-room-sheet-ab-mod">{modStr(a.mod)}</div>
          </div>
        ))}
      </div>
      {snapshot.combat.conditions.length > 0 && (
        <div className="fv-room-sheet-conds">
          {snapshot.combat.conditions.map((c) => (
            <span key={c} className="fv-room-sheet-cond">{c}</span>
          ))}
        </div>
      )}
      <div className="fv-room-sheet-foot">
        <Icon name="moon" size={10} /> Desloc. {String(d.speed).replace('.', ',')} m · Percep. passiva {d.passivePerception} · Prof. {modStr(d.proficiency)}
      </div>
    </div>
  );
}
