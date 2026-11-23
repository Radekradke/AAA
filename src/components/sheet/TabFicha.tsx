import { LANGUAGE_OPTIONS } from '@/data/classChoices';
import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTilt } from '@/lib/useTilt';
import { hexA } from '@/lib/color';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { ABILITY_LABELS, ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { TOOLS, TOOL_GROUP_LABELS, toolLabel } from '@/data/tools';
import { modStr } from '@/engine/dice';
import { expertiseSlots } from '@/engine/levelUp';
import { calculateToolCheck } from '@/engine/toolCheck';
import { Icon } from '@/components/ui/Icon';
import { raceTraitInfo } from '@/data/raceTraits';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { abilityLore, savingThrowLore, skillLore, calcLore, passiveLore } from '@/lib/lore';
import { ClassFeaturesPanel } from './ClassFeaturesPanel';
import { getSubrace, raceOf } from '@/data/races';
import { SkillsModal } from './SkillsModal';
import { useInk } from '@/lib/contrast';
import { pressable } from '@/lib/pressable';
import '@/styles/ficha.css';

/**
 * Aba Ficha — identidade de HUD: os 6 atributos na mesma linha (desktop)
 * com o modificador dentro de um d20 na cor do atributo; perícias
 * treinadas à vista + modal com as 18; proficiências, ferramentas,
 * idiomas e sentidos numa área própria.
 */
export function TabFicha({ char, derived }: TabProps) {
  const ink = useInk();
  const tilt = useTilt();
  const { checkFor } = useDiceRoller();
  const store = useCharacterStore();
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [toolPick, setToolPick] = useState('');
  const [langDraft, setLangDraft] = useState('');

  const trained = derived.skills.filter((s) => s.proficient);
  const canExpertiseTools = expertiseSlots(char) > 0;

  return (
    <div className="animate-riseIn fv-ficha">
      {/* ===== faixa de atributos: 6 placas, número em d20 ===== */}
      <Panel>
        <div className="fv-label fv-ficha-mb12">Atributos &amp; Resistências</div>
        <div className="fv-ability-row">
          {derived.abilityList.map((a) => {
            const color = ABILITY_COLORS[a.key];
            return (
              <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block', minWidth: 0 }}>
                <div
                  {...pressable(() => checkFor(char, 'check', a.key, `Teste de ${ABILITY_LABELS[a.key]}`, a.mod))}
                  onMouseMove={tilt.onMouseMove}
                  onMouseLeave={tilt.onMouseLeave}
                  className={'fv-ficha-ab' + (a.saveProf ? ' is-prof' : '')}
                  style={{ '--ab': color } as React.CSSProperties}
                >
                  <div className="fv-ficha-ab-key" style={{ color: ink(color) }}>
                    {ABILITY_SHORT[a.key]}
                  </div>
                  {/* modificador dentro de um d20 na cor do atributo */}
                  <div className="fv-ficha-d20">
                    <svg viewBox="0 0 64 62" width="64" height="62" aria-hidden>
                      <polygon points="32,2 58,17 58,45 32,60 6,45 6,17" fill={hexA(color, 0.12)} stroke={color} strokeWidth="1.4" />
                      <polygon points="32,10 50,41 14,41" fill="none" stroke={hexA(color, 0.5)} strokeWidth="1" />
                      <path d="M32 2 L32 10 M58 17 L50 41 M6 17 L14 41 M32 60 L50 41 M32 60 L14 41 M58 45 L50 41 M6 45 L14 41" stroke={hexA(color, 0.4)} strokeWidth="1" />
                    </svg>
                    <div className="fv-ficha-d20-mod">
                      {modStr(a.mod)}
                    </div>
                  </div>
                  <div className="fv-ficha-ab-value">
                    valor <b>{a.total}</b>
                  </div>
                  <LoreTooltip info={savingThrowLore(a.key, a.save, a.saveProf)} anchorStyle={{ display: 'block' }}>
                    <div
                      {...pressable((e) => { e.stopPropagation(); checkFor(char, 'save', a.key, `Resist. de ${ABILITY_LABELS[a.key]}`, a.save); }, `Salvaguarda de ${ABILITY_LABELS[a.key]}`)}
                      className="fv-ficha-save"
                    >
                      RESIST {modStr(a.save)}
                    </div>
                  </LoreTooltip>
                </div>
              </LoreTooltip>
            );
          })}
        </div>
        <div className="fv-ficha-hint">
          Clique na placa para rolar 1d20 · barra dourada = resistência proficiente
        </div>
      </Panel>

      {/* PC: perícias e características à esquerda, proficiências à direita (sem buraco sob as perícias) */}
      <div className="fv-ficha-grid">
        {/* ===== perícias: treinadas à vista + modal com as 18 ===== */}
        <Panel className="fv-ficha-skills">
          <div className="fv-ficha-skills-head">
            <div className="fv-label">Perícias</div>
            <LoreTooltip info={calcLore('Percepção Passiva', derived.breakdowns.passivePerception)}>
              <span className="fv-ficha-passive">
                Percepção Passiva <b>{derived.passivePerception}</b>
              </span>
            </LoreTooltip>
          </div>
          <div className="fv-ficha-wrap7">
            {trained.map((sk) => (
              <LoreTooltip key={sk.key} info={skillLore(sk.key, sk.bonus, true, sk.expertise)}>
                <button
                  onClick={() => checkFor(char, 'check', sk.ability, sk.label, sk.bonus, { skill: sk.key, proficient: sk.proficient, speed: derived.speed })}
                  className={'fv-ficha-skill' + (sk.expertise ? ' is-expert' : '')}
                >
                  <span className="fv-ficha-skill-ab" style={{ color: ink(ABILITY_COLORS[sk.ability]) }}>{ABILITY_SHORT[sk.ability]}</span>
                  {sk.label}
                  <b className="fv-ficha-skill-bonus">{modStr(sk.bonus)}</b>
                  {sk.expertise && <span className="fv-ficha-skill-x2">★×2</span>}
                  {sk.disadvantage && <span className="fv-disadv" title={`Desvantagem: ${sk.disadvantage}`}>desv.</span>}
                </button>
              </LoreTooltip>
            ))}
            {trained.length === 0 && <span className="fv-ficha-empty">Nenhuma perícia treinada ainda.</span>}
          </div>
          <button
            onClick={() => setSkillsOpen(true)}
            className="fv-btn-ghost fv-ficha-allskills"
          >
            Ver todas as 18 perícias ›
          </button>
        </Panel>

        {/* ===== proficiências, ferramentas, idiomas e sentidos ===== */}
        <Panel className="fv-ficha-profs">
          <div className="fv-label fv-ficha-mb11">Proficiências &amp; Ferramentas</div>
          {/* armaduras e armas que o herói sabe usar (classe, raça, subclasse, talentos) */}
          <dl className="fv-profs">
            <div><dt>Armaduras</dt><dd>{derived.weaponArmorProfs.armor}</dd></div>
            <div><dt>Armas</dt><dd>{derived.weaponArmorProfs.weapons}</dd></div>
          </dl>
          {/* Concedido pela subclasse: proficiências e crítico ampliado */}
          {(derived.grantedProficiencies.length > 0 || derived.critMin < 20) && (
            <div className="fv-ficha-granted">
              {derived.subclassLabel && (
                <div className="fv-ficha-granted-from">{derived.subclassLabel}</div>
              )}
              <div className="fv-ficha-wrap6">
                {derived.grantedProficiencies.map((pf) => (
                  <span key={pf} className="fv-chip fv-ficha-chip is-small">{pf}</span>
                ))}
                {derived.critMin < 20 && (
                  <span className="fv-chip fv-chip-gold fv-ficha-chip-sm">Crítico {derived.critMin}–20</span>
                )}
              </div>
            </div>
          )}
          <div className="fv-ficha-tools">
            {(char.toolProfs ?? []).map((tool) => {
              const chk = calculateToolCheck(char, tool);
              return (
                <div key={tool.id} className={'fv-ficha-tool' + (tool.expertise ? ' is-expert' : '')}>
                  <LoreTooltip info={passiveLore(tool.label, `${ABILITY_SHORT[chk.ability]} ${modStr(chk.total)}${tool.expertise ? ' · Expertise' : ''}`, `1d20 + ${ABILITY_SHORT[chk.ability]} (${modStr(chk.abilityMod)}) + proficiência (${modStr(chk.proficiency)})${tool.expertise ? ` + expertise (${modStr(chk.expertiseBonus)})` : ''}. Ferramenta não soma perícia — é independente de Prestidigitação.${tool.source ? ` Origem: ${tool.source}.` : ''}`, ['Ferramenta', 'Ver cálculo'])}>
                    <span className="fv-ficha-tool-name">
                      {tool.label}
                      {tool.source && <span className="fv-ficha-tool-src">({tool.source})</span>}
                    </span>
                  </LoreTooltip>
                  {/* o mestre pode pedir outro atributo: troque na hora */}
                  <select
                    className="fv-input fv-ficha-tool-ab"
                    value={tool.ability ?? chk.ability}
                    onChange={(e) => store.setToolAbility(char.id, tool.id, e.target.value as AbilityKey)}
                    aria-label={`Atributo de ${tool.label}`}
                  >
                    {ABILITY_KEYS.map((k) => <option key={k} value={k}>{ABILITY_SHORT[k]}</option>)}
                  </select>
                  {canExpertiseTools && tool.id === 'thieves-tools' && (
                    <button
                      onClick={() => store.toggleToolExpertise(char.id, tool.id)}
                      className={'fv-ficha-tool-x' + (tool.expertise ? ' is-on' : '')}
                    >
                      {tool.expertise ? '★ Expertise' : 'Expertise'}
                    </button>
                  )}
                  <button
                    onClick={() => checkFor(char, 'check', chk.ability, `${tool.label} (${ABILITY_SHORT[chk.ability]})`, chk.total, { proficient: true })}
                    className="fv-ficha-tool-roll"
                  >
                    <Icon name="d20" size={13} /> {modStr(chk.total)}
                  </button>
                  <button className="fv-chip-remove fv-ficha-remove" onClick={() => store.removeToolProf(char.id, tool.id)} aria-label={`Remover ${tool.label}`}>✕</button>
                </div>
              );
            })}
            {(char.toolProfs ?? []).length === 0 && (
              <div className="fv-ficha-empty is-sm">Sem proficiências com ferramentas ainda.</div>
            )}
            <div className="fv-ficha-add">
              <select
                className="fv-input fv-ficha-add-select"
                value={toolPick}
                onChange={(e) => setToolPick(e.target.value)}
                aria-label="Adicionar proficiência com ferramenta"
              >
                <option value="">Adicionar ferramenta…</option>
                {(['kit', 'artesao', 'instrumento', 'jogo', 'veiculo'] as const).map((g) => (
                  <optgroup key={g} label={TOOL_GROUP_LABELS[g]}>
                    {TOOLS.filter((tl) => tl.group === g && !(char.toolProfs ?? []).some((p) => p.id === tl.id)).map((tl) => (
                      <option key={tl.id} value={tl.id}>{tl.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!toolPick) return;
                  store.addToolProf(char.id, { id: toolPick, label: toolLabel(toolPick), source: 'manual' });
                  setToolPick('');
                }}
                className="fv-btn-gold fv-ficha-add-btn"
                disabled={!toolPick}
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="fv-label fv-ficha-section">Idiomas</div>
          <div className="fv-ficha-wrap6">
            {derived.languages.map((lang) => {
              const extra = (char.extraLanguages ?? []).includes(lang);
              return (
                <span key={lang} className="fv-chip fv-ficha-chip">
                  {lang}
                  {extra && (
                    <button className="fv-chip-remove fv-ficha-remove is-sm" onClick={() => store.removeLanguage(char.id, lang)} aria-label={`Remover ${lang}`}>✕</button>
                  )}
                </span>
              );
            })}
          </div>
          <div className="fv-ficha-add fv-ficha-mt9">
            <input
              className="fv-input fv-ficha-add-input"
              placeholder="Novo idioma (Élfico, Anão…)"
              list="fv-lang-options"
              value={langDraft}
              onChange={(e) => setLangDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { store.addLanguage(char.id, langDraft); setLangDraft(''); } }}
            />
            <button
              onClick={() => { store.addLanguage(char.id, langDraft); setLangDraft(''); }}
              className="fv-btn-gold fv-ficha-add-btn"
              disabled={!langDraft.trim()}
            >
              Adicionar
            </button>
          </div>

          <datalist id="fv-lang-options">
            {LANGUAGE_OPTIONS.map((o) => <option key={o.id} value={o.label} />)}
          </datalist>

          <div className="fv-label fv-ficha-section">Sentidos Passivos</div>
          <div className="fv-ficha-wrap6">
            {([
              { label: 'Percepção', value: derived.passivePerception, desc: 'O DM usa contra Furtividade e para notar perigos sem você rolar.' },
              { label: 'Investigação', value: derived.passiveInvestigation, desc: 'Percepção lógica passiva — notar pistas e detalhes sem rolar.' },
              { label: 'Intuição', value: derived.passiveInsight, desc: 'Leitura passiva de intenções e mentiras.' },
            ] as const).map((pas) => (
              <LoreTooltip key={pas.label} info={passiveLore(`${pas.label} Passiva`, String(pas.value), `10 + bônus de ${pas.label}. ${pas.desc}`, ['Passivo'])}>
                <span className="fv-chip fv-ficha-chip is-help">
                  {pas.label} <b className="fv-ficha-gold-num">{pas.value}</b>
                </span>
              </LoreTooltip>
            ))}
          </div>

          {(derived.darkvision || derived.blindsense || derived.resistances.length > 0) && (
            <>
              <div className="fv-label fv-ficha-section">Sentidos &amp; Resistências</div>
              <div className="fv-ficha-wrap6">
                {derived.darkvision && (
                  <LoreTooltip info={passiveLore('Visão no Escuro', `${derived.darkvision.range} m`, `Enxerga na penumbra como se fosse luz e no escuro como penumbra (tons de cinza). Origem: ${derived.darkvision.source}.`, ['Sentido'])}>
                    <span className="fv-chip fv-chip-gold fv-ficha-help">Visão no Escuro {derived.darkvision.range} m</span>
                  </LoreTooltip>
                )}
                {derived.blindsense && (
                  <LoreTooltip info={passiveLore('Sentido Cego', `${derived.blindsense} m`, 'Se puder ouvir, você sabe onde está qualquer criatura escondida ou invisível a até 3 m (Ladino 14º).', ['Sentido'])}>
                    <span className="fv-chip fv-chip-gold fv-ficha-help">Sentido Cego {derived.blindsense} m</span>
                  </LoreTooltip>
                )}
                {derived.resistances.map((r) => (
                  <LoreTooltip key={r.value} info={passiveLore(`Resistência: ${r.value}`, r.source, 'Dano desse tipo é reduzido à metade.', ['Resistência'])}>
                    <span className="fv-chip fv-ficha-chip is-help">{r.value}</span>
                  </LoreTooltip>
                ))}
              </div>
            </>
          )}
          <RaceTraits char={char} />
        </Panel>

        {/* características de classe nível a nível + escolhas (Metamagia, Estilo de Luta…) */}
        <div className="fv-ficha-feats">
          <ClassFeaturesPanel char={char} />
        </div>
      </div>

      {skillsOpen && <SkillsModal char={char} derived={derived} onClose={() => setSkillsOpen(false)} />}
    </div>
  );
}

/** Traços da linhagem (homebrew com descrição; selo para o mestre conferir). */
function RaceTraits({ char }: { char: TabProps['char'] }) {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const details = [...(race.traitDetails ?? []), ...(sub?.traitDetails ?? [])];
  const names = [...race.traits, ...(sub?.traits ?? [])];
  if (!names.length && !details.length) return null;
  return (
    <>
      <div className="fv-label fv-ficha-section">
        Traços de {race.label}
        {race.homebrew && <span className="fv-hb-badge is-small" title={race.author ? `Raça homebrew criada por ${race.author}` : 'Raça homebrew'}>homebrew</span>}
      </div>
      <div className="fv-ficha-wrap6">
        {names.map((n) => {
          const d = details.find((t) => t.name === n)?.desc || raceTraitInfo(n);
          return d ? (
            <LoreTooltip key={n} info={passiveLore(n, race.label, d, [race.homebrew ? 'Homebrew' : 'Traço racial'])}>
              <span className="fv-chip fv-ficha-chip is-help">{n}</span>
            </LoreTooltip>
          ) : (
            <span key={n} className="fv-chip fv-ficha-chip">{n}</span>
          );
        })}
      </div>
    </>
  );
}
