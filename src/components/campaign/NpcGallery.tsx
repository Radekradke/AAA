import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { npcService, NPC_SETUP_MISSING } from '@/services/npcService';
import { getSupabase } from '@/services/supabaseClient';
import { processPortraitFile } from '@/lib/portrait';
import { MONSTERS, MONSTER_BY_ID } from '@/data/bestiary';
import { abilityMod } from '@/engine/monsters';
import type { CampaignNpc, NpcSecret, NpcStats } from '@/types/npc';
import type { Character } from '@/types/character';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';

/** Inicial bonita quando o NPC ainda não tem retrato. */
export function NpcAvatar({ npc, size = 44 }: { npc: Pick<CampaignNpc, 'name' | 'portrait'>; size?: number }) {
  return npc.portrait ? (
    <img className="fv-npc-avatar" src={npc.portrait} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="fv-npc-avatar is-empty" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {npc.name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Carrega NPCs (e segredos, se mestre) e acompanha mudanças ao vivo. */
export function useCampaignNpcs(campaignId: string | null | undefined, isMaster: boolean) {
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [secrets, setSecrets] = useState<Record<string, NpcSecret>>({});
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!campaignId) return;
    npcService
      .list(campaignId)
      .then((l) => {
        setNpcs(l);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
    if (isMaster) void npcService.secrets(campaignId).then(setSecrets);
  }, [campaignId, isMaster]);
  useEffect(load, [load]);
  useEffect(() => {
    const client = getSupabase();
    if (!client || !campaignId) return;
    const ch = client
      .channel(`npcs-${campaignId}-${Math.random().toString(36).slice(2, 8)}`) // nome único: dois componentes podem ouvir a mesma mesa
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_npcs', filter: `campaign_id=eq.${campaignId}` }, load)
      .subscribe();
    return () => void client.removeChannel(ch);
  }, [campaignId, load]);
  return { npcs, secrets, error, reload: load };
}

/**
 * Personagens da campanha: o mestre cria e edita (retrato, papel, o que os
 * jogadores sabem e os segredos); os jogadores veem só o que foi revelado.
 */
export function NpcGallery({ campaignId, isMaster, masterSheets }: { campaignId: string; isMaster: boolean; masterSheets: Character[] }) {
  const { npcs, secrets, error, reload } = useCampaignNpcs(campaignId, isMaster);
  const [editing, setEditing] = useState<CampaignNpc | 'new' | null>(null);
  const [viewing, setViewing] = useState<CampaignNpc | null>(null);

  return (
    <section className="fv-npcs">
      <div className="fv-npcs-head">
        <div className="fv-label">Personagens da campanha · {npcs.length}</div>
        {isMaster && (
          <button type="button" className="fv-btn-gold" disabled={error === NPC_SETUP_MISSING} onClick={() => setEditing('new')}>+ Novo NPC</button>
        )}
      </div>
      {error && (
        <div className="fv-npc-alert" role="alert">
          {error === NPC_SETUP_MISSING && !isMaster ? 'Os NPCs ainda não estão disponíveis — o mestre precisa atualizar o banco da mesa.' : error}
        </div>
      )}
      {!npcs.length && !error && (
        <p className="fv-live-hint">
          {isMaster
            ? 'Crie os NPCs da história com retrato: os jogadores veem o que você revelar e podem citá-los no diário com @.'
            : 'O mestre ainda não apresentou nenhum personagem.'}
        </p>
      )}
      <div className="fv-npcs-grid">
        {npcs.map((n) => (
          <button key={n.id} type="button" className={'fv-npc-card' + (n.revealed ? '' : ' is-hidden')} onClick={() => (isMaster ? setEditing(n) : setViewing(n))}>
            <NpcAvatar npc={n} size={72} />
            <span className="fv-npc-card-text">
              <b>{n.name}</b>
              {n.role && <small>{n.role}</small>}
              {isMaster && !n.revealed && <em>oculto dos jogadores</em>}
              {isMaster && secrets[n.id]?.stats.monsterRef && <em>base: {MONSTER_BY_ID[secrets[n.id].stats.monsterRef!]?.name}</em>}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <NpcEditor
          campaignId={campaignId}
          npc={editing === 'new' ? null : editing}
          secret={editing === 'new' ? null : secrets[editing.id] ?? null}
          masterSheets={masterSheets}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {viewing && (
        <Modal title={viewing.name} icon="crest" onClose={() => setViewing(null)} maxWidth={460}>
          <NpcProfile npc={viewing} />
        </Modal>
      )}
    </section>
  );
}

/** O que os jogadores sabem de um NPC. */
export function NpcProfile({ npc }: { npc: CampaignNpc }) {
  return (
    <div className="fv-npc-profile">
      {npc.portrait ? <img src={npc.portrait} alt={`Retrato de ${npc.name}`} /> : <NpcAvatar npc={npc} size={120} />}
      {npc.role && <div className="fv-label">{npc.role}</div>}
      <p>{npc.summary || 'Pouco se sabe sobre este personagem.'}</p>
    </div>
  );
}

/** Humanoides primeiro: são a base natural de NPCs (guarda, sacerdote, mago…). */
const NPC_BASES = [...MONSTERS].sort((a, b) => Number(!a.type.startsWith('Humanoide')) - Number(!b.type.startsWith('Humanoide')) || a.name.localeCompare(b.name));

function NpcEditor({ campaignId, npc, secret, masterSheets, onClose, onSaved }: {
  campaignId: string;
  npc: CampaignNpc | null;
  secret: NpcSecret | null;
  masterSheets: Character[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: npc?.name ?? '',
    role: npc?.role ?? '',
    summary: npc?.summary ?? '',
    portrait: npc?.portrait ?? null as string | null,
    revealed: npc?.revealed ?? true,
    notes: secret?.notes ?? '',
  });
  const [stats, setStats] = useState<NpcStats>(secret?.stats ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = stats.monsterRef ? MONSTER_BY_ID[stats.monsterRef] : null;
  const sheet = useMemo(() => masterSheets.find((c) => c.id === stats.sheetId) ?? null, [masterSheets, stats.sheetId]);

  const pickPortrait = async (file?: File) => {
    if (!file) return;
    try {
      // retrato de NPC fica leve: vai para o banco e para o diário de todos
      const { dataUrl } = await processPortraitFile(file, { cutout: false, max: { w: 320, h: 400 }, quality: 0.8 });
      setF((c) => ({ ...c, portrait: dataUrl }));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const chooseBase = (id: string) => {
    const m = id ? MONSTER_BY_ID[id] : null;
    setStats((s) => (m ? { ...s, monsterRef: m.id, ac: m.ac, hp: m.hp, initiativeBonus: abilityMod(m.abilities.dex) } : { ...s, monsterRef: undefined }));
  };
  const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Math.round(Number(v)));

  const save = async () => {
    if (!f.name.trim()) return setErr('Dê um nome ao NPC.');
    setBusy(true);
    setErr(null);
    try {
      await npcService.save(campaignId, { id: npc?.id, name: f.name, role: f.role, summary: f.summary, portrait: f.portrait, revealed: f.revealed }, { notes: f.notes, stats });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={npc ? `Editar ${npc.name}` : 'Novo NPC'}
      icon="crest"
      onClose={onClose}
      maxWidth={680}
      footer={
        <div className="fv-npc-editor-foot">
          {npc && (
            <button
              type="button"
              className="fv-btn-ghost is-danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(`Apagar ${npc.name}? Menções no diário dos jogadores viram texto comum.`)) return;
                try {
                  await npcService.remove(npc.id);
                  onSaved();
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            >
              Apagar
            </button>
          )}
          {err && <span className="fv-npc-editor-err" role="alert">{err}</span>}
          <button type="button" className="fv-btn-gold" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      }
    >
      <div className="fv-npc-editor">
        <label className="fv-npc-portrait-pick">
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void pickPortrait(e.target.files?.[0])} />
          {f.portrait ? <img src={f.portrait} alt="" /> : <span>+ Retrato</span>}
          <small>{f.portrait ? 'Trocar retrato' : 'PNG, JPG ou WebP'}</small>
        </label>
        <div className="fv-npc-editor-fields">
          <div className="fv-npc-public-tag">Os jogadores veem</div>
          <input className="fv-input" placeholder="Nome (ex.: Barão Voss)" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="fv-input" placeholder="Papel (ex.: senhor de Pedra Branca)" value={f.role} maxLength={120} onChange={(e) => setF({ ...f, role: e.target.value })} />
          <textarea className="fv-input" rows={3} placeholder="O que os jogadores sabem dele…" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
          <label className="fv-bestiary-check">
            <input type="checkbox" checked={f.revealed} onChange={(e) => setF({ ...f, revealed: e.target.checked })} /> Revelado aos jogadores (aparece na galeria e no diário)
          </label>
        </div>
      </div>

      <div className="fv-npc-secret">
        <div className="fv-npc-secret-tag">Só você (mestre) vê</div>
        <textarea className="fv-input" rows={3} placeholder="Segredos, motivações, o que ele esconde…" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <div className="fv-npc-stats">
          <label>Base do bestiário
            <select className="fv-input" value={stats.monsterRef ?? ''} onChange={(e) => chooseBase(e.target.value)}>
              <option value="">— nenhuma —</option>
              {NPC_BASES.map((m) => <option key={m.id} value={m.id} style={{ color: '#111' }}>{m.name} (ND {m.cr})</option>)}
            </select>
          </label>
          <label>CA<input className="fv-input" inputMode="numeric" value={stats.ac ?? ''} onChange={(e) => setStats({ ...stats, ac: num(e.target.value) })} /></label>
          <label>PV<input className="fv-input" inputMode="numeric" value={stats.hp ?? ''} onChange={(e) => setStats({ ...stats, hp: num(e.target.value) })} /></label>
          <label>Inic.<input className="fv-input" inputMode="numeric" value={stats.initiativeBonus ?? ''} onChange={(e) => setStats({ ...stats, initiativeBonus: num(e.target.value) })} /></label>
          <label>Nível<input className="fv-input" inputMode="numeric" value={stats.level ?? ''} onChange={(e) => setStats({ ...stats, level: num(e.target.value) })} /></label>
          <label>Ficha completa
            <select className="fv-input" value={stats.sheetId ?? ''} onChange={(e) => setStats({ ...stats, sheetId: e.target.value || undefined })}>
              <option value="">— nenhuma —</option>
              {masterSheets.map((c) => <option key={c.id} value={c.id} style={{ color: '#111' }}>{c.name} (nv {c.level})</option>)}
            </select>
          </label>
        </div>
        <p className="fv-live-hint">
          NPC importante? Crie a ficha dele no criador de personagem (na sua conta) e ligue aqui — você controla como um herói.
          {sheet && <> <Link to={`/ficha/${sheet.id}`}>Abrir ficha de {sheet.name} ›</Link></>}
        </p>
        {base && <MonsterStatBlock m={base} who={f.name || base.name} compact />}
      </div>
    </Modal>
  );
}
