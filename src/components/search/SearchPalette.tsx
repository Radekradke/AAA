import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { searchAll } from '@/lib/globalSearch';
import type { SearchEntry, SearchKind } from '@/lib/globalSearch';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { shortSubtitle } from '@/lib/summary';
import { SPELLS } from '@/data/spells';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { GEAR } from '@/data/gear';
import { MAGIC_ITEMS } from '@/data/magicItems';
import { CONDITIONS } from '@/data/conditions';
import { FEATS } from '@/data/feats';
import { MONSTERS } from '@/data/bestiary';
import { getClass } from '@/data/classes';
import { SHEET_TABS } from '@/components/sheet/sheetTabDefs';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';
import type { Item, Spell } from '@/types/dnd';
import '@/styles/search.css';

type Ref =
  | { t: 'nav'; to: string; state?: unknown }
  | { t: 'run'; run: () => void }
  | { t: 'spell'; v: Spell }
  | { t: 'item'; v: Item }
  | { t: 'cond'; v: (typeof CONDITIONS)[number] }
  | { t: 'feat'; v: (typeof FEATS)[number] }
  | { t: 'monster'; v: (typeof MONSTERS)[number] };

type Entry = SearchEntry & { ref: Ref };

const KIND_ICON: Record<SearchKind, IconName> = {
  tela: 'spark',
  aba: 'crest',
  heroi: 'crest',
  mesa: 'banner',
  magia: 'spark',
  item: 'satchel',
  condicao: 'moon',
  talento: 'star',
  criatura: 'swords',
};

const RARITY: Record<Item['rarity'], string> = { comum: 'comum', incomum: 'incomum', raro: 'raro', 'muito-raro': 'muito raro', lendario: 'lendário' };
const spellLevel = (s: Spell) => (s.level === 0 ? 'Truque' : `${s.level}º círculo`);
const dmg = (i: Item) => (i.weapon ? `${i.weapon.damageDice}d${i.weapon.damageDie} ${i.weapon.damageType}` : '');

