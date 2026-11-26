import { useEffect, useMemo, useRef, useState } from 'react';
import { useStageStore } from '@/store/stageStore';
import { useSessionStore } from '@/store/sessionStore';
import { toast } from '@/store/feedbackStore';
import { deriveCharacter } from '@/engine/dndRules';
import { blockingWalls, visibilityPolygon } from '@/engine/vision';
import { KIND_NAME, SKILL_NAME, evaluateSecret, hasRules, skillOfRoll } from '@/engine/secrets';
import type { CheckRoll, SecretHit, Seeker } from '@/engine/secrets';
import { ALL_ITEMS } from '@/data/items';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { Scene, SceneSecret, SecretKind, SecretRules, SecretSkill, Token } from '@/types/stage';
import { SecretGlyph, SecretSeal } from './secretArt';

const KINDS: SecretKind[] = ['chest', 'trap', 'door', 'clue', 'item'];
const COINS: { k: 'pp' | 'gp' | 'ep' | 'sp' | 'cp'; label: string }[] = [
  { k: 'pp', label: 'PL' },
  { k: 'gp', label: 'PO' },
  { k: 'ep', label: 'PE' },
  { k: 'sp', label: 'PP' },
  { k: 'cp', label: 'PC' },
];
const ITEM_NAMES = ALL_ITEMS.map((i) => i.name);
const findItem = (name: string) => ALL_ITEMS.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());

/* =====================================================================
   EDITOR DO SEGREDO (painel sobre o mapa, só o mestre)
   ===================================================================== */
