import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { heroSubtitle, heroAvatar, heroFace, heroPortraitPosition } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';
import { raceOf } from '@/data/races';
import { modStr } from '@/engine/dice';
import { useCharacterStore } from '@/store/characterStore';
import { OrnateCorners } from '@/components/ui/OrnateCorners';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { passiveLore, calcLore } from '@/lib/lore';
import { heroTitle, heroTitleTip } from '@/engine/titles';
import { RULE_KIND_LABEL, rulesSummary } from '@/engine/tableRules';

interface SheetHeaderProps {
  char: Character;
  derived: DerivedCharacter;
  /** Só identidade (sem os blocos de defesa) — usado na Mesa, que já os mostra. */
  compact?: boolean;
  /** Abre "compartilhar a ficha" (link ou PDF) — o botão de corrente junto do retrato. */
  onShare?: () => void;
  /** Leva ao painel "Regras desta ficha" (aba Evoluir). */
  onRules?: () => void;
  /** "+" do nível: leva ao plano do próximo nível (aba Evoluir), sem subir sozinho. */
  onLevelUp?: () => void;
}

/** Cabeçalho da ficha: avatar, nome, subtítulo e blocos de defesa. */
export function SheetHeader({ char, derived, compact, onShare, onRules, onLevelUp }: SheetHeaderProps) {
  const race = raceOf(char);
  const setLevel = useCharacterStore((s) => s.setLevel);

  // valores derivados com cálculo rastreável (tooltip mostra cada origem)
  const bd = derived.breakdowns;
  const defense = [
    { label: 'CA', short: 'CA', val: String(derived.ac), info: calcLore('Classe de Armadura', bd.ac, { intro: 'Quanto maior, mais difícil é acertar você.' }) },
    { label: 'Iniciativa', short: 'Inic.', val: modStr(derived.initiative), info: calcLore('Iniciativa', bd.initiative, { intro: 'Ordem no início do combate.' }) },
    { label: 'Desloc.', short: 'Desl.', val: `${derived.speed.toString().replace('.', ',')}m`, info: calcLore('Deslocamento', bd.speed, { unit: 'm', intro: 'Metros de movimento por turno.' }) },
    { label: 'Perc. Pass.', short: 'Perc.', val: String(derived.passivePerception), info: calcLore('Percepção Passiva', bd.passivePerception, { intro: 'Usada pelo mestre para perigos não anunciados.' }) },
    { label: 'Profic.', short: 'Prof.', val: modStr(derived.proficiency), info: passiveLore('Bônus de Proficiência', modStr(derived.proficiency), `Nível ${char.level} → bônus ${modStr(derived.proficiency)} (2 + ⌊(nível − 1) / 4⌋, PHB 2014). Soma em tudo que você é treinado.`, ['Ver cálculo']) },
  ];

  return (
    <div
      className="fv-panel fv-sheet-head animate-breathe"
      data-tour="sheet-head"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(12px,2.5vw,26px)',
        flexWrap: 'wrap',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        isolation: 'isolate',
        padding: compact ? 'clamp(12px,1.8vw,16px) clamp(16px,2.4vw,24px)' : 'clamp(16px,2.4vw,24px)',
      }}
    >
      {/* a arte do herói ao fundo, esmaecendo para a esquerda (assinatura da ficha) */}
      <div
        aria-hidden
        className="fv-sheet-head-art"
        style={{ backgroundImage: `url("${heroAvatar(char)}")`, backgroundPosition: heroPortraitPosition(char) }}
      />
      <span className="fv-hide-mobile" aria-hidden>
        <OrnateCorners size={18} inset={10} />
      </span>
      <div className="fv-sh-portrait" style={{ position: 'relative', width: compact ? 'clamp(56px,6.4vw,70px)' : 'clamp(68px,9vw,96px)', height: compact ? 'clamp(56px,6.4vw,70px)' : 'clamp(68px,9vw,96px)', flex: 'none', display: 'grid', placeItems: 'center' }}>
        <div
          className="fv-sh-portrait-ring"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            border: '1px solid ' + race.jewel,
            boxShadow: '0 0 30px var(--bloom)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url("${heroAvatar(char)}")`,
              ...heroFace(char),
            }}
          />
        </div>
        {/* trocar a arte fica em "Editar"; aqui, compartilhar a ficha */}
        {onShare && (
          <button type="button" className="fv-sh-share" onClick={onShare} aria-label="Compartilhar a ficha (link, PDF ou JSON)" title="Compartilhar a ficha">
            <Icon name="link" size={15} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fv-sh-name" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: compact ? 'clamp(20px,2.6vw,26px)' : 'clamp(22px,3vw,32px)', color: 'var(--ink)', lineHeight: 1.05, overflowWrap: 'anywhere' }}>
          {char.name}
          {heroTitle(char) && (
            <span className="fv-sh-title" title={heroTitleTip(char)}>
              {heroTitle(char)}
            </span>
          )}
        </div>
        <div className="fv-sh-sub">
          <span>{heroSubtitle(char)}</span>
          {char.alignment && <span className="fv-sh-align">{char.alignment}</span>}
          <RulesBadge char={char} onClick={onRules} />
        </div>
        <div className="fv-sh-level" style={{ marginTop: compact ? 8 : 12 }}>
          <span className="fv-sh-level-ctrl">
            <button onClick={() => setLevel(char.id, char.level - 1)} className="fv-sh-lvl-btn" aria-label="Diminuir nível" disabled={char.level <= 1}>−</button>
            <b>Nível {char.level}</b>
            {/* subir de nível tem escolhas (PV, talentos, magias…): leva à aba Evoluir em vez de pular tudo */}
            <button onClick={onLevelUp} className="fv-sh-lvl-btn" aria-label="Subir de nível (abre a aba Evoluir)" title="Subir de nível: abre a aba Evoluir com as escolhas do próximo nível" disabled={char.level >= 20}>+</button>
          </span>
          <span className="fv-sh-level-bar" aria-hidden title={`Nível ${char.level} de 20`}>
            <span style={{ width: `${Math.min(100, (char.level / 20) * 100)}%` }} />
          </span>
          <span className="fv-sh-level-max">/ 20</span>
        </div>
      </div>

      {!compact && (
      <div className="fv-header-stats">
        {defense.map((d) => (
          <LoreTooltip
            key={d.label}
            info={d.info}
            anchorStyle={{ display: 'block' }}
          >
            <div className="fv-header-stat">
              <div className="fv-header-stat-val">{d.val}</div>
              <div className="fv-header-stat-label">
                <span className="fv-hs-full">{d.label}</span>
                <span className="fv-hs-short" aria-hidden>{d.short}</span>
              </div>
            </div>
          </LoreTooltip>
        ))}
      </div>
      )}
    </div>
  );
}

/** Só aparece quando a ficha foge do 2014 puro (regra da mesa, homebrew, ajuste). */
function RulesBadge({ char, onClick }: { char: Character; onClick?: () => void }) {
  const { label, notes, pure } = rulesSummary(char);
  if (pure) return null;
  const tip = notes.filter((n) => n.kind !== 'opcional').map((n) => `${RULE_KIND_LABEL[n.kind]}: ${n.text}`).join('\n');
  return (
    <button type="button" className="fv-sh-rules" onClick={onClick} title={`${tip}\n\nToque para ver as regras desta ficha`}>
      {label}
    </button>
  );
}
