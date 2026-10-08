import { useMemo, useState } from 'react';
import { npcService } from '@/services/npcService';
import { stageService } from '@/services/stageService';
import { mediaService } from '@/services/mediaService';
import { processPortraitFile } from '@/lib/portrait';
import { buildCreatures, heroCombatant } from '@/components/session/MasterDeck';
import { ALL_ITEMS } from '@/data/items';
import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';
import { toast } from '@/store/feedbackStore';
import { useMaster, heroName } from '../context';
import { useMasterStore } from '../masterStore';
import { addToEncounter } from '../actions';
import { NoteInput } from '../backstage/MasterNotesPanel';

/**
 * CRIAÇÃO RÁPIDA — reagir ao que a mesa inventou em poucos segundos.
 * Só o essencial; o resto o mestre arruma depois (se quiser). O que nasce
 * aqui fica marcado como improviso e só vira conteúdo permanente com
 * "Guardar na campanha".
 */
interface FormProps {
  onDone: () => void;
}

const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v))));

export function QuickNpc({ onDone }: FormProps) {
  const { campaign, reloadNpcs } = useMaster();
  const sessionId = useSessionStore((s) => s.session?.id ?? null);
  const select = useMasterStore((m) => m.select);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [portrait, setPortrait] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const n = await npcService.save(campaign.id, { name, summary, portrait, revealed: show, improvisedIn: sessionId });
      reloadNpcs();
      select({ kind: 'npc', id: n.id });
      toast(`${n.name} criado${sessionId ? ' (improviso)' : ''}.`);
      onDone();
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="fv-quick-form" onSubmit={(e) => (e.preventDefault(), void submit())}>
      <input className="fv-input" autoFocus placeholder="Nome (ex.: Ferreiro Maluco)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
      <input className="fv-input" placeholder="Descrição curta (opcional)" value={summary} maxLength={300} onChange={(e) => setSummary(e.target.value)} />
      <div className="fv-quick-row">
        <label className="fv-quick-file">
          {portrait ? <img src={portrait} alt="" /> : '＋'} Retrato
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setPortrait((await processPortraitFile(f, { max: { w: 240, h: 300 } })).dataUrl);
              } catch (err) {
                toast((err as Error).message, { tone: 'danger' });
              }
            }}
          />
        </label>
        <label className="fv-ins-check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Jogadores já conhecem
        </label>
      </div>
      <button type="submit" className="fv-btn-gold fv-bs-btn" disabled={busy || !name.trim()}>
        Criar NPC
      </button>
    </form>
  );
}

export function QuickCreature({ onDone }: FormProps) {
  const busy = useSessionStore((s) => s.busy);
  const [f, setF] = useState({ name: '', ac: '', hp: '', bonus: '0', qty: '1', hidden: false, together: true });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));
  const qty = Math.max(1, Math.min(20, Number(f.qty) || 1));
  const submit = async () => {
    if (!f.name.trim()) return;
    await addToEncounter(buildCreatures({ name: f.name, type: 'monster', qty, bonus: Number(f.bonus) || 0, hp: num(f.hp), ac: num(f.ac), hidden: f.hidden, together: f.together }));
    onDone();
  };
  return (
    <form className="fv-quick-form" onSubmit={(e) => (e.preventDefault(), void submit())}>
      <input className="fv-input" autoFocus placeholder="Nome (ex.: Lobo das Cinzas)" value={f.name} maxLength={50} onChange={(e) => set('name', e.target.value)} required />
      <div className="fv-quick-grid">
        <label>
          CA
          <input className="fv-input" inputMode="numeric" value={f.ac} onChange={(e) => set('ac', e.target.value)} />
        </label>
        <label>
          PV
          <input className="fv-input" inputMode="numeric" value={f.hp} onChange={(e) => set('hp', e.target.value)} />
        </label>
        <label>
          Inic.
          <input className="fv-input" type="number" min={-5} max={15} value={f.bonus} onChange={(e) => set('bonus', e.target.value)} />
        </label>
        <label>
          Qtd.
          <input className="fv-input" type="number" min={1} max={20} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </label>
      </div>
      <div className="fv-quick-row">
        <label className="fv-ins-check">
          <input type="checkbox" checked={f.hidden} onChange={(e) => set('hidden', e.target.checked)} /> Oculta
        </label>
        {qty > 1 && (
          <label className="fv-ins-check">
            <input type="checkbox" checked={f.together} onChange={(e) => set('together', e.target.checked)} /> Iniciativa conjunta
          </label>
        )}
      </div>
      <button type="submit" className="fv-btn-gold fv-bs-btn" disabled={busy || !f.name.trim()}>
        Adicionar{qty > 1 ? ` ${qty}` : ''} ao encontro
      </button>
    </form>
  );
}

