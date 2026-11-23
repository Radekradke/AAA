import { raceOf } from '@/data/races';
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
import '@/styles/hero-edit.css';
import { Modal } from '@/components/ui/Modal';
import { PortraitPicker } from '@/components/character/PortraitPicker';
import { heroAvatar, heroFace } from '@/lib/summary';

interface Props {
  char: Character;
  onClose: () => void;
}

/** Edição da ficha após criada: arte, identidade, nível, atributos e perícias. */
export function CharacterEditModal({ char, onClose }: Props) {
  const { editCharacter, setLevel, updateCharacter } = useCharacterStore();
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

  return (
    <Modal
      title="Editar herói"
      icon="edit"
      onClose={onClose}
      maxWidth={640}
      footer={
        <button type="button" onClick={onClose} className="fv-btn-gold fv-hedit-done">
          Concluir
        </button>
      }
    >
        {/* arte do personagem (antes ficava no retrato do cabeçalho) */}
        <div className="fv-edit-art">
          <div className="fv-edit-art-face" style={{ backgroundImage: `url("${heroAvatar(char)}")`, ...heroFace(char) }} aria-hidden />
          <div className="fv-edit-art-body">
            <span className="fv-hedit-label">Arte do personagem</span>
            <p>{char.portrait ? 'Usando a sua arte. Troque ou volte à arte padrão da classe.' : 'Usando a arte padrão da classe. Envie a sua (PNG, JPG ou WebP) — fundo branco liso é recortado.'}</p>
            <PortraitPicker portrait={char.portrait} onChange={(url) => updateCharacter(char.id, (c) => { c.portrait = url; })} />
          </div>
        </div>

        {/* identidade */}
        <div className="fv-hedit-id">
          <label>
            <span className="fv-hedit-label">Nome</span>
            <input className="fv-input" value={char.name} onChange={(e) => editCharacter(char.id, { name: e.target.value })} />
          </label>
          <label>
            <span className="fv-hedit-label">Antecedente</span>
            <select className="fv-input" value={char.backgroundId} onChange={(e) => editCharacter(char.id, { backgroundId: e.target.value })}>
              {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <label>
            <span className="fv-hedit-label">Alinhamento</span>
            <input className="fv-input" value={char.alignment} onChange={(e) => editCharacter(char.id, { alignment: e.target.value })} />
          </label>
        </div>

        {/* nível */}
        <div className="fv-hedit-level">
          <div>
            <div className="fv-hedit-level-name">Nível {char.level}</div>
            <div className="fv-hedit-level-sub">Proficiência {modStr(derived.proficiency)} · PV máx. {derived.maxHp}</div>
          </div>
          <div className="fv-hedit-level-ctl">
            <button type="button" className="fv-hedit-step" onClick={() => setLevel(char.id, char.level - 1)} aria-label="Baixar um nível">−</button>
            <span className="fv-hedit-level-n">{char.level}</span>
            <button type="button" className="fv-hedit-step is-up" onClick={() => setLevel(char.id, char.level + 1)} aria-label="Subir um nível">+</button>
          </div>
        </div>

        {/* subclasse */}
        {subs.length > 0 && (
          <div className="fv-hedit-section">
            <label className="fv-hedit-block">
              <span className="fv-hedit-label">Subclasse {canPickSub ? '' : `(escolhida no nível ${subLevel})`}</span>
              <select
                className="fv-input fv-hedit-sub"
                value={char.subclassId ?? ''}
                disabled={!canPickSub}
                onChange={(e) => editCharacter(char.id, { subclassId: e.target.value || null })}
              >
                <option value="">— nenhuma —</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            {derived.grantedProficiencies.length > 0 && (
              <div className="fv-hedit-note is-first">
                Concede: <b className="is-acc">{derived.grantedProficiencies.join(' · ')}</b>
              </div>
            )}
            {derived.critMin < 20 && (
              <div className="fv-hedit-note">
                Crítico ampliado: acerto crítico em <b>{derived.critMin}–20</b>.
              </div>
            )}
          </div>
        )}

        {/* atributos */}
        <div className="fv-hedit-section">
          <div className="fv-label fv-hedit-section-label">Atributos (valor base)</div>
          <div className="fv-hedit-abs">
            {ABILITY_KEYS.map((k) => {
              const base = char.baseAbilities[k];
              const racial = racialBonusFor(k, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi, raceOf(char));
              const total = base + racial;
              return (
                <div key={k} className="fv-hedit-ab">
                  <div className="fv-hedit-ab-key" title={ABILITY_LABELS[k]}>{ABILITY_SHORT[k]}</div>
                  <div className="fv-hedit-ab-mod">{modStr(abilityModifier(total))}</div>
                  <div className="fv-hedit-ab-total">{total}{racial ? ` (${base}+${racial})` : ''}</div>
                  <div className="fv-hedit-ab-ctl">
                    <button type="button" className="fv-hedit-step" onClick={() => setAbility(k, base - 1)} aria-label={`Diminuir ${ABILITY_LABELS[k]}`}>−</button>
                    <button type="button" className="fv-hedit-step is-up" onClick={() => setAbility(k, base + 1)} aria-label={`Aumentar ${ABILITY_LABELS[k]}`}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* perícias */}
        <div className="fv-hedit-section">
          <div className="fv-label fv-hedit-section-label">Perícias proficientes</div>
          <div className="fv-hedit-skills">
            {SKILLS.map((sk) => {
              const on = char.skillProfs.includes(sk.key);
              return (
                <button
                  key={sk.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSkill(sk.key)}
                  className="fv-hedit-skill"
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
