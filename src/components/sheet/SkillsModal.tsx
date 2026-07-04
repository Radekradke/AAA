import { Modal } from '@/components/ui/Modal';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { skillLore } from '@/lib/lore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { ABILITY_SHORT, ABILITY_LABELS, ABILITY_COLORS } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import { modStr } from '@/engine/dice';
import { expertiseSlots, expertiseUsed } from '@/engine/levelUp';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';

interface SkillsModalProps {
  char: Character;
  derived: DerivedCharacter;
  onClose: () => void;
}

/**
 * Modal de perícias: as 18 perícias de D&D 5e em grade compacta —
 * nome, atributo base, bônus total, proficiência e expertise à vista.
 * Toque/clique rola o teste; a estrela marca expertise quando a classe
 * concede vagas (Ladino/Bardo, PHB 2014).
 */
export function SkillsModal({ char, derived, onClose }: SkillsModalProps) {
  const t = useTheme();
  const { check } = useDiceRoller();
  const store = useCharacterStore();

  const slots = expertiseSlots(char);
  const used = expertiseUsed(char);
  const canMark = slots > 0;

  // perícias agrupadas pelo atributo base — bate o olho e entende
  const groups = ABILITY_KEYS.map((key) => ({
    key,
    skills: derived.skills.filter((sk) => sk.ability === key),
  })).filter((g) => g.skills.length > 0);

  return (
    <Modal title="Perícias — todas" icon="crest" onClose={onClose} maxWidth={720}>
      {groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 13 }}>
          {/* cabeçalho do grupo: atributo + modificador */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
            <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 12, color: ABILITY_COLORS[g.key] }}>
              {ABILITY_SHORT[g.key]}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.05em' }}>
              {ABILITY_LABELS[g.key]}
            </span>
            <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13, color: ABILITY_COLORS[g.key] }}>
              {modStr(derived.abilities[g.key].mod)}
            </span>
            <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${hexA(ABILITY_COLORS[g.key], 0.4)}, transparent)` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 148px), 1fr))', gap: 8 }}>
            {g.skills.map((sk) => {
          const color = ABILITY_COLORS[sk.ability];
          const strong = sk.proficient;
          return (
            <div
              key={sk.key}
              style={{
                position: 'relative',
                border: '1px solid ' + (sk.expertise ? t.gold : strong ? hexA(t.gold, 0.45) : t.line),
                borderLeft: '3px solid ' + hexA(color, strong ? 0.9 : 0.35),
                borderRadius: 'var(--radius-md)',
                background: strong ? hexA(t.gold, 0.05) : 'rgba(0,0,0,.22)',
                padding: '9px 10px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <LoreTooltip info={skillLore(sk.key, sk.bonus, sk.proficient, sk.expertise)} anchorStyle={{ display: 'block' }}>
                <button
                  onClick={() => check(sk.label, sk.bonus)}
                  style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 10, fontWeight: 700, color }}>
                      {ABILITY_SHORT[sk.ability]}
                    </span>
                    <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 17, color: sk.expertise ? t.gold : strong ? 'var(--ink)' : 'var(--muted)' }}>
                      {modStr(sk.bonus)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, color: strong ? 'var(--ink)' : 'var(--muted)' }}>
                    {sk.label}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: sk.expertise ? t.gold : strong ? hexA(t.gold, 0.8) : 'transparent' }}>
                    {sk.expertise ? 'Expertise ×2' : strong ? 'Proficiente' : '·'}
                  </div>
                </button>
              </LoreTooltip>
              {canMark && sk.proficient && (
                <button
                  onClick={() => {
                    if (!sk.expertise && used >= slots) return;
                    store.toggleSkillExpertise(char.id, sk.key);
                  }}
                  title={sk.expertise ? 'Remover expertise' : used >= slots ? 'Sem vagas de expertise' : 'Marcar expertise'}
                  aria-label={`Expertise em ${sk.label}`}
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    cursor: !sk.expertise && used >= slots ? 'not-allowed' : 'pointer',
                    width: 20,
                    height: 20,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 5,
                    border: '1px solid ' + (sk.expertise ? t.gold : t.line),
                    background: sk.expertise ? hexA(t.gold, 0.18) : 'rgba(0,0,0,.3)',
                    color: sk.expertise ? t.gold : 'var(--muted)',
                    fontSize: 10,
                    opacity: !sk.expertise && used >= slots ? 0.35 : 1,
                  }}
                >
                  ★
                </button>
              )}
            </div>
          );
        })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)' }}>
        <span>Toque numa perícia para rolar 1d20 + bônus.</span>
        {canMark && (
          <span style={{ fontFamily: "'Chakra Petch', monospace", color: used >= slots ? t.gold : 'var(--acc)' }}>
            Expertise: {used}/{slots} vagas (★ nas proficientes)
          </span>
        )}
      </div>
    </Modal>
  );
}
