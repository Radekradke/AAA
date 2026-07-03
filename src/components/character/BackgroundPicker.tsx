import { BACKGROUNDS, getBackground } from '@/data/backgrounds';
import { ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { hexA } from '@/lib/color';
import { useTheme } from '@/lib/useTheme';
import type { Character } from '@/types/character';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { skillLore } from '@/lib/lore';

interface BackgroundPickerProps {
  char: Character;
  update: (recipe: (c: Character) => void) => void;
}

/** Escolha de antecedente com impacto mecânico visível para a criação. */
export function BackgroundPicker({ char, update }: BackgroundPickerProps) {
  const t = useTheme();
  const selectedBg = getBackground(char.backgroundId);

  return (
    <section
      className="fv-surface"
      style={{
        border: '1px solid ' + hexA(t.gold, 0.35),
        boxShadow: '0 0 26px ' + hexA(t.gold, 0.12) + ', inset 0 1px 0 rgba(255,255,255,.05)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="fv-label" style={{ marginBottom: 6 }}>Antecedente</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>
            {selectedBg.label}
          </div>
        </div>
        <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--gold)' }}>
          + proficiência em {selectedBg.skills.length} perícias
        </div>
      </div>

      <div className="fv-card-grid">
        {BACKGROUNDS.map((b) => {
          const selected = char.backgroundId === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => update((c) => { c.backgroundId = b.id; })}
              style={{
                cursor: 'pointer',
                minHeight: 92,
                textAlign: 'left',
                padding: '12px 12px 10px',
                borderRadius: 13,
                border: '1px solid ' + (selected ? t.gold : t.line),
                background: selected ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.24)',
                boxShadow: selected ? '0 0 20px ' + hexA(t.gold, 0.24) : 'none',
                transition: '.2s',
              }}
            >
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: selected ? t.gold : 'var(--ink)' }}>
                {b.label}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {b.skills.map((skill) => (
                  <LoreTooltip key={skill} info={skillLore(skill, 0, true)}>
                    <span
                      className={selected ? 'fv-chip fv-chip-gold' : 'fv-chip'}
                      style={{
                        cursor: 'help',
                        fontSize: 10.5,
                        minHeight: 22,
                        padding: '4px 7px',
                        color: selected ? '#140d04' : 'var(--muted)',
                        background: selected ? t.gold : undefined,
                      }}
                    >
                      {SKILL_BY_KEY[skill].label}
                    </span>
                  </LoreTooltip>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="fv-responsive-split" style={{ marginTop: 14 }}>
        <div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.58 }}>{selectedBg.desc}</p>
          <p style={{ margin: '8px 0 0', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.5 }}>
            {selectedBg.featureName && <b style={{ color: t.gold }}>{selectedBg.featureName}: </b>}
            {selectedBg.feature}
          </p>
          {/* o que este antecedente concede mecanicamente */}
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(selectedBg.tools ?? []).map((id) => (
              <span key={id} className="fv-chip" style={{ color: 'var(--ink)' }}>⚒ {toolLabel(id)}</span>
            ))}
            {selectedBg.languagesCount ? (
              <span className="fv-chip" style={{ color: 'var(--ink)' }}>
                +{selectedBg.languagesCount} idioma{selectedBg.languagesCount > 1 ? 's' : ''} à escolha
              </span>
            ) : null}
            {selectedBg.startingGold ? (
              <span className="fv-chip fv-chip-gold">{selectedBg.startingGold} po iniciais</span>
            ) : null}
          </div>
          {(selectedBg.equipment ?? []).length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--ink)' }}>Equipamento:</b> {selectedBg.equipment!.join(' · ')}
            </div>
          )}
        </div>
        <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 13 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>
            Favorece
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {selectedBg.suggestedAbilities.map((ability) => (
              <span
                key={ability}
                style={{
                  fontFamily: "'Chakra Petch', monospace",
                  fontWeight: 700,
                  fontSize: 12,
                  color: t.gold,
                  border: '1px solid ' + hexA(t.gold, 0.35),
                  background: hexA(t.gold, 0.1),
                  borderRadius: 999,
                  padding: '5px 10px',
                }}
              >
                {ABILITY_SHORT[ability]}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.45 }}>
            Perícias, ferramentas, idiomas e equipamento entram na ficha automaticamente ao concluir.
          </div>
        </div>
      </div>
    </section>
  );
}
