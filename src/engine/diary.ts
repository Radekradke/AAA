import type { Character, Diary, DiaryClue, DiaryPersonNote, DiaryQuest, JournalEntry } from '@/types/character';

/**
 * Diário pessoal do jogador (fica na ficha, funciona offline):
 * rabiscos, crônica das sessões, Quadro da Guilda, pistas e pessoas.
 *
 * Menções no texto: "@Nome" cita um NPC ou um herói da campanha; "#Lugar"
 * marca um lugar ("#Porto Sombrio", "#Torre de Vigia").
 */

/** Diário da ficha, migrando as anotações rápidas antigas (char.notes) para um rabisco fixado. */
export function diaryOf(char: Pick<Character, 'diary' | 'notes'>): Diary {
  if (char.diary) return char.diary;
  const legacy = (char.notes ?? '').trim();
  return {
    notes: legacy ? [{ id: 'n-legacy', text: legacy, pinned: true, at: 0 }] : [],
    quests: [],
    clues: [],
    people: {},
  };
}

const LEGACY_FIELDS: [keyof JournalEntry, string][] = [
  ['npcs', 'NPCs'],
  ['locations', 'Lugares'],
  ['quests', 'Missões'],
  ['treasure', 'Tesouros'],
  ['notes', 'Anotações'],
];

/** Texto da sessão: o livre (novo) ou os campos antigos juntados num texto só. */
export function entryBody(e: JournalEntry): string {
  if (e.body !== undefined) return e.body;
  const parts = [e.summary?.trim()].filter(Boolean) as string[];
  for (const [key, label] of LEGACY_FIELDS) {
    const v = String(e[key] ?? '').trim();
    if (v) parts.push(`${label}: ${v}`);
  }
  return parts.join('\n\n');
}