export function QuickHandout({ onDone }: FormProps) {
  const { campaign, heroes } = useMaster();
  const sessionId = useSessionStore((s) => s.session?.id ?? null);
  const refresh = useStageStore((s) => s.refresh);
  const select = useMasterStore((m) => m.select);
  const owners = useMemo(() => [...new Map(heroes.map((h) => [h.share.ownerId, h])).values()], [heroes]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // 'none' = fica na gaveta; 'all' = todos; senão, ids dos jogadores
  const [to, setTo] = useState<'none' | 'all' | string[]>('none');
  const [busy, setBusy] = useState(false);
  const toggle = (uid: string) => setTo((cur) => (Array.isArray(cur) ? (cur.includes(uid) ? (cur.length > 1 ? cur.filter((x) => x !== uid) : 'none') : [...cur, uid]) : [uid]));
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const imagePath = file ? (await mediaService.upload(campaign.id, file)).path : null;
      const recipients = Array.isArray(to) ? to : null;
      const h = await stageService.saveHandout(campaign.id, {
        title,
        body,
        imagePath,
        recipients,
        improvisedIn: sessionId,
        ...(to !== 'none' ? { shownAt: new Date().toISOString() } : {}),
      });
      await refresh();
      select({ kind: 'handout', id: h.id });
      toast(to === 'none' ? `"${h.title}" na gaveta.` : `"${h.title}" entregue.`);
      onDone();
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="fv-quick-form" onSubmit={(e) => (e.preventDefault(), void submit())}>
      <input className="fv-input" autoFocus placeholder="Título (ex.: Pedaço de carta)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required />
      <textarea className="fv-input" rows={3} placeholder={'"...o carregamento chegará durante a lua nova."'} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      <label className="fv-quick-file">
        {file ? `🖼 ${file.name}` : '＋ Imagem (opcional)'}
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="fv-ins-recips" role="group" aria-label="Mostrar para">
        <button type="button" className={to === 'none' ? 'is-on' : ''} onClick={() => setTo('none')}>
          Ninguém ainda
        </button>
        <button type="button" className={to === 'all' ? 'is-on' : ''} onClick={() => setTo('all')}>
          Todos
        </button>
        {owners.map((o) => (
          <button key={o.share.ownerId} type="button" className={Array.isArray(to) && to.includes(o.share.ownerId) ? 'is-on' : ''} onClick={() => toggle(o.share.ownerId)}>
            {heroName(o)}
          </button>
        ))}
      </div>
      <button type="submit" className="fv-btn-gold fv-bs-btn" disabled={busy || !title.trim()}>
        {to === 'none' ? 'Criar (na gaveta)' : 'Criar e entregar'}
      </button>
    </form>
  );
}

export function QuickItem({ onDone }: FormProps) {
  const { heroes } = useMaster();
  const preset = useMasterStore((m) => m.quickSheetId);
  const give = useSessionStore((s) => s.giveItem);
  const hasSession = useSessionStore((s) => !!s.session);
  const [sheetId, setSheetId] = useState(preset ?? heroes[0]?.share.sheetId ?? '');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const names = useMemo(() => ALL_ITEMS.map((i) => i.name), []);
  const hero = heroes.find((h) => h.share.sheetId === sheetId);
  if (!heroes.length) return <p className="fv-bs-hint">Nenhuma ficha vinculada à mesa para receber itens.</p>;
  const submit = async () => {
    if (!name.trim() || !hero) return;
    // nome igual ao do catálogo: vai com os números do item (arma, armadura, efeito)
    const base = ALL_ITEMS.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
    await give(sheetId, heroName(hero), { name, itemId: base?.id, quantity: Number(qty) || 1, note });
    if (!useSessionStore.getState().error) toast(`${name.trim()} vai para a mochila de ${heroName(hero)}.`);
    onDone();
  };
  return (
    <form className="fv-quick-form" onSubmit={(e) => (e.preventDefault(), void submit())}>
      {!hasSession && <p className="fv-bs-hint">Abra a sessão: o item chega na ficha pela crônica da sessão.</p>}
      <select className="fv-input" value={sheetId} onChange={(e) => setSheetId(e.target.value)} aria-label="Para qual herói">
        {heroes.map((h) => (
          <option key={h.share.sheetId} value={h.share.sheetId}>
            {heroName(h)}
          </option>
        ))}
      </select>
      <input className="fv-input" autoFocus list="fv-quick-items" placeholder="Item (do catálogo ou inventado)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
      <datalist id="fv-quick-items">
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="fv-quick-grid">
        <label>
          Qtd.
          <input className="fv-input" type="number" min={1} max={999} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="is-wide">
          Nota
          <input className="fv-input" placeholder="opcional" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <button type="submit" className="fv-btn-gold fv-bs-btn" disabled={!hasSession || !name.trim()}>
        Entregar a {hero ? heroName(hero) : 'herói'}
      </button>
    </form>
  );
}

export function QuickEncounter({ onDone }: FormProps) {
  const s = useSessionStore();
  const { heroes } = useMaster();
  const [name, setName] = useState('');
  const [withHeroes, setWithHeroes] = useState(true);
  if (!s.session) return <p className="fv-bs-hint">Abra a sessão primeiro (Bastidores → Sessão).</p>;
  if (s.encounter) return <p className="fv-bs-hint">Já existe um encontro aberto ({s.encounter.name}). Encerre-o na faixa de iniciativa para começar outro.</p>;
  const submit = async () => {
    await s.createEncounter(name || undefined);
    if (withHeroes && heroes.length && useSessionStore.getState().encounter) await s.addCombatants(heroes.map(heroCombatant));
    toast('Encontro aberto. Ponha criaturas pelo bestiário ou por + Criatura.');
    onDone();
  };
  return (
    <form className="fv-quick-form" onSubmit={(e) => (e.preventDefault(), void submit())}>
      <input className="fv-input" autoFocus placeholder="Nome (opcional)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      {heroes.length > 0 && (
        <label className="fv-ins-check">
          <input type="checkbox" checked={withHeroes} onChange={(e) => setWithHeroes(e.target.checked)} /> Já com os {heroes.length} heróis
        </label>
      )}
      <button type="submit" className="fv-btn-gold fv-bs-btn" disabled={s.busy}>
        Abrir encontro
      </button>
    </form>
  );
}

export function QuickNote({ onDone }: FormProps) {
  return (
    <div className="fv-quick-form">
      <NoteInput autoFocus onDone={onDone} />
      <small className="fv-bs-hint">🔒 Privada. Enter salva · Shift+Enter quebra a linha.</small>
    </div>
  );
}