/**
 * Busca geral (Ctrl+K ou "/"): telas, abas da ficha aberta, seus heróis e
 * mesas, e as regras do app (magias, itens, condições, talentos, criaturas).
 * Regra abre o resumo ali mesmo; tela/herói/mesa leva até lá.
 */
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const openTutorial = useUiStore((s) => s.openTutorial);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; master: boolean }[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useDialogFocus(boxRef, true, () => (detail ? setDetail(null) : onClose()));

  useEffect(() => inputRef.current?.focus(), [detail]);

  // mesas da conta (nuvem): carregam ao abrir a busca
  useEffect(() => {
    if (!user || user.guest) return;
    let alive = true;
    void import('@/services/campaignService')
      .then(({ campaignService }) => campaignService.myCampaigns(user.id))
      .then((r) => alive && setCampaigns([...r.asMaster.map((c) => ({ id: c.id, name: c.name, master: true })), ...r.asPlayer.map((c) => ({ id: c.id, name: c.name, master: false }))]))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  const sheetId = /^\/ficha\/([^/]+)$/.exec(location.pathname)?.[1] ?? null;

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [
      { id: 't-home', kind: 'tela', title: 'Menu principal', keywords: 'inicio home', boost: 3, ref: { t: 'nav', to: '/' } },
      { id: 't-heroes', kind: 'tela', title: 'Heróis', keywords: 'personagens fichas importar', boost: 3, ref: { t: 'nav', to: '/personagens' } },
      { id: 't-new', kind: 'tela', title: 'Nova ficha', keywords: 'criar personagem heroi forjar', boost: 3, ref: { t: 'nav', to: '/criar' } },
      { id: 't-tables', kind: 'tela', title: 'Mesas', keywords: 'campanhas multiplayer convite codigo entrar', boost: 3, ref: { t: 'nav', to: '/mesas' } },
      { id: 't-config', kind: 'tela', title: 'Configurações', keywords: 'tema som musica dados 3d livros conta tutorial', boost: 3, ref: { t: 'nav', to: '/config' } },
      { id: 't-tutorial', kind: 'tela', title: 'Tutorial', keywords: 'ajuda como funciona', boost: 3, ref: { t: 'run', run: openTutorial } },
      { id: 't-portraits', kind: 'tela', title: 'Oficina de retratos', keywords: 'arte imagem foto', boost: 2, ref: { t: 'nav', to: '/retratos' } },
      { id: 't-diag', kind: 'tela', title: 'Diagnóstico', keywords: 'nuvem sincronizar conexao', boost: 1, ref: { t: 'nav', to: '/diagnostico' } },
    ];
    if (sheetId) {
      for (const tab of SHEET_TABS) list.push({ id: `a-${tab.id}`, kind: 'aba', title: tab.label, subtitle: 'Aba da ficha', boost: 4, ref: { t: 'nav', to: `/ficha/${sheetId}`, state: { tab: tab.id } } });
      list.push({ id: 'a-print', kind: 'aba', title: 'Ficha ilustrada / imprimir', keywords: 'pdf imprimir', boost: 4, ref: { t: 'nav', to: `/ficha/${sheetId}/imprimir` } });
    }
    for (const c of characters) {
      if (!user || c.ownerId !== user.id || c.draft) continue;
      list.push({ id: `h-${c.id}`, kind: 'heroi', title: c.name || 'Sem nome', subtitle: shortSubtitle(c), boost: 5, ref: { t: 'nav', to: `/ficha/${c.id}` } });
    }
    for (const m of campaigns) list.push({ id: `m-${m.id}`, kind: 'mesa', title: m.name, subtitle: m.master ? 'Você é o mestre' : 'Você joga', boost: 5, ref: { t: 'nav', to: `/mesa/${m.id}` } });
    for (const s of SPELLS) list.push({ id: `s-${s.id}`, kind: 'magia', title: s.name, subtitle: `${spellLevel(s)} · ${s.school}`, keywords: `${s.school} ${(s.classes ?? []).map((c) => getClass(c).label).join(' ')}`, ref: { t: 'spell', v: s } });
    for (const i of [...WEAPONS, ...ARMORS, ...GEAR, ...MAGIC_ITEMS]) list.push({ id: `i-${i.id}`, kind: 'item', title: i.name, subtitle: [i.group, dmg(i), i.rarity !== 'comum' ? RARITY[i.rarity] : ''].filter(Boolean).join(' · '), keywords: i.group, ref: { t: 'item', v: i } });
    for (const c of CONDITIONS) list.push({ id: `c-${c.id}`, kind: 'condicao', title: c.label, subtitle: c.short, boost: 1, ref: { t: 'cond', v: c } });
    for (const f of FEATS) list.push({ id: `f-${f.id}`, kind: 'talento', title: f.label, subtitle: f.prereq ? `Pré-requisito: ${f.prereq}` : f.source, ref: { t: 'feat', v: f } });
    for (const m of MONSTERS) list.push({ id: `x-${m.id}`, kind: 'criatura', title: m.name, subtitle: `ND ${m.cr} · ${m.type}`, keywords: m.en, ref: { t: 'monster', v: m } });
    return list;
  }, [characters, user, campaigns, sheetId, openTutorial]);

  const groups = useMemo(() => searchAll(entries, q), [entries, q]);
  const flat = useMemo(() => groups.flatMap((g) => g.items) as Entry[], [groups]);
  useEffect(() => setActive(0), [q]);

  const choose = (e: Entry) => {
    const r = e.ref;
    if (r.t === 'nav') {
      onClose();
      navigate(r.to, r.state ? { state: r.state } : undefined);
    } else if (r.t === 'run') {
      onClose();
      r.run();
    } else setDetail(e);
  };

  const onKey = (ev: ReactKeyboardEvent) => {
    if (!flat.length) return;
    if (ev.key === 'ArrowDown') setActive((a) => (a + 1) % flat.length);
    else if (ev.key === 'ArrowUp') setActive((a) => (a - 1 + flat.length) % flat.length);
    else if (ev.key === 'Enter') choose(flat[active]);
    else return;
    ev.preventDefault();
  };
  useEffect(() => {
    boxRef.current?.querySelector('.fv-search-item.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let n = -1;
  return createPortal(
    <div className="fv-search-backdrop" onClick={onClose}>
      <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Buscar" className="fv-search fv-panel" onClick={(e) => e.stopPropagation()}>
        {detail ? (
          <Detail e={detail} onBack={() => setDetail(null)} />
        ) : (
          <>
            <div className="fv-search-field">
              <Icon name="search" size={18} />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded={flat.length > 0}
                aria-controls="fv-search-results"
                aria-activedescendant={flat[active] ? `fv-sr-${flat[active].id}` : undefined}
                aria-label="Buscar telas, heróis, magias, itens, regras…"
                placeholder="Buscar telas, heróis, magias, itens, regras…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="fv-search-close" onClick={onClose} aria-label="Fechar busca">
                Esc
              </button>
            </div>
            <div id="fv-search-results" role="listbox" aria-label="Resultados" className="fv-search-results">
              {!q.trim() && (
                <p className="fv-search-hint">
                  Digite um nome: <b>bola de fogo</b>, <b>espada longa</b>, <b>agarrado</b>, <b>goblin</b>, o nome de um herói ou de uma tela.
                  <br />
                  Atalhos: <kbd>Ctrl</kbd>+<kbd>K</kbd> ou <kbd>/</kbd> abre · <kbd>↑</kbd><kbd>↓</kbd> escolhe · <kbd>Enter</kbd> abre.
                </p>
              )}
              {q.trim() && !flat.length && <p className="fv-search-hint">Nada encontrado para “{q}”.</p>}
              {groups.map((g) => (
                <div key={g.kind} role="group" aria-label={g.label} className="fv-search-group">
                  <div className="fv-search-group-label">{g.label}</div>
                  {(g.items as Entry[]).map((e) => {
                    n++;
                    const i = n;
                    return (
                      <div
                        key={e.id}
                        id={`fv-sr-${e.id}`}
                        role="option"
                        aria-selected={i === active}
                        className={'fv-search-item' + (i === active ? ' is-active' : '')}
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(e)}
                      >
                        <Icon name={KIND_ICON[e.kind]} size={15} />
                        <span className="fv-search-item-text">
                          <b>{e.title}</b>
                          {e.subtitle && <small>{e.subtitle}</small>}
                        </span>
                        <span className="fv-search-item-go" aria-hidden>
                          {e.ref.t === 'nav' || e.ref.t === 'run' ? '↵' : 'ver'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ k, v }: { k: string; v?: ReactNode }) {
  if (v == null || v === '' || v === false) return null;
  return (
    <div className="fv-search-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/** Resumo da regra escolhida, sem sair da tela. */
function Detail({ e, onBack }: { e: Entry; onBack: () => void }) {
  const r = e.ref;
  return (
    <div className="fv-search-detail">
      <button type="button" className="fv-search-back" onClick={onBack}>
        ← Voltar à busca
      </button>
      <h2>{e.title}</h2>
      {e.subtitle && <div className="fv-search-detail-sub">{e.subtitle}</div>}
      {r.t === 'spell' && (
        <>
          <dl>
            <Row k="Conjuração" v={r.v.castingTime} />
            <Row k="Alcance" v={r.v.range} />
            <Row k="Componentes" v={r.v.components && (r.v.material ? `${r.v.components} (${r.v.material})` : r.v.components)} />
            <Row k="Duração" v={r.v.duration} />
            <Row k="Classes" v={(r.v.classes ?? []).map((c) => getClass(c).label).join(', ')} />
            <Row k="Ritual" v={r.v.ritual && 'sim'} />
          </dl>
          {r.v.desc && <p>{r.v.desc}</p>}
          {r.v.higher && <p><b>Em círculos superiores:</b> {r.v.higher}</p>}
        </>
      )}
      {r.t === 'item' && (
        <>
          <dl>
            <Row k="Dano" v={dmg(r.v) && `${dmg(r.v)}${r.v.weapon?.versatileDie ? ` (versátil d${r.v.weapon.versatileDie})` : ''}`} />
            <Row k="Propriedades" v={r.v.weapon?.properties.join(', ')} />
            <Row k="CA" v={r.v.armor ? `${r.v.armor.baseAC}${!r.v.armor.addDex ? '' : r.v.armor.maxDexBonus != null ? ` + Des (máx. ${r.v.armor.maxDexBonus})` : ' + Des'}` : r.v.acBonus ? `+${r.v.acBonus}` : ''} />
            <Row k="Furtividade" v={r.v.armor?.stealthDisadvantage && 'desvantagem'} />
            <Row k="Raridade" v={RARITY[r.v.rarity]} />
            <Row k="Sintonização" v={r.v.attunement && 'exige'} />
            <Row k="Peso" v={r.v.weight ? `${String(r.v.weight).replace('.', ',')} kg` : ''} />
            <Row k="Preço" v={r.v.value ? `${r.v.value} PO` : ''} />
          </dl>
          {r.v.note && <p>{r.v.note}</p>}
        </>
      )}
      {r.t === 'cond' && <p>{r.v.desc}</p>}
      {r.t === 'feat' && (
        <>
          <dl>
            <Row k="Pré-requisito" v={r.v.prereq} />
            <Row k="Livro" v={r.v.source} />
          </dl>
          <p>{r.v.desc}</p>
        </>
      )}
      {r.t === 'monster' && <MonsterStatBlock m={r.v} compact />}
    </div>
  );
}
