import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character } from '@/types/character';
import type { Campaign } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSessionStore } from '@/store/sessionStore';
import { campaignService } from '@/services/campaignService';
import { cloudEnabled } from '@/services/supabaseClient';
import { deriveCharacter } from '@/engine/dndRules';
import { characterResources } from '@/engine/classResources';
import { syncSpellSlots } from '@/engine/spellcasting';
import { getClass } from '@/data/classes';
import { heroAvatar, heroPortraitPosition, heroSubtitle } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';

interface GuildDashboardProps {
  heroes: Character[];
  onOpen: (c: Character) => void;
  onNew: () => void;
  onImport: () => void;
  importError: string | null;
}

/** Estado da vida em palavras: a cor nunca é a única pista. */
function hpState(pct: number, hp: number): { label: string; color: string } {
  if (hp <= 0) return { label: 'Caído', color: '#FF5A47' };
  if (pct >= 60) return { label: 'Saudável', color: '#5FD38A' };
  if (pct >= 30) return { label: 'Ferido', color: '#F2B84B' };
  return { label: 'Em perigo', color: '#FF5A47' };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Cor estável para o círculo de uma mesa (a partir do nome). */
function tableHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Painel de heróis do tema Guilda Rubra (inspirado em dashboards de jogos):
 * herói ativo em destaque, coleção de personagens com retratos grandes,
 * recursos reais do herói ativo e — quando há mesas na nuvem — uma coluna
 * com as mesas do jogador.
 */
export function GuildDashboard({ heroes, onOpen, onNew, onImport, importError }: GuildDashboardProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const currentId = useCharacterStore((s) => s.currentId);
  const { duplicateCharacter, deleteCharacter } = useCharacterStore();
  const liveCampaign = useSessionStore((s) => (s.session?.status === 'active' ? s.campaignId : null));
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [tables, setTables] = useState<{ c: Campaign; role: 'Mestre' | 'Jogador' }[]>([]);

  const canCloud = cloudEnabled() && !user.guest;
  useEffect(() => {
    if (!canCloud) return;
    let alive = true;
    campaignService
      .myCampaigns(user.id)
      .then((r) => {
        if (!alive) return;
        setTables([...r.asMaster.map((c) => ({ c, role: 'Mestre' as const })), ...r.asPlayer.map((c) => ({ c, role: 'Jogador' as const }))]);
      })
      .catch(() => alive && setTables([]));
    return () => {
      alive = false;
    };
  }, [canCloud, user.id]);

  const active = heroes.find((h) => h.id === currentId) ?? heroes[0] ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? heroes.filter((h) => `${h.name} ${heroSubtitle(h)}`.toLowerCase().includes(q)) : heroes;
  }, [heroes, query]);

  return (
    <div className={'fv-guild' + (tables.length ? ' has-tables' : '')}>
      <header className="fv-guild-head">
        <h1>
          {greeting()}, <b>{user.name}</b>
        </h1>
        <label className="fv-guild-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar herói" aria-label="Buscar herói pelo nome, espécie ou classe" />
        </label>
      </header>

      <div className="fv-guild-main">
        {active ? <ActiveHero char={active} onOpen={() => onOpen(active)} /> : <EmptyHero onNew={onNew} />}

        <section aria-labelledby="fv-guild-col">
          <div className="fv-guild-sec">
            <h2 id="fv-guild-col">Sua guilda</h2>
            <span>{heroes.length} {heroes.length === 1 ? 'herói' : 'heróis'}</span>
          </div>
          <div className="fv-guild-cards">
            <button type="button" className="fv-guild-card is-new" onClick={onNew}>
              <span className="fv-guild-plus" aria-hidden>+</span>
              <b>Novo herói</b>
              <small>Criação em 7 capítulos</small>
            </button>
            {shown.map((c) => {
              const d = deriveCharacter(c);
              const cls = getClass(c.classId);
              const on = c.id === active?.id;
              return (
                <article key={c.id} className={'fv-guild-card' + (on ? ' is-active' : '')} style={{ '--card-jewel': cls.jewel } as CSSProperties}>
                  <button type="button" className="fv-guild-card-open" onClick={() => onOpen(c)} aria-label={`Abrir a ficha de ${c.name}`}>
                    <span className="fv-guild-card-art" aria-hidden style={{ backgroundImage: `url("${heroAvatar(c)}")`, backgroundPosition: heroPortraitPosition(c) }} />
                    <span className="fv-guild-card-hp">
                      PV {c.hpCurrent}/{d.maxHp}
                    </span>
                    <span className="fv-guild-card-text">
                      <b>{c.name}</b>
                      <small>
                        {cls.label} · nível {c.level}
                      </small>
                    </span>
                  </button>
                  <div className="fv-guild-card-acts">
                    <button type="button" onClick={() => duplicateCharacter(c.id)}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        if (confirmId === c.id) {
                          deleteCharacter(c.id);
                          setConfirmId(null);
                        } else setConfirmId(c.id);
                      }}
                    >
                      {confirmId === c.id ? 'Confirmar?' : 'Excluir'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {query && shown.length === 0 && <p className="fv-guild-empty">Nenhum herói com “{query}”.</p>}
          <div className="fv-guild-import">
            <button type="button" className="fv-btn-ghost" onClick={onImport}>
              Importar personagem (JSON)
            </button>
            {importError && <span role="alert">{importError}</span>}
          </div>
        </section>
      </div>

      {active && <HeroResources char={active} />}

      {tables.length > 0 && (
        <aside className="fv-guild-tables" aria-label="Suas mesas">
          <span className="fv-guild-me" title={user.name} aria-hidden>
            {initials(user.name)}
          </span>
          <ul>
            {tables.map(({ c, role }) => {
              const live = liveCampaign === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/mesa/${c.id}`)}
                    aria-label={`${c.name} — ${role}${live ? ', sessão ao vivo' : ''}`}
                    title={`${c.name} · ${role}`}
                    style={{ '--table-hue': tableHue(c.name) } as CSSProperties}
                  >
                    {initials(c.name)}
                    {live && <em>Ao vivo</em>}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="fv-guild-tables-all" onClick={() => navigate('/mesas')} aria-label="Ver todas as mesas">
            <Icon name="banner" size={18} />
          </button>
        </aside>
      )}
    </div>
  );
}

function ActiveHero({ char, onOpen }: { char: Character; onOpen: () => void }) {
  const cls = getClass(char.classId);
  return (
    <section className="fv-guild-active" aria-label="Herói ativo" style={{ '--card-jewel': cls.jewel } as CSSProperties}>
      <div className="fv-guild-active-text">
        <div className="fv-guild-tags">
          <span className="fv-guild-tag is-cream">
            <Icon name="starFill" size={13} /> Herói ativo
          </span>
          <span className="fv-guild-tag">Nível {char.level}</span>
        </div>
        <h2>{char.name}</h2>
        <p>{heroSubtitle(char)}</p>
        <button type="button" className="fv-guild-open" onClick={onOpen}>
          Abrir ficha <span aria-hidden>›</span>
        </button>
      </div>
      {/* o retrato sobe além da borda do card */}
      <span className="fv-guild-active-art" aria-hidden style={{ backgroundImage: `url("${heroAvatar(char)}")`, backgroundPosition: heroPortraitPosition(char) }} />
    </section>
  );
}

function EmptyHero({ onNew }: { onNew: () => void }) {
  return (
    <section className="fv-guild-active is-empty" aria-label="Nenhum herói ainda">
      <div className="fv-guild-active-text">
        <h2>Sua guilda está vazia</h2>
        <p>Forje o primeiro herói — a criação leva poucos minutos.</p>
        <button type="button" className="fv-guild-open" onClick={onNew}>
          Criar herói <span aria-hidden>›</span>
        </button>
      </div>
    </section>
  );
}

/** Recursos reais do herói ativo: vida em anel + usos que se gastam na mesa. */
function HeroResources({ char }: { char: Character }) {
  const d = deriveCharacter(char);
  const max = Math.max(1, d.maxHp);
  const hp = Math.max(0, char.hpCurrent);
  const pct = Math.round((hp / max) * 100);
  const state = hpState(pct, char.hpCurrent);
  const temp = char.combat?.hpTemp ?? 0;
  const R = 62;
  const C = 2 * Math.PI * R;

  const uses: { label: string; left: number; max: number; note: string }[] = [];
  for (const r of characterResources(char)) {
    if (r.unlimited || r.max <= 0) continue;
    uses.push({ label: r.label, left: Math.min(r.max, char.combat.resources[r.id] ?? r.max), max: r.max, note: r.recharge === 'short' ? 'descanso curto' : 'descanso longo' });
  }
  const slots = syncSpellSlots(char);
  for (const lv of Object.keys(slots).map(Number).sort((a, b) => a - b)) {
    const s = slots[lv];
    if (s.max > 0) uses.push({ label: `Espaços de ${lv}º círculo`, left: Math.max(0, s.max - s.used), max: s.max, note: 'magia' });
  }
  uses.push({ label: 'Dados de vida', left: char.combat.hitDiceRemaining, max: char.level, note: 'descanso longo' });

  return (
    <aside className="fv-guild-stats" aria-label={`Recursos de ${char.name}`}>
      <div className="fv-guild-sec">
        <h2>Recursos</h2>
        <span>{char.name.split(' ')[0]}</span>
      </div>
      <div className="fv-guild-ring">
        <svg viewBox="0 0 150 150" aria-hidden>
          <circle cx="75" cy="75" r={R} className="fv-guild-ring-track" />
          <circle cx="75" cy="75" r={R} className="fv-guild-ring-bar" style={{ stroke: state.color, strokeDasharray: `${(C * Math.min(100, pct)) / 100} ${C}` }} />
        </svg>
        <div className="fv-guild-ring-text">
          <small>Pontos de vida</small>
          <b>
            {char.hpCurrent}
            <i>/{d.maxHp}</i>
          </b>
          <span style={{ color: state.color }}>
            {state.label}
            {temp > 0 && ` · +${temp} temp.`}
          </span>
        </div>
      </div>
      <div className="fv-guild-quick">
        {[
          { k: 'CA', v: String(d.ac) },
          { k: 'Iniciativa', v: (d.initiative >= 0 ? '+' : '') + d.initiative },
          { k: 'Desloc.', v: `${String(d.speed).replace('.', ',')}m` },
        ].map((q) => (
          <div key={q.k}>
            <b>{q.v}</b>
            <span>{q.k}</span>
          </div>
        ))}
      </div>
      <ul className="fv-guild-uses">
        {uses.map((u) => (
          <li key={u.label}>
            <div>
              <b>{u.label}</b>
              <small>{u.note}</small>
            </div>
            <span className="fv-guild-pips" aria-label={`${u.left} de ${u.max} disponíveis`}>
              {u.max <= 6 ? (
                Array.from({ length: u.max }, (_, i) => <i key={i} className={i < u.left ? 'is-on' : ''} />)
              ) : (
                <em>
                  {u.left}/{u.max}
                </em>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
