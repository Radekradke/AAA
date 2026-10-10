import { SchoolIcon } from '@/components/ui/RuleIcon';
import { spellArt, spellRarity } from '@/lib/spellArt';

interface Props {
  spell: { id: string; level: number; school: string };
  /** Lado em px (quadrado). */
  size?: number;
  /** Cantinho com o círculo ("T" para truque). */
  showLevel?: boolean;
}

/**
 * Miniatura da magia: a arte (quando já existe em src/assets/magias) ou o
 * símbolo da escola, numa moldura com a cor do círculo — a mesma raridade
 * da carta grande (truque comum, 1º–2º incomum, 3º–5º raro…).
 */
export function SpellThumb({ spell, size = 32, showLevel = false }: Props) {
  const art = spellArt(spell.id);
  return (
    <span className={`fv-spell-thumb is-${spellRarity(spell.level)}` + (art ? ' has-art' : '')} style={{ width: size, height: size }} aria-hidden>
      {art ? <img src={art} alt="" loading="lazy" decoding="async" /> : <SchoolIcon school={spell.school} size={Math.round(size * 0.52)} />}
      {showLevel && <b className="fv-spell-thumb-lv">{spell.level === 0 ? 'T' : spell.level}</b>}
    </span>
  );
}

/** Cor da moldura de cada raridade (a mesma das cartas). */
export const RARITY_COLOR: Record<string, string> = {
  comum: '#9ba7b5',
  incomum: '#3fc56b',
  raro: '#4d9bff',
  'muito-raro': '#b061ff',
  lendario: '#ffa033',
};

/**
 * Arte da magia no fundo do card (lista da aba Magias e da aba Jogar), no
 * estilo do card do herói: ocupa a direita e esmaece para o lado do texto.
 * Sem arte, não desenha nada — o card fica como antes.
 */
export function SpellArtBackdrop({ spell }: { spell: { id: string } }) {
  const art = spellArt(spell.id);
  if (!art) return null;
  return <span className="fv-spellart-bg" style={{ backgroundImage: `url("${art}")` }} aria-hidden />;
}

/** Props do card para quem tem arte: classe `has-art` e a cor do círculo. */
export function spellCardArt(spell: { id: string; level: number }): { className: string; style?: Record<string, string> } {
  if (!spellArt(spell.id)) return { className: '' };
  return { className: ' has-art', style: { '--rc': RARITY_COLOR[spellRarity(spell.level)] } };
}
