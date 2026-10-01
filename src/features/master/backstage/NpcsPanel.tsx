import { Icon } from '@/components/ui/Icon';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NpcAvatar } from '@/components/campaign/NpcGallery';
import { npcService } from '@/services/npcService';
import { useSessionStore } from '@/store/sessionStore';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { useMasterStore } from '../masterStore';
import { useMaster } from '../context';
import { addToEncounter, npcToCombatant } from '../actions';
import { TrayStar } from './SessionPanel';

/** "Guardar na campanha": o improvisado vira conteúdo permanente. */
export async function keepNpc(id: string, name: string, reload: () => void): Promise<void> {
  try {
    await npcService.keep(id);
    reload();
    toast(`${name} agora faz parte da campanha.`);
  } catch (e) {
    toast((e as Error).message, { tone: 'danger' });
  }
}

/** NPCs: os da campanha e os improvisados (marcados), com atalhos rápidos. */
export function NpcsPanel() {
  const { npcs, secrets, campaign } = useMaster();
  const select = useMasterStore((m) => m.select);
  const openQuick = useMasterStore((m) => m.openQuick);
  const selection = useMasterStore((m) => m.selection);
  const characters = useCharacterStore((c) => c.characters);
  const combatants = useSessionStore((s) => s.combatants);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = t ? npcs.filter((n) => `${n.name} ${n.role}`.toLowerCase().includes(t)) : npcs;
    // improvisados primeiro: são os que acabaram de surgir na mesa
    return [...f].sort((a, b) => Number(!!b.improvisedIn) - Number(!!a.improvisedIn) || a.name.localeCompare(b.name));
  }, [npcs, q]);
  const inFight = new Set(combatants.map((c) => c.name));

  return (
    <div className="fv-bs-stack">
      <div className="fv-bs-tools">
        <input className="fv-input" type="search" placeholder="Buscar NPC" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar NPC" />
        <button type="button" className="fv-btn-gold fv-bs-mini" onClick={() => openQuick('npc')}>
          + NPC
        </button>
      </div>
      {!list.length && <p className="fv-bs-hint">{npcs.length ? 'Nenhum NPC com esse nome.' : 'Nenhum NPC ainda. Crie um na hora com + NPC.'}</p>}
      <ul className="fv-bs-list">
        {list.map((n) => (
          <li key={n.id} className={selection?.kind === 'npc' && selection.id === n.id ? 'is-on' : ''}>
            <button type="button" className="fv-bs-item has-avatar" onClick={() => select({ kind: 'npc', id: n.id })}>
              <NpcAvatar npc={n} size={30} />
              <span>
                <b>{n.name}</b>
                <small>
                  {n.improvisedIn && <em className="fv-bs-tag">improviso</em>}
                  {!n.revealed && <em className="fv-bs-tag is-muted">oculto</em>}
                  {n.role || (n.summary ? n.summary.slice(0, 40) : 'sem descrição')}
                </small>
              </span>
            </button>
            <div className="fv-bs-item-acts">
              <TrayStar kind="npcs" id={n.id} label={n.name} />
              <button
                type="button"
                className="fv-bs-mini fv-btn-ghost"
                disabled={inFight.has(n.name)}
                title="Adicionar ao encontro"
                aria-label={`Pôr ${n.name} no encontro`}
                onClick={() => void addToEncounter([npcToCombatant(n, secrets, characters)])}
              >
                {inFight.has(n.name) ? '✓' : <Icon name="swords" size={14} />}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link className="fv-live-link" to={`/mesa/${campaign.id}`}>
        Galeria completa (retrato, segredos, números) ›
      </Link>
    </div>
  );
}
