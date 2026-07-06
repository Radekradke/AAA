import { useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
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
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { abilityLore, savingThrowLore, skillLore, calcLore, passiveLore } from '@/lib/lore';
import { SkillsModal } from './SkillsModal';

/**
 * Aba Ficha — identidade de HUD: os 6 atributos na mesma linha (desktop)
 * com o modificador dentro de um d20 na cor do atributo; perícias
 * treinadas à vista + modal com as 18; proficiências, ferramentas,
 * idiomas e sentidos numa área própria.
 */
export function TabFicha({ char, derived }: TabProps) {
  const t = useTheme();
  const tilt = useTilt();
  const { check } = useDiceRoller();
  const store = useCharacterStore();
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [toolPick, setToolPick] = useState('');
  const [langDraft, setLangDraft] = useState('');

  const trained = derived.skills.filter((s) => s.proficient);
  const canExpertiseTools = expertiseSlots(char) > 0;

  return (
    <div className="animate-riseIn" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(13px,1.5vw,18px)' }}>
      {/* ===== faixa de atributos: 6 placas, número em d20 ===== */}
      <Panel style={{ padding: 'clamp(14px,1.6vw,18px)' }}>
        <div className="fv-label" style={{ marginBottom: 12 }}>Atributos &amp; Resistências</div>
        <div className="fv-ability-row">
          {derived.abilityList.map((a) => {
            const color = ABILITY_COLORS[a.key];
            return (
              <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block', minWidth: 0 }}>
                <div
                  onClick={() => check(`Teste de ${ABILITY_LABELS[a.key]}`, a.mod)}
                  onMouseMove={tilt.onMouseMove}
                  onMouseLeave={tilt.onMouseLeave}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    background: `linear-gradient(180deg, ${hexA(color, 0.1)}, rgba(0,0,0,.26))`,
                    border: '1px solid ' + hexA(color, 0.28),
                    borderTop: `2px solid ${a.saveProf ? t.gold : hexA(color, 0.65)}`,
                    clipPath: 'polygon(9px 0, calc(100% - 9px) 0, 100% 9px, 100% calc(100% - 9px), calc(100% - 9px) 100%, 9px 100%, 0 calc(100% - 9px), 0 9px)',
                    padding: '11px 6px 9px',
                    textAlign: 'center',
                    transition: '.2s',
                  }}
                >
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '.14em', color: hexA(color, 0.95) }}>
                    {ABILITY_SHORT[a.key]}
                  </div>
                  {/* modificador dentro de um d20 na cor do atributo */}
                  <div style={{ position: 'relative', width: 64, height: 62, margin: '4px auto 0' }}>
                    <svg viewBox="0 0 64 62" width="64" height="62" aria-hidden style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 10px ${hexA(color, 0.35)})` }}>
                      <polygon points="32,2 58,17 58,45 32,60 6,45 6,17" fill={hexA(color, 0.12)} stroke={color} strokeWidth="1.4" />
                      <polygon points="32,10 50,41 14,41" fill="none" stroke={hexA(color, 0.5)} strokeWidth="1" />
                      <path d="M32 2 L32 10 M58 17 L50 41 M6 17 L14 41 M32 60 L50 41 M32 60 L14 41 M58 45 L50 41 M6 45 L14 41" stroke={hexA(color, 0.4)} strokeWidth="1" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 24, color: 'var(--ink)', textShadow: `0 0 14px ${hexA(color, 0.7)}` }}>
                      {modStr(a.mod)}
                    </div>
                  </div>
                  <div style={{ marginTop: 3, fontFamily: "'Chakra Petch', monospace", fontSize: 11.5, color: 'var(--muted)' }}>
                    valor <b style={{ color: 'var(--ink)' }}>{a.total}</b>
                  </div>
                  <LoreTooltip info={savingThrowLore(a.key, a.save, a.saveProf)} anchorStyle={{ display: 'block' }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); check(`Resist. de ${ABILITY_LABELS[a.key]}`, a.save); }}
                      style={{
                        marginTop: 7,
                        fontSize: 10,
                        fontFamily: "'Chakra Petch', monospace",
                        letterSpacing: '.05em',
                        padding: '4px 0',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: a.saveProf ? '#140d04' : 'var(--muted)',
                        background: a.saveProf ? t.gold : 'rgba(255,255,255,.05)',
                        border: '1px solid ' + (a.saveProf ? t.gold : t.line),
                      }}
                    >
                      RESIST {modStr(a.save)}
                    </div>
                  </LoreTooltip>
                </div>
              </LoreTooltip>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Clique na placa para rolar 1d20 · barra dourada = resistência proficiente
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}>
        {/* ===== perícias: treinadas à vista + modal com as 18 ===== */}
        <Panel style={{ padding: 'clamp(14px,1.6vw,18px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="fv-label">Perícias</div>
            <LoreTooltip info={calcLore('Percepção Passiva', derived.breakdowns.passivePerception)}>
              <span style={{ cursor: 'help', fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                Percepção Passiva <b style={{ color: t.gold }}>{derived.passivePerception}</b>
              </span>
            </LoreTooltip>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {trained.map((sk) => (
              <LoreTooltip key={sk.key} info={skillLore(sk.key, sk.bonus, true, sk.expertise)}>
                <button
                  onClick={() => check(sk.label, sk.bonus)}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12.5,
                    fontWeight: 600,
                    minHeight: 34,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid ' + (sk.expertise ? t.gold : hexA(t.gold, 0.4)),
                    background: sk.expertise ? hexA(t.gold, 0.14) : hexA(t.gold, 0.06),
                    color: 'var(--ink)',
                    transition: '.2s',
                  }}
                >
                  <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 9.5, color: ABILITY_COLORS[sk.ability] }}>{ABILITY_SHORT[sk.ability]}</span>
                  {sk.label}
                  <b style={{ color: t.gold, fontFamily: "'Chakra Petch', monospace" }}>{modStr(sk.bonus)}</b>
                  {sk.expertise && <span style={{ fontSize: 9, color: t.gold }}>★×2</span>}
                </button>
              </LoreTooltip>
            ))}
            {trained.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma perícia treinada ainda.</span>}
          </div>
          <button
            onClick={() => setSkillsOpen(true)}
            className="fv-btn-gold"
            style={{ marginTop: 13, width: '100%', minHeight: 42, fontSize: 13.5 }}
          >
            Ver todas as 18 perícias
          </button>
        </Panel>

        {/* ===== proficiências, ferramentas, idiomas e sentidos ===== */}
        <Panel style={{ padding: 'clamp(14px,1.6vw,18px)' }}>
          <div className="fv-label" style={{ marginBottom: 11 }}>Proficiências &amp; Ferramentas</div>
          {/* Concedido pela subclasse: proficiências e crítico ampliado */}
          {(derived.grantedProficiencies.length > 0 || derived.critMin < 20) && (
            <div style={{ marginBottom: 11, padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.acc, 0.35), background: hexA(t.acc, 0.06) }}>
              {derived.subclassLabel && (
                <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--acc)', marginBottom: 6 }}>{derived.subclassLabel}</div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {derived.grantedProficiencies.map((pf) => (
                  <span key={pf} className="fv-chip" style={{ fontSize: 11, color: 'var(--ink)' }}>{pf}</span>
                ))}
                {derived.critMin < 20 && (
                  <span className="fv-chip fv-chip-gold" style={{ fontSize: 11 }}>Crítico {derived.critMin}–20</span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(char.toolProfs ?? []).map((tool) => {
              const chk = calculateToolCheck(char, tool);
              return (
                <div key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (tool.expertise ? t.gold : t.line), background: tool.expertise ? hexA(t.gold, 0.07) : 'rgba(0,0,0,.22)' }}>
                  <LoreTooltip info={passiveLore(tool.label, `${ABILITY_SHORT[chk.ability]} ${modStr(chk.total)}${tool.expertise ? ' · Expertise' : ''}`, `1d20 + ${ABILITY_SHORT[chk.ability]} (${modStr(chk.abilityMod)}) + proficiência (${modStr(chk.proficiency)})${tool.expertise ? ` + expertise (${modStr(chk.expertiseBonus)})` : ''}. Ferramenta não soma perícia — é independente de Prestidigitação.${tool.source ? ` Origem: ${tool.source}.` : ''}`, ['Ferramenta', 'Ver cálculo'])}>
                    <span style={{ cursor: 'help', flex: 1, minWidth: 120, fontSize: 13, color: 'var(--ink)' }}>
                      {tool.label}
                      {tool.source && <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--muted)' }}>({tool.source})</span>}
                    </span>
                  </LoreTooltip>
                  {/* o mestre pode pedir outro atributo: troque na hora */}
                  <select
                    className="fv-input"
                    value={tool.ability ?? chk.ability}
                    onChange={(e) => store.setToolAbility(char.id, tool.id, e.target.value as AbilityKey)}
                    aria-label={`Atributo de ${tool.label}`}
                    style={{ width: 74, minHeight: 34, padding: '4px 26px 4px 8px', fontSize: 12, fontFamily: "'Chakra Petch', monospace" }}
                  >
                    {ABILITY_KEYS.map((k) => <option key={k} value={k} style={{ color: '#111' }}>{ABILITY_SHORT[k]}</option>)}
                  </select>
                  {canExpertiseTools && tool.id === 'thieves-tools' && (
                    <button
                      onClick={() => store.toggleToolExpertise(char.id, tool.id)}
                      style={{ cursor: 'pointer', fontSize: 10, fontWeight: 700, minHeight: 34, padding: '4px 9px', borderRadius: 999, border: '1px solid ' + (tool.expertise ? t.gold : t.line), background: tool.expertise ? hexA(t.gold, 0.16) : 'transparent', color: tool.expertise ? t.gold : 'var(--muted)' }}
                    >
                      {tool.expertise ? '★ Expertise' : 'Expertise'}
                    </button>
                  )}
                  <button
                    onClick={() => check(`${tool.label} (${ABILITY_SHORT[chk.ability]})`, chk.total)}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + hexA(t.gold, 0.5), background: hexA(t.gold, 0.08), color: t.gold, fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 13 }}
                  >
                    <Icon name="d20" size={13} /> {modStr(chk.total)}
                  </button>
                  <button onClick={() => store.removeToolProf(char.id, tool.id)} aria-label={`Remover ${tool.label}`} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14 }}>✕</button>
                </div>
              );
            })}
            {(char.toolProfs ?? []).length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sem proficiências com ferramentas ainda.</div>
            )}
            <div style={{ display: 'flex', gap: 7 }}>
              <select
                className="fv-input"
                value={toolPick}
                onChange={(e) => setToolPick(e.target.value)}
                style={{ flex: 1, minHeight: 40, padding: '8px 34px 8px 12px', fontSize: 13 }}
              >
                <option value="" style={{ color: '#111' }}>Adicionar ferramenta…</option>
                {(['kit', 'artesao', 'instrumento', 'jogo', 'veiculo'] as const).map((g) => (
                  <optgroup key={g} label={TOOL_GROUP_LABELS[g]}>
                    {TOOLS.filter((tl) => tl.group === g && !(char.toolProfs ?? []).some((p) => p.id === tl.id)).map((tl) => (
                      <option key={tl.id} value={tl.id} style={{ color: '#111' }}>{tl.label}</option>
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
                className="fv-btn-gold"
                style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }}
              >
                +
              </button>
            </div>
          </div>

          <div className="fv-label" style={{ margin: '15px 0 9px' }}>Idiomas</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {derived.languages.map((lang) => {
              const extra = (char.extraLanguages ?? []).includes(lang);
              return (
                <span key={lang} className="fv-chip" style={{ gap: 6, color: 'var(--ink)' }}>
                  {lang}
                  {extra && (
                    <button onClick={() => store.removeLanguage(char.id, lang)} aria-label={`Remover ${lang}`} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, padding: 0 }}>✕</button>
                  )}
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
            <input
              className="fv-input"
              placeholder="Novo idioma (Élfico, Anão…)"
              value={langDraft}
              onChange={(e) => setLangDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { store.addLanguage(char.id, langDraft); setLangDraft(''); } }}
              style={{ flex: 1, minHeight: 40, padding: '8px 12px', fontSize: 13 }}
            />
            <button
              onClick={() => { store.addLanguage(char.id, langDraft); setLangDraft(''); }}
              className="fv-btn-gold"
              style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }}
            >
              +
            </button>
          </div>

          {(derived.darkvision || derived.resistances.length > 0) && (
            <>
              <div className="fv-label" style={{ margin: '15px 0 9px' }}>Sentidos &amp; Resistências</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {derived.darkvision && (
                  <LoreTooltip info={passiveLore('Visão no Escuro', `${derived.darkvision.range} m`, `Enxerga na penumbra como se fosse luz e no escuro como penumbra (tons de cinza). Origem: ${derived.darkvision.source}.`, ['Sentido'])}>
                    <span className="fv-chip fv-chip-gold" style={{ cursor: 'help' }}>Visão no Escuro {derived.darkvision.range} m</span>
                  </LoreTooltip>
                )}
                {derived.resistances.map((r) => (
                  <LoreTooltip key={r.value} info={passiveLore(`Resistência: ${r.value}`, r.source, 'Dano desse tipo é reduzido à metade.', ['Resistência'])}>
                    <span className="fv-chip" style={{ cursor: 'help', color: 'var(--ink)' }}>{r.value}</span>
                  </LoreTooltip>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {skillsOpen && <SkillsModal char={char} derived={derived} onClose={() => setSkillsOpen(false)} />}
    </div>
  );
}
