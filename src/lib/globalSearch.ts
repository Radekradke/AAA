/**
 * Busca geral (paleta Ctrl+K): compara sem acento e sem maiúsculas, todas
 * as palavras precisam aparecer, e ordena pelo que mais parece o que a
 * pessoa quis — nome igual > começa com > palavra inteira > palavra começa
 * com > contém.
 */

export type SearchKind = 'tela' | 'aba' | 'heroi' | 'mesa' | 'magia' | 'item' | 'condicao' | 'talento' | 'criatura';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  /** Outros termos que também acham este item (nome em inglês, escola, classe…). */
  keywords?: string;
  /** Peso extra (telas e heróis aparecem antes de regras com o mesmo nome). */
  boost?: number;
  intent?: { heal?: boolean; reaction?: boolean; concentration?: boolean; damageTypes?: string[] };
}

export const KIND_LABEL: Record<SearchKind, string> = {
  tela: 'Ir para',
  aba: 'Abas desta ficha',
  heroi: 'Seus heróis',
  mesa: 'Suas mesas',
  magia: 'Magias',
  item: 'Itens',
  condicao: 'Condições',
  talento: 'Talentos',
  criatura: 'Criaturas',
};

/** Ordem dos grupos na lista de resultados. */
export const KIND_ORDER: SearchKind[] = ['tela', 'aba', 'heroi', 'mesa', 'magia', 'item', 'condicao', 'talento', 'criatura'];

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

/** Pontua uma entrada para a busca (0 = não serve). */
export function scoreEntry(e: SearchEntry, query: string): number {
  const intent = e.intent ? parseSearchIntent(query) : { ...parseSearchIntent(''), text: normalize(query) };
  if (intent.heal && !e.intent?.heal) return 0;
  if (intent.reaction && !e.intent?.reaction) return 0;
  if (intent.noConcentration && (e.kind !== 'magia' || e.intent?.concentration !== false)) return 0;
  if (intent.damageType && !e.intent?.damageTypes?.includes(intent.damageType)) return 0;
  const q = intent.text;
  if (!q && intent.labels.length) return 20 + (e.boost ?? 0);
  if (!q) return 0;
  const title = normalize(e.title);
  const hay = `${title} ${normalize(e.subtitle ?? '')} ${normalize(e.keywords ?? '')}`;
  const tokens = q.split(' ');
  if (!tokens.every((t) => hay.includes(t))) return 0;
  let s = 1;
  if (title === q) s = 100;
  else if (title.startsWith(q)) s = 60;
  else if (title.split(' ').includes(tokens[0])) s = 40;
  else if (title.split(' ').some((w) => w.startsWith(tokens[0]))) s = 35;
  else if (title.includes(q)) s = 20;
  else if (tokens.every((t) => title.includes(t))) s = 12;
  // nomes curtos ganham de longos com o mesmo começo ("Luz" antes de "Luz do Dia")
  return s + (e.boost ?? 0) - Math.min(title.length, 40) / 100;
}

/** Filtros explícitos: “sem concentração” nunca é tratado como uma palavra positiva. */
export function parseSearchIntent(query: string) {
  let text = normalize(query);
  const noConcentration = /\bsem concentracao\b/.test(text);
  text = text.replace(/\bsem concentracao\b/g, '');
  const heal = /\b(curar|cura|curacao|recuperar pv)\b/.test(text);
  text = text.replace(/\b(curar|cura|curacao|recuperar pv)\b/g, '');
  const reaction = /\b(reacao|reagir)\b/.test(text);
  text = text.replace(/\b(reacao|reagir)\b/g, '');
  const damageType = /\b(fogo|frio|necrotico|radiante|eletrico|acido|veneno|trovejante|psiquico|energia)\b/.exec(text)?.[1];
  if (damageType) text = text.replace(new RegExp(`\\b${damageType}\\b`, 'g'), '');
  const labels = [heal && 'Cura', reaction && 'Reação', noConcentration && 'Sem concentração', damageType && `Dano de ${damageType}`].filter(Boolean) as string[];
  if (labels.length) text = text.replace(/\b(quero|preciso|uma|um|magia|magias|de|para|com|e|dano)\b/g, '');
  return { text: text.replace(/\s+/g, ' ').trim(), heal, reaction, noConcentration, damageType, labels };
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchEntry[];
}

/** Resultados agrupados por tipo, no máximo `perGroup` por grupo. */
export function searchAll(entries: SearchEntry[], query: string, perGroup = 6): SearchGroup[] {
  const scored = entries
    .map((e) => ({ e, s: scoreEntry(e, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title));
  const groups = new Map<SearchKind, SearchEntry[]>();
  for (const { e } of scored) {
    const list = groups.get(e.kind) ?? [];
    if (list.length < perGroup) list.push(e);
    groups.set(e.kind, list);
  }
  // grupo com o melhor resultado primeiro; empate segue a ordem padrão
  const best = (k: SearchKind) => scored.find((x) => x.e.kind === k)?.s ?? 0;
  return [...groups.keys()]
    .sort((a, b) => best(b) - best(a) || KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))
    .map((kind) => ({ kind, label: KIND_LABEL[kind], items: groups.get(kind)! }));
}
