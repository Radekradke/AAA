import type { Character } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';
import { deriveCharacter } from '@/engine/dndRules';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey, SkillKey } from '@/types/dnd';
import { ABILITY_LABELS, ABILITY_SHORT, SKILLS } from '@/data/skills';
import { BACKGROUNDS } from '@/data/backgrounds';
import { subclassesFor } from '@/data/subclasses';
import { subclassLevelFor } from '@/engine/levelUp';
import { racialBonusFor, abilityModifier } from '@/engine/modifiers';
import { modStr } from '@/engine/dice';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Modal } from '@/components/ui/Modal';

interface Props {
  char: Character;
  onClose: () => void;
}

/** Edição da ficha após criada: identidade, nível, atributos e perícias. */
export function CharacterEditModal({ char, onClose }: Props) {
  const t = useTheme();
  const { editCharacter, setLevel } = useCharacterStore();
  const derived = deriveCharacter(char);

  const setAbility = (k: AbilityKey, v: number) =>
    editCharacter(char.id, { baseAbilities: { ...char.baseAbilities, [k]: Math.max(3, Math.min(20, v)) } });

  const toggleSkill = (k: SkillKey) =>
    editCharacter(char.id, {
      skillProfs: char.skillProfs.includes(k) ? char.skillProfs.filter((x) => x !== k) : [...char.skillProfs, k],
    });

  const subs = subclassesFor(char.classId);
  const subLevel = subclassLevelFor(char.classId);
  const canPickSub = char.level >= subLevel && subs.length > 0;

  const label: React.CSSProperties = { display: 'block', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 };

  return (
    <Modal
      title="Editar herói"
      icon="edit"
      onClose={onClose}
      maxWidth={640}
      footer={
        <button onClick={onClose} className="fv-btn-gold" style={{ flex: 1, minHeight: 46, fontSize: 15 }}>
          Concluir
        </button>
      }
    >
        {/* identidade */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label>
            <span style={label}>Nome</span>
            <input className="fv-input" value={char.name} onChange={(e) => editCharacter(char.id, { name: e.target.value })} />
          </label>
          <label>
            <span style={label}>Antecedente</span>
            <select className="fv-input" value={char.backgroundId} onChange={(e) => editCharacter(char.id, { backgroundId: e.target.value })}>
              {BACKGROUNDS.map((b) => <option key={b.id} value={b.id} style={{ color: '#111' }}>{b.label}</option>)}
            </select>
          </label>
          <label>
            <span style={label}>Alinhamento</span>
            <input className="fv-input" value={char.alignment} onChange={(e) => editCharacter(char.id, { alignment: e.target.value })} />
          </label>
        </div>

        {/* nível */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 13, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, color: 'var(--gold)' }}>Nível {char.level}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Proficiência {modStr(derived.proficiency)} · PV máx. {derived.maxHp}</div>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <button onClick={() => setLevel(char.id, char.level - 1)} style={stepBtn(false)}>−</button>
            <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 22, color: 'var(--ink)', minWidth: 30, textAlign: 'center' }}>{char.level}</span>
            <button onClick={() => setLevel(char.id, char.level + 1)} style={stepBtn(true)}>+</button>
          </div>
        </div>

        {/* subclasse */}
        {subs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block' }}>
              <span style={label}>Subclasse {canPickSub ? '' : `(escolhida no nível ${subLevel})`}</span>
              <select
                className="fv-input"
                value={char.subclassId ?? ''}
                disabled={!canPickSub}
                onChange={(e) => editCharacter(char.id, { subclassId: e.target.value || null })}
                style={{ opacity: canPickSub ? 1 : 0.55 }}
              >
                <option value="" style={{ color: '#111' }}>— nenhuma —</option>
                {subs.map((s) => <option key={s.id} value={s.id} style={{ color: '#111' }}>{s.label}</option>)}
              </select>
            </label>
            {derived.grantedProficiencies.length > 0 && (
              <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--muted)' }}>
                Concede: <b style={{ color: 'var(--acc)' }}>{derived.grantedProficiencies.join(' · ')}</b>
              </div>
            )}
            {derived.critMin < 20 && (
              <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--muted)' }}>
                Crítico ampliado: acerto crítico em <b style={{ color: 'var(--gold)' }}>{derived.critMin}–20</b>.
              </div>
            )}
          </div>
        )}

        {/* atributos */}
        <div style={{ marginTop: 16 }}>
          <div className="fv-label" style={{ marginBottom: 10 }}>Atributos (valor base)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10 }}>
            {ABILITY_KEYS.map((k) => {
              const base = char.baseAbilities[k];
              const racial = racialBonusFor(k, char.raceId, char.subraceId);
              const total = base + racial;
              return (
                <div key={k} style={{ textAlign: 'center', background: 'linear-gradient(170deg, var(--panel), var(--panel2))', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 8px' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)' }} title={ABILITY_LABELS[k]}>{ABILITY_SHORT[k]}</div>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 26, color: 'var(--ink)', margin: '4px 0 1px' }}>{modStr(abilityModifier(total))}</div>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--acc)' }}>{total}{racial ? ` (${base}+${racial})` : ''}</div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    <button onClick={() => setAbility(k, base - 1)} style={stepBtn(false)}>−</button>
                    <button onClick={() => setAbility(k, base + 1)} style={stepBtn(true)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* perícias */}
        <div style={{ marginTop: 16 }}>
          <div className="fv-label" style={{ marginBottom: 10 }}>Perícias proficientes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SKILLS.map((sk) => {
              const on = char.skillProfs.includes(sk.key);
              return (
                <button
                  key={sk.key}
                  onClick={() => toggleSkill(sk.key)}
                  style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 999, border: '1px solid ' + (on ? t.gold : t.line), color: on ? t.gold : t.muted, background: on ? hexA(t.gold, 0.1) : 'transparent' }}
                >
                  {sk.label}
                </button>
              );
            })}
          </div>
        </div>

    </Modal>
  );
}

function stepBtn(accent: boolean): React.CSSProperties {
  return { cursor: 'pointer', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--line)', background: 'rgba(0,0,0,.3)', color: accent ? 'var(--acc)' : 'var(--muted)', fontWeight: 700, fontSize: 16 };
}
