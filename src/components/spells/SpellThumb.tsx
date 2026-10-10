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