/** Número da sessão (as antigas eram "Sessão 3" no campo data). */
export function entrySession(e: JournalEntry, fallback: number): number {
  if (e.session) return e.session;
  const m = /sess[aã]o\s*(\d+)/i.exec(e.date ?? '');
  return m ? Number(m[1]) : fallback;
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Alguém ou algum lugar que dá para citar. */
export interface Mentionable {
  key: string;
  kind: 'npc' | 'hero' | 'place';
  name: string;
  portrait?: string | null;
  /** "Taverneira", "Anão · Clérigo 5". */
  role?: string;
  summary?: string;
}

/** Quem da lista aparece no texto: "@Nome", "#Nome" ou o nome inteiro escrito. */
export function findMentions<T extends Pick<Mentionable, 'name'>>(texts: string[], list: T[]): T[] {
  const all = norm(texts.join('\n'));
  return list.filter((m) => {
    const name = norm(m.name);
    if (!name) return false;
    let i = all.indexOf(name);
    while (i >= 0) {
      const before = all[i - 1];
      const after = all[i + name.length];
      if ((!before || !/[a-z0-9]/.test(before)) && (!after || !/[a-z0-9]/.test(after))) return true;
      i = all.indexOf(name, i + 1);
    }
    return false;
  });
}

/**
 * Lugares marcados com #: palavras com inicial maiúscula, ligadas por
 * de/da/do/dos/das ("#Torre de Vigia", "#Porto Sombrio", "#Waterdeep").
 */
const PLACE_RE = /#([A-ZÀ-Ý][\p{L}'’-]*(?:\s+(?:(?:de|da|do|dos|das|e)\s+)?[A-ZÀ-Ý][\p{L}'’-]*)*)/gu;

/** Mesmo padrão, ancorado no começo (para ler um lugar a partir de uma posição). */
const PLACE_AT = new RegExp('^' + PLACE_RE.source, 'u');

export function placeTags(text: string): string[] {
  const out: string[] = [];
  // regex nova a cada leitura: o lastIndex de uma regex global não vaza entre chamadas
  for (const m of text.matchAll(new RegExp(PLACE_RE))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Todos os textos do diário (para lugares conhecidos, busca e Pessoas). */
export function diaryTexts(char: Pick<Character, 'diary' | 'notes' | 'journal'>): string[] {
  const d = diaryOf(char);
  return [
    ...d.notes.map((n) => n.text),
    ...char.journal.map((e) => `${e.title}\n${entryBody(e)}`),
    ...d.quests.map(questText),
    ...d.clues.map(clueText),
  ];
}

/** Lugares já marcados em qualquer parte do diário (sugestões do #). */
export function knownPlaces(char: Pick<Character, 'diary' | 'notes' | 'journal'>): Mentionable[] {
  const seen = new Map<string, string>();
  for (const t of diaryTexts(char)) for (const p of placeTags(t)) if (!seen.has(norm(p))) seen.set(norm(p), p);
  return [...seen.values()].sort((a, b) => a.localeCompare(b)).map((name) => ({ key: `place:${norm(name)}`, kind: 'place' as const, name }));
}

/** Pedaços de um texto para exibir: texto puro, menção (@) ou lugar (#). */
export type TextPiece = { kind: 'text'; text: string } | { kind: 'mention'; text: string; target: Mentionable } | { kind: 'place'; text: string };

export function splitMentions(text: string, people: Mentionable[]): TextPiece[] {
  // nomes mais longos primeiro ("Mara Pedrafria" antes de "Mara")
  const names = [...people].sort((a, b) => b.name.length - a.name.length);
  const out: TextPiece[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf });
    buf = '';
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === '@') {
      const rest = norm(text.slice(i + 1, i + 61));
      const hit = names.find((p) => {
        const n = norm(p.name);
        return rest.startsWith(n) && !/[a-z0-9]/.test(rest[n.length] ?? '');
      });
      if (hit) {
        flush();
        out.push({ kind: 'mention', text: text.slice(i + 1, i + 1 + hit.name.length), target: hit });
        i += 1 + hit.name.length;
        continue;
      }
    }
    if (ch === '#') {
      const m = PLACE_AT.exec(text.slice(i));
      if (m) {
        flush();
        out.push({ kind: 'place', text: m[1] });
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

/** Resumo automático de uma sessão: quem apareceu e por onde o grupo passou. */
export function sessionDigest(text: string, people: Mentionable[]): { people: Mentionable[]; places: string[] } {
  return { people: findMentions([text], people), places: placeTags(text) };
}

/** Rabiscos em aberto (fixados primeiro), para a ficha impressa. */
export function printableNotes(char: Pick<Character, 'diary' | 'notes'>): string {
  return diaryOf(char)
    .notes.filter((n) => !n.done && n.text.trim())
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at - a.at)
    .map((n) => n.text.trim().replace(/[@#](?=\S)/g, ''))
    .join('\n\n');
}

/** Colunas do Quadro da Guilda, na ordem em que a missão anda. */
export const QUEST_COLUMNS: { id: DiaryQuest['status']; label: string; short: string; hint: string; empty: string }[] = [
  { id: 'rumor', label: 'Rumores', short: 'Rumor', hint: 'ouvimos falar', empty: 'Boatos de taverna, cartazes, pedidos que ainda não aceitamos.' },
  { id: 'active', label: 'Ativas', short: 'Ativa', hint: 'estamos nessa', empty: 'Nenhuma missão em andamento.' },
  { id: 'done', label: 'Concluídas', short: 'Feita', hint: 'cumprimos', empty: 'Nada cumprido ainda.' },
  { id: 'failed', label: 'Falhas', short: 'Falhou', hint: 'perdemos ou largamos', empty: 'Nenhuma falha — por enquanto.' },
];

/** Objetivos cumpridos de uma missão. */
export function questProgress(q: Pick<DiaryQuest, 'objectives'>): { done: number; total: number } {
  return { done: q.objectives.filter((o) => o.done).length, total: q.objectives.length };
}

/** Situações de uma pista, com o carimbo que aparece no cartão. */
export const CLUE_STATUS: { id: DiaryClue['status']; label: string; plural: string; stamp: string; verdictLabel: string }[] = [
  { id: 'unverified', label: 'A verificar', plural: 'A verificar', stamp: 'A verificar', verdictLabel: '' },
  { id: 'confirmed', label: 'Confirmada', plural: 'Confirmadas', stamp: 'Confirmada', verdictLabel: 'Como confirmamos?' },
  { id: 'false', label: 'Falsa', plural: 'Falsas', stamp: 'Falsa', verdictLabel: 'Por que é falsa?' },
];

/** Quantas pistas podem ter imagem anexada (cada uma vai comprimida para ~150 KB dentro da ficha). */
export const MAX_CLUE_IMAGES = 30;

/** Pistas com imagem anexada (as do mestre não contam: ficam no armazenamento da mesa). */
export const clueImageCount = (clues: Pick<DiaryClue, 'image'>[]) => clues.filter((c) => !!c.image).length;

/** Pistas ligadas a uma missão do Quadro da Guilda. */
export const cluesForQuest = (clues: DiaryClue[], questId: string) => clues.filter((c) => c.questId === questId);

/** Texto pesquisável de uma pista. */
export const clueText = (c: DiaryClue) => [c.title, c.text, c.source, c.verdict].filter(Boolean).join('\n');

/** Seções do diário (a ordem das abas). */
export type DiarySection = 'notes' | 'chronicle' | 'board' | 'clues' | 'people';

/** O que o herói acha de alguém (página Pessoas). */
export const PERSON_OPINION: { id: NonNullable<DiaryPersonNote['opinion']>; label: string }[] = [
  { id: 'ally', label: 'Aliado' },
  { id: 'neutral', label: 'Neutro' },
  { id: 'suspect', label: 'Suspeito' },
  { id: 'enemy', label: 'Inimigo' },
];

/** Um item do diário, com o texto que a busca e as menções leem. */
export interface DiaryItem {
  section: Exclude<DiarySection, 'people'>;
  id: string;
  title: string;
  text: string;
}

const questText = (q: DiaryQuest) => [q.title, q.giver, q.reward, q.notes, ...q.objectives.map((o) => o.text)].filter(Boolean).join('\n');

/** Todos os itens do diário, cada um com o texto que pode ser buscado. */
export function diaryItems(char: Pick<Character, 'diary' | 'notes' | 'journal'>): DiaryItem[] {
  const d = diaryOf(char);
  const total = char.journal.length;
  return [
    ...d.notes.map((n) => ({ section: 'notes' as const, id: n.id, title: n.text.split('\n')[0].slice(0, 60), text: n.text })),
    ...char.journal.map((e, i) => {
      const n = entrySession(e, total - i);
      return { section: 'chronicle' as const, id: e.id, title: e.title.trim() || `Sessão ${n}`, text: `${e.title}\n${entryBody(e)}` };
    }),
    ...d.quests.map((q) => ({ section: 'board' as const, id: q.id, title: q.title.trim() || 'Missão sem nome', text: questText(q) })),
    ...d.clues.map((c) => ({ section: 'clues' as const, id: c.id, title: c.title.trim() || 'Pista sem nome', text: clueText(c) })),
  ];
}

/** Quantos itens de cada seção batem com a busca (a busca do diário vale para todas). */
export function sectionHits(char: Pick<Character, 'diary' | 'notes' | 'journal'>, query: string): Record<Exclude<DiarySection, 'people'>, number> {
  const out = { notes: 0, chronicle: 0, board: 0, clues: 0 };
  const q = norm(query);
  if (!q) return out;
  for (const it of diaryItems(char)) if (norm(it.text).includes(q)) out[it.section]++;
  return out;
}

/** Onde alguém aparece no diário (rabiscos, sessões, missões e pistas). */
export function whereMentioned(char: Pick<Character, 'diary' | 'notes' | 'journal'>, who: Pick<Mentionable, 'name'>): DiaryItem[] {
  return diaryItems(char).filter((it) => findMentions([it.text], [who]).length > 0);
}

/** Anotação pessoal sobre alguém (chave = nome normalizado). */
export const personKey = (name: string) => norm(name);