export function SecretEditor({ secret, onClose }: { secret: SceneSecret; onClose: () => void }) {
  const st = useStageStore();
  const [d, setD] = useState<SceneSecret>(secret);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [confirmDel, setConfirmDel] = useState(false);
  const first = useRef(true);

  // outro segredo selecionado: recomeça o rascunho
  useEffect(() => {
    setD(secret);
    first.current = true;
    setConfirmDel(false);
  }, [secret.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // salva sozinho, sem botão (como um documento); fechar logo depois de digitar não perde nada
  const pending = useRef<SceneSecret | null>(null);
  const flush = () => {
    if (pending.current) void st.saveSecret(pending.current);
    pending.current = null;
  };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = { ...d, foundBy: secret.foundBy, foundAt: secret.foundAt };
    const t = setTimeout(flush, 550);
    return () => clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => flush, [secret.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<SceneSecret>) => setD((x) => ({ ...x, ...patch }));
  const rule = (patch: Partial<SecretRules>) => setD((x) => ({ ...x, rules: { ...x.rules, ...patch } }));
  const drop = (k: keyof SecretRules) =>
    setD((x) => {
      const r = { ...x.rules };
      delete r[k];
      return { ...x, rules: r };
    });
  const found = !!secret.foundAt;

  const addLoot = () => {
    const name = newItem.trim();
    if (!name) return;
    const cat = findItem(name);
    set({ loot: [...d.loot, { name: cat?.name ?? name, qty: Math.max(1, newQty), ...(cat ? { itemId: cat.id } : {}) }].slice(0, 40) });
    setNewItem('');
    setNewQty(1);
  };

  return (
    <aside className={`fv-secret-sheet is-${d.kind}`} aria-label={`Segredo: ${d.title}`}>
      <header className="fv-secret-head">
        <span className="fv-secret-head-seal">
          <SecretSeal kind={d.kind} found={found} />
        </span>
        <div className="fv-secret-head-txt">
          <small>{KIND_NAME[d.kind]} · {found ? `achado por ${secret.foundBy ?? '—'}` : 'escondido'}</small>
          <input className="fv-secret-title" value={d.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} aria-label="Nome do segredo" />
        </div>
        <button type="button" className="fv-secret-x" onClick={onClose} aria-label="Fechar o segredo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div className="fv-secret-body">
        <section>
          <h4>O que é</h4>
          <div className="fv-secret-kinds" role="radiogroup" aria-label="Tipo de segredo">
            {KINDS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={d.kind === k} className={`is-${k}` + (d.kind === k ? ' is-on' : '')} onClick={() => set({ kind: k })}>
                <SecretGlyph kind={k} size={18} />
                <span>{KIND_NAME[k].split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>Quando acharem, a mesa lê</h4>
          <textarea className="fv-input fv-secret-paper" rows={3} maxLength={4000} value={d.revealText} placeholder="Atrás das tapeçarias, um baú de carvalho com o brasão do Barão…" onChange={(e) => set({ revealText: e.target.value })} />
          <h4>Notas só suas</h4>
          <textarea className="fv-input" rows={2} maxLength={4000} value={d.notes} placeholder="É um mímico se forçarem a tampa." onChange={(e) => set({ notes: e.target.value })} />
        </section>

        <section>
          <h4>Loot</h4>
          {d.loot.length > 0 && (
            <ul className="fv-secret-loot">
              {d.loot.map((l, i) => (
                <li key={`${l.name}-${i}`} className={l.itemId ? 'is-catalog' : ''}>
                  <span>{l.name}</span>
                  <input
                    className="fv-input"
                    inputMode="numeric"
                    value={l.qty}
                    aria-label={`Quantidade de ${l.name}`}
                    onChange={(e) => set({ loot: d.loot.map((x, k) => (k === i ? { ...x, qty: Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 1)) } : x)) })}
                  />
                  <button type="button" onClick={() => set({ loot: d.loot.filter((_, k) => k !== i) })} aria-label={`Tirar ${l.name}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="fv-secret-add"
            onSubmit={(e) => {
              e.preventDefault();
              addLoot();
            }}
          >
            <input className="fv-input" list="fv-secret-items" value={newItem} placeholder="Item do catálogo ou qualquer coisa" maxLength={80} onChange={(e) => setNewItem(e.target.value)} aria-label="Novo item do loot" />
            <input className="fv-input" inputMode="numeric" value={newQty} onChange={(e) => setNewQty(Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 1)))} aria-label="Quantidade" />
            <button type="submit" className="fv-btn-ghost" disabled={!newItem.trim()}>Pôr</button>
            <datalist id="fv-secret-items">
              {ITEM_NAMES.map((n) => <option key={n} value={n} />)}
            </datalist>
          </form>
          <div className="fv-secret-coins">
            {COINS.map((c) => (
              <label key={c.k}>
                <input
                  className="fv-input"
                  inputMode="numeric"
                  value={d.coins[c.k] ?? ''}
                  placeholder="0"
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || 0;
                    const coins = { ...d.coins, [c.k]: n };
                    if (!n) delete coins[c.k];
                    set({ coins });
                  }}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="fv-secret-h4row">
            <h4>Aparece quando</h4>
            <span className="fv-secret-mode" role="radiogroup" aria-label="Como as condições se combinam">
              <button type="button" role="radio" aria-checked={d.rules.mode === 'any'} className={d.rules.mode === 'any' ? 'is-on' : ''} onClick={() => rule({ mode: 'any' })}>qualquer uma</button>
              <button type="button" role="radio" aria-checked={d.rules.mode === 'all'} className={d.rules.mode === 'all' ? 'is-on' : ''} onClick={() => rule({ mode: 'all' })}>todas</button>
            </span>
          </div>

          <RuleRow label="Alguém chega perto" on={!!d.rules.near} onToggle={(v) => (v ? rule({ near: 3 }) : drop('near'))} note="com linha de visão (paredes contam)">
            a <NumIn value={d.rules.near ?? 3} min={1} max={60} step={1.5} onChange={(near) => rule({ near })} label="Distância em metros" /> m
          </RuleRow>

          <RuleRow label="Percebe sem procurar" on={!!d.rules.passive} onToggle={(v) => (v ? rule({ passive: { skill: 'perception', dc: 14 } }) : drop('passive'))} note="valor passivo da ficha, a até 9 m">
            <SkillIn value={d.rules.passive?.skill ?? 'perception'} onChange={(skill) => rule({ passive: { skill, dc: d.rules.passive?.dc ?? 14 } })} />
            CD <NumIn value={d.rules.passive?.dc ?? 14} min={5} max={30} onChange={(dc) => rule({ passive: { skill: d.rules.passive?.skill ?? 'perception', dc } })} label="CD passiva" />
          </RuleRow>

          <RuleRow label="Procura e rola" on={!!d.rules.check} onToggle={(v) => (v ? rule({ check: { skill: 'investigation', dc: 15 } }) : drop('check'))} note="teste rolado na mesa nos últimos 3 min, por perto">
            <SkillIn value={d.rules.check?.skill ?? 'investigation'} onChange={(skill) => rule({ check: { skill, dc: d.rules.check?.dc ?? 15 } })} />
            CD <NumIn value={d.rules.check?.dc ?? 15} min={5} max={30} onChange={(dc) => rule({ check: { skill: d.rules.check?.skill ?? 'investigation', dc } })} label="CD do teste" />
          </RuleRow>

          <RuleRow label="Carrega um item" on={d.rules.item !== undefined} onToggle={(v) => (v ? rule({ item: '' }) : drop('item'))} note="parte do nome basta">
            <input className="fv-input" value={d.rules.item ?? ''} placeholder="Chave do Barão" maxLength={80} onChange={(e) => rule({ item: e.target.value })} aria-label="Item necessário" />
          </RuleRow>

          <RuleRow label="Um gatilho seu" on={!!d.rules.flag} onToggle={(v) => (v ? rule({ flag: { label: 'A alavanca foi puxada', on: false } }) : drop('flag'))} note="você aciona quando acontecer">
            <input className="fv-input" value={d.rules.flag?.label ?? ''} maxLength={60} onChange={(e) => rule({ flag: { label: e.target.value, on: !!d.rules.flag?.on } })} aria-label="Nome do gatilho" />
            <button type="button" className="fv-map-switch" role="switch" aria-checked={!!d.rules.flag?.on} onClick={() => rule({ flag: { label: d.rules.flag?.label || 'Gatilho', on: !d.rules.flag?.on } })}>
              <i aria-hidden /> Acionado
            </button>
          </RuleRow>

          {!hasRules(d.rules) && <p className="fv-secret-note">Sem condição: só aparece quando você revelar.</p>}
        </section>

        <section className="fv-secret-then">
          <h4>Quando acontecer</h4>
          <div className="fv-secret-mode is-wide" role="radiogroup" aria-label="Revelar sozinho ou perguntar">
            <button type="button" role="radio" aria-checked={!d.rules.auto} className={!d.rules.auto ? 'is-on' : ''} onClick={() => rule({ auto: false })}>me pergunta antes</button>
            <button type="button" role="radio" aria-checked={!!d.rules.auto} className={d.rules.auto ? 'is-on' : ''} onClick={() => rule({ auto: true })}>revela sozinho</button>
          </div>
          <div className="fv-secret-mode is-wide" role="radiogroup" aria-label="Quem recebe">
            <button type="button" role="radio" aria-checked={d.rules.to !== 'all'} className={d.rules.to !== 'all' ? 'is-on' : ''} onClick={() => rule({ to: 'finder' })}>só quem achou</button>
            <button type="button" role="radio" aria-checked={d.rules.to === 'all'} className={d.rules.to === 'all' ? 'is-on' : ''} onClick={() => rule({ to: 'all' })}>a mesa toda</button>
          </div>
        </section>
      </div>

      <footer className="fv-secret-foot">
        {found ? (
          <button type="button" className="fv-btn-ghost" disabled={st.busy} onClick={() => void st.hideSecret(secret)}>Esconder de novo</button>
        ) : (
          <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.revealSecret({ ...d, foundBy: null, foundAt: null }, null)}>Revelar agora</button>
        )}
        <button
          type="button"
          className={'fv-btn-ghost is-danger' + (confirmDel ? ' is-confirm' : '')}
          onClick={() => {
            if (!confirmDel) return setConfirmDel(true);
            void st.removeSecret(secret);
            onClose();
          }}
          onBlur={() => setConfirmDel(false)}
        >
          {confirmDel ? 'Apagar de vez?' : 'Apagar'}
        </button>
      </footer>
    </aside>
  );
}

function RuleRow({ label, note, on, onToggle, children }: { label: string; note: string; on: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className={'fv-secret-rule' + (on ? ' is-on' : '')}>
      <button type="button" className="fv-map-switch" role="switch" aria-checked={on} onClick={() => onToggle(!on)}>
        <i aria-hidden /> {label}
      </button>
      {on && (
        <div className="fv-secret-rule-body">
          <div className="fv-secret-rule-ctl">{children}</div>
          <small>{note}</small>
        </div>
      )}
    </div>
  );
}

function NumIn({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <span className="fv-secret-num">
      <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))} aria-label={`Menos (${label})`}>−</button>
      <input
        className="fv-input"
        inputMode="decimal"
        value={String(value).replace('.', ',')}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
      <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))} aria-label={`Mais (${label})`}>+</button>
    </span>
  );
}

function SkillIn({ value, onChange }: { value: SecretSkill; onChange: (s: SecretSkill) => void }) {
  return (
    <select className="fv-input" value={value} onChange={(e) => onChange(e.target.value as SecretSkill)} aria-label="Perícia">
      <option value="perception">{SKILL_NAME.perception}</option>
      <option value="investigation">{SKILL_NAME.investigation}</option>
    </select>
  );
}

/* =====================================================================
   VIGIA: confere as condições a cada passo e pergunta ao mestre
   ===================================================================== */
export interface SecretAlert {
  secret: SceneSecret;
  hit: SecretHit;
}

const BOUNDS = { x0: -50, y0: -50, x1: 600, y1: 600 };
const SNOOZE_MS = 2 * 60_000;

export function useSecretWatch({ scene, tokens, heroes, active }: { scene: Scene | null; tokens: Token[]; heroes: SharedHero[]; active: boolean }) {
  const st = useStageStore();
  const events = useSessionStore((s) => s.events);
  const [alerts, setAlerts] = useState<SecretAlert[]>([]);
  const snoozed = useRef(new Map<string, number>());
  const busy = useRef(new Set<string>());

  const secrets = useMemo(() => (scene ? st.secrets.filter((x) => x.sceneId === scene.id && !x.foundAt) : []), [st.secrets, scene]);

  // fichas dos heróis: passivas e mochila
  const sheets = useMemo(() => {
    const m = new Map<string, { perception: number; investigation: number; items: string[] }>();
    for (const h of heroes) {
      if (!h.snapshot) continue;
      try {
        const d = deriveCharacter(h.snapshot);
        m.set(h.share.sheetId, { perception: d.passivePerception, investigation: d.passiveInvestigation, items: h.snapshot.inventory.map((i) => i.name) });
      } catch {
        /* ficha incompleta: fica de fora do vigia */
      }
    }
    return m;
  }, [heroes]);

  const rolls = useMemo<CheckRoll[]>(
    () =>
      events.flatMap((e) => {
        if (e.type !== 'roll') return [];
        const p = e.payload as { label?: string; total?: number; sheetId?: string | null; damage?: boolean };
        const skill = p.label && !p.damage ? skillOfRoll(p.label) : null;
        return skill && p.sheetId && typeof p.total === 'number' ? [{ sheetId: p.sheetId, skill, total: p.total, at: Date.parse(e.createdAt) }] : [];
      }),
    [events],
  );

  useEffect(() => {
    if (!active || !scene || !secrets.length) {
      setAlerts((a) => (a.length ? [] : a));
      return;
    }
    const walls = blockingWalls(scene.grid.fog?.walls);
    const seekers: Seeker[] = tokens
      .filter((t) => t.kind === 'hero' && !t.hidden && t.sheetId)
      .map((t) => {
        const at = { x: t.x + t.size / 2, y: t.y + t.size / 2 };
        const sh = sheets.get(t.sheetId!);
        return {
          tokenId: t.id,
          name: t.label || 'Herói',
          ownerId: t.ownerId,
          sheetId: t.sheetId,
          at,
          sight: walls.length ? visibilityPolygon(at, walls, BOUNDS) : [],
          passive: { perception: sh?.perception ?? 10, investigation: sh?.investigation ?? 10 },
          items: sh?.items ?? [],
        };
      });
    const now = Date.now();
    const next: SecretAlert[] = [];
    for (const sc of secrets) {
      const tk = tokens.find((t) => t.id === sc.tokenId);
      if (!tk || busy.current.has(sc.id)) continue;
      if ((snoozed.current.get(sc.id) ?? 0) > now) continue;
      const hit = evaluateSecret(sc, { x: tk.x + tk.size / 2, y: tk.y + tk.size / 2 }, seekers, rolls, now);
      if (!hit) continue;
      if (sc.rules.auto) {
        busy.current.add(sc.id);
        const who = hit.by?.name ?? 'A mesa';
        void st.revealSecret(sc, hit.by ? { name: hit.by.name, ownerId: hit.by.ownerId } : null).finally(() => busy.current.delete(sc.id));
        toast(`${who} achou: ${sc.title}`, { tone: 'ok' });
      } else next.push({ secret: sc, hit });
    }
    setAlerts(next);
  }, [active, scene, secrets, tokens, sheets, rolls]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    alerts,
    reveal(a: SecretAlert) {
      busy.current.add(a.secret.id);
      setAlerts((x) => x.filter((y) => y.secret.id !== a.secret.id));
      void st.revealSecret(a.secret, a.hit.by ? { name: a.hit.by.name, ownerId: a.hit.by.ownerId } : null).finally(() => busy.current.delete(a.secret.id));
    },
    snooze(a: SecretAlert) {
      snoozed.current.set(a.secret.id, Date.now() + SNOOZE_MS);
      setAlerts((x) => x.filter((y) => y.secret.id !== a.secret.id));
    },
  };
}

/** Aviso ao mestre: alguém cumpriu as condições. */
export function SecretAlerts({ alerts, onReveal, onSnooze, onOpen }: { alerts: SecretAlert[]; onReveal: (a: SecretAlert) => void; onSnooze: (a: SecretAlert) => void; onOpen: (a: SecretAlert) => void }) {
  if (!alerts.length) return null;
  return (
    <div className="fv-secret-alerts" role="region" aria-label="Segredos encontrados" aria-live="polite">
      {alerts.slice(0, 3).map((a) => (
        <article key={a.secret.id} className={`fv-secret-alert is-${a.secret.kind}`}>
          <button type="button" className="fv-secret-alert-seal" onClick={() => onOpen(a)} aria-label={`Abrir ${a.secret.title}`}>
            <SecretSeal kind={a.secret.kind} />
          </button>
          <div className="fv-secret-alert-txt">
            <small>{a.hit.by ? `${a.hit.by.name} encontrou` : 'Gatilho acionado'}</small>
            <b>{a.secret.title}</b>
            {a.hit.why.length > 0 && (
              <span className="fv-secret-why">
                {a.hit.why.map((w) => <i key={w}>{w}</i>)}
              </span>
            )}
          </div>
          <div className="fv-secret-alert-act">
            <button type="button" className="fv-btn-gold" onClick={() => onReveal(a)}>Revelar</button>
            <button type="button" className="fv-btn-ghost" onClick={() => onSnooze(a)}>Agora não</button>
          </div>
        </article>
      ))}
    </div>
  );
}
