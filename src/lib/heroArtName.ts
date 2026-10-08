import { CLASSES } from '@/data/classes';

/** Formas femininas dos nomes de classe (o masculino vem do cadastro). */
const FEMININE: Record<string, string> = {
  barbarian: 'Bárbara',
  bard: 'Barda',
  cleric: 'Clériga',
  fighter: 'Guerreira',
  monk: 'Monja',
  paladin: 'Paladina',
  ranger: 'Patrulheira',
  rogue: 'Ladina',
  sorcerer: 'Feiticeira',
  warlock: 'Bruxa',
  wizard: 'Maga',
};

/** "Clériga feminina" → "cleriga-feminina" */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const CLASS_BY_SLUG = new Map<string, string>();
for (const c of CLASSES) {
  CLASS_BY_SLUG.set(c.id, c.id);
  CLASS_BY_SLUG.set(slug(c.label), c.id);
  if (FEMININE[c.id]) CLASS_BY_SLUG.set(slug(FEMININE[c.id]), c.id);
}

/**
 * Nome do arquivo do retrato → chave `<classe>-<masc|fem>`.
 * Aceita o padrão do código (`cleric-fem.webp`) e o jeito natural em
 * português (`Clériga feminina.webp`, `Bardo masculino.png`, `druida_fem.jpg`).
 */
export function artKeyFromFileName(fileName: string): string | null {
  const base = slug(fileName.replace(/\.\w+$/, ''));
  const m = base.match(/^(.*)-(masc\w*|fem\w*|m|f)$/);
  if (!m) return null;
  const classId = CLASS_BY_SLUG.get(m[1]);
  if (!classId) return null;
  return `${classId}-${m[2].startsWith('f') ? 'fem' : 'masc'}`;
}

/**
 * Nome do arquivo de voz → chave `<classe>-<masc|fem>`. Igual ao retrato,
 * mas também aceita só o nome da classe: a forma feminina já diz o sexo
 * (`Barda.mp3`, `Monja.mp3`) e a masculina também (`Patrulheiro.mp3`).
 * Nomes iguais nos dois (`Druida.mp3`) precisam de "masculino"/"feminino".
 */
export function voiceKeyFromFileName(fileName: string): string | null {
  const key = artKeyFromFileName(fileName);
  if (key) return key;
  const base = slug(fileName.replace(/\.\w+$/, ''));
  for (const c of CLASSES) {
    const fem = slug(FEMININE[c.id] ?? c.label);
    const masc = slug(c.label);
    if (fem === masc) continue;
    if (base === fem) return `${c.id}-fem`;
    if (base === masc) return `${c.id}-masc`;
  }
  return null;
}
