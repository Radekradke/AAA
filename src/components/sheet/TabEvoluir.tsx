import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { passiveLore } from '@/lib/lore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { CLASSES, getClass } from '@/data/classes';
import { getSubclass, subclassesFor } from '@/data/subclasses';
import { isAsiLevel } from '@/data/classFeatures';
import { FEATS, getFeat } from '@/data/feats';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import type { AsiChoice, LevelUpRecord } from '@/types/character';
import {
  averageHp,
  classLevelOf,
  effectiveAbilities,
  featPrereqIssue,
  featuresGained,
  MAX_LEVEL,
  subclassLevelFor,
  validateLevelUp,
} from '@/engine/levelUp';
import { proficiencyBonus } from '@/engine/modifiers';
import { modStr } from '@/engine/dice';

type AsiMode = 'none' | 'plus2' | 'plus11' | 'feat';

/**
 * Aba Evoluir — subir de nível guiado (PHB 2014): classe, PV (média/rolagem/
 * manual + CON), subclasse e ASI/talento nos níveis corretos, com validação
 * e linha do tempo completa da evolução.
 */
export function TabEvoluir({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();

  const campaign = char.campaign;
  const [classId, setClassId] = useState(char.classId);
  const cls = getClass(classId);
  const newClassLevel = classLevelOf(char, classId) + 1;
  const newLevel = char.level + 1;
  const atCap = char.level >= MAX_LEVEL;

  const [hpMethod, setHpMethod] = useState<'media' | 'rolagem' | 'manual'>(campaign.hpMode);
  const [hpRoll, setHpRoll] = useState<number | null>(null);
  const [hpManual, setHpManual] = useState('');
  const hpValue =
    hpMethod === 'media' ? averageHp(cls.hitDie) : hpMethod === 'rolagem' ? hpRoll ?? 0 : parseInt(hpManual) || 0;

  const asiHere = isAsiLevel(classId, newClassLevel);
  const [asiMode, setAsiMode] = useState<AsiMode>('none');
  const [asiPicks, setAsiPicks] = useState<AbilityKey[]>([]);
  const [featId, setFeatId] = useState<string>('');
  const [featAbility, setFeatAbility] = useState<AbilityKey | ''>('');

  const subLevel = subclassLevelFor(classId);
  const needsSubclass = newClassLevel >= subLevel && !char.subclassId;
  const [subPick, setSubPick] = useState('');

  const conMod = derived.abilities.con.mod;
  const totals = effectiveAbilities(char);

  const plan = useMemo(() => {
    let asi: AsiChoice | undefined;
    if (asiHere && asiMode === 'plus2' && asiPicks.length === 1) {
      asi = { kind: 'asi', increases: { [asiPicks[0]]: 2 } };
    } else if (asiHere && asiMode === 'plus11' && asiPicks.length === 2) {
      asi = { kind: 'asi', increases: { [asiPicks[0]]: 1, [asiPicks[1]]: 1 } };
    } else if (asiHere && asiMode === 'feat' && featId) {
      asi = { kind: 'feat', featId, ability: featAbility || undefined };
    }
    return {
      classId,
      hpMethod,
      hpValue,
      asi,
      subclassId: needsSubclass && newClassLevel === subLevel && subPick ? subPick : undefined,
    };
  }, [classId, hpMethod, hpValue, asiHere, asiMode, asiPicks, featId, featAbility, needsSubclass, newClassLevel, subLevel, subPick]);

  const errors = atCap ? [`Nível máximo (${MAX_LEVEL}) alcançado.`] : validateLevelUp(char, plan);
  const pendingChoice =
    (hpMethod === 'rolagem' && hpRoll === null) ||
    (hpMethod === 'manual' && !hpManual) ||
    (asiHere && asiMode === 'none') ||
    (asiHere && asiMode === 'plus2' && asiPicks.length !== 1) ||
    (asiHere && asiMode === 'plus11' && asiPicks.length !== 2) ||
    (asiHere && asiMode === 'feat' && (!featId || (getFeat(featId)?.abilityChoice && !featAbility)));

  const features = featuresGained(classId, newClassLevel, plan.subclassId ?? char.subclassId);
  const profNow = proficiencyBonus(char.level);
  const profNext = proficiencyBonus(newLevel);

  const rollHitDie = () => {
    const r = rollDice(cls.hitDie, { label: `Dado de Vida d${cls.hitDie}` });
    setHpRoll(r.rolls[0]);
  };

  const confirm = () => {
    const res = store.levelUp(char.id, plan);
    if (res.ok) {
      setHpRoll(null);
      setHpManual('');
      setAsiMode('none');
      setAsiPicks([]);
      setFeatId('');
      setFeatAbility('');
      setSubPick('');
    }
  };

  const toggleAsiPick = (k: AbilityKey) => {
    const limit = asiMode === 'plus2' ? 1 : 2;
    setAsiPicks((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k].slice(-limit)));
  };

  const seg = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    flex: 1,
    minHeight: 42,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid ' + (active ? t.gold : t.line),
    background: active ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.24)',
    color: active ? t.gold : 'var(--muted)',
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    fontSize: 12.5,
    transition: '.2s',
  });

  return (
    <div className="animate-riseIn" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(13px,1.5vw,18px)' }}>
      {/* status + configurações da campanha */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="levelup" size={26} color={t.gold} />
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 20, color: 'var(--ink)', lineHeight: 1 }}>
                Evolução do Herói
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                {char.classLevels.map((cl) => `${getClass(cl.classId).label} ${cl.level}`).join(' · ')} — Nível total {char.level}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <CampChip label="Talentos" on={campaign.allowFeats} onToggle={() => store.updateCampaign(char.id, { allowFeats: !campaign.allowFeats })} />
            <CampChip label="Multiclasse" on={campaign.allowMulticlass} onToggle={() => store.updateCampaign(char.id, { allowMulticlass: !campaign.allowMulticlass })} />
            <CampChip label="Homebrew" on={campaign.allowHomebrew} onToggle={() => store.updateCampaign(char.id, { allowHomebrew: !campaign.allowHomebrew })} />
            <span style={{ alignSelf: 'center', fontSize: 10.5, letterSpacing: '.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              D&D 5e 2014
            </span>
          </div>
        </div>
      </Panel>

      {/* plano do próximo nível */}
      {!atCap && (
        <Panel>
          <SectionLabel
            right={
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: profNext > profNow ? t.gold : 'var(--muted)' }}>
                Proficiência {modStr(profNow)}{profNext > profNow ? ` → ${modStr(profNext)}` : ''}
              </span>
            }
          >
            Subir para o Nível {newLevel}
          </SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 14 }}>
            {/* classe */}
            <div>
              <div style={microLabel}>Classe que evolui {campaign.allowMulticlass ? '' : '(multiclasse desativada)'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(campaign.allowMulticlass ? CLASSES : CLASSES.filter((c) => c.id === char.classId)).map((c) => {
                  const active = classId === c.id;
                  const lvl = classLevelOf(char, c.id);
                  return (
                    <button key={c.id} onClick={() => { setClassId(c.id); setHpRoll(null); }} style={{ ...seg(active), display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                      <span>{c.label}{lvl ? ` (${lvl} → ${lvl + 1})` : ' (novo)'}</span>
                      <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11 }}>d{c.hitDie}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PV do nível */}
            <div>
              <div style={microLabel}>Pontos de vida do nível (d{cls.hitDie} + CON {modStr(conMod)})</div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button style={seg(hpMethod === 'media')} onClick={() => setHpMethod('media')}>Média ({averageHp(cls.hitDie)})</button>
                <button style={seg(hpMethod === 'rolagem')} onClick={() => setHpMethod('rolagem')}>Rolar</button>
                <button style={seg(hpMethod === 'manual')} onClick={() => setHpMethod('manual')}>Manual</button>
              </div>
              {hpMethod === 'rolagem' && (
                <div style={{ marginTop: 9, display: 'flex', gap: 9, alignItems: 'center' }}>
                  <button onClick={rollHitDie} className="fv-btn-gold" style={{ padding: '10px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="d20" size={16} /> Rolar d{cls.hitDie}
                  </button>
                  <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 20, color: hpRoll ? t.gold : 'var(--muted)' }}>
                    {hpRoll ?? '—'}
                  </span>
                </div>
              )}
              {hpMethod === 'manual' && (
                <input
                  className="fv-input"
                  style={{ marginTop: 9, maxWidth: 140, textAlign: 'center', fontFamily: "'Chakra Petch', monospace" }}
                  inputMode="numeric"
                  placeholder={`1–${cls.hitDie}`}
                  value={hpManual}
                  onChange={(e) => setHpManual(e.target.value)}
                />
              )}
              <div style={{ marginTop: 9, fontSize: 12, color: 'var(--muted)' }}>
                Ganho total: <b style={{ color: 'var(--ink)', fontFamily: "'Chakra Petch', monospace" }}>{Math.max(0, hpValue) + conMod}</b> PV
                ({hpValue || '?'} + {conMod} CON)
              </div>
            </div>
          </div>

          {/* subclasse no nível certo */}
          {needsSubclass && newClassLevel === subLevel && (
            <div style={{ marginTop: 16 }}>
              <div style={microLabel}>Subclasse de {cls.label} (nível {subLevel})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 9 }}>
                {subclassesFor(classId).map((sub) => {
                  const active = subPick === sub.id;
                  return (
                    <button key={sub.id} onClick={() => setSubPick(sub.id)} style={{ ...seg(active), textAlign: 'left', minHeight: 58 }}>
                      <div style={{ fontSize: 13.5, color: active ? t.gold : 'var(--ink)' }}>{sub.label}</div>
                      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--muted)', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>{sub.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASI / talento no nível certo */}
          {asiHere && (
            <div style={{ marginTop: 16 }}>
              <div style={microLabel}>Aumento de Atributo ou Talento (nível {newClassLevel} de {cls.label})</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button style={{ ...seg(asiMode === 'plus2'), flex: 'none', padding: '8px 16px' }} onClick={() => { setAsiMode('plus2'); setAsiPicks([]); }}>+2 em um atributo</button>
                <button style={{ ...seg(asiMode === 'plus11'), flex: 'none', padding: '8px 16px' }} onClick={() => { setAsiMode('plus11'); setAsiPicks([]); }}>+1 em dois atributos</button>
                {campaign.allowFeats && (
                  <button style={{ ...seg(asiMode === 'feat'), flex: 'none', padding: '8px 16px' }} onClick={() => setAsiMode('feat')}>Talento</button>
                )}
              </div>

              {(asiMode === 'plus2' || asiMode === 'plus11') && (
                <div style={{ marginTop: 10, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {ABILITY_KEYS.map((k) => {
                    const active = asiPicks.includes(k);
                    const inc = asiMode === 'plus2' ? 2 : 1;
                    const wouldExceed = totals[k] + inc > 20;
                    return (
                      <button
                        key={k}
                        onClick={() => !wouldExceed && toggleAsiPick(k)}
                        disabled={wouldExceed && !active}
                        style={{
                          ...seg(active),
                          flex: 'none',
                          padding: '8px 13px',
                          opacity: wouldExceed && !active ? 0.4 : 1,
                        }}
                        title={wouldExceed ? `${ABILITY_LABELS[k]} passaria de 20` : ABILITY_LABELS[k]}
                      >
                        {ABILITY_SHORT[k]} {totals[k]} → {Math.min(20, totals[k] + (active ? inc : inc))}
                      </button>
                    );
                  })}
                </div>
              )}

              {asiMode === 'feat' && (
                <div style={{ marginTop: 10 }}>
                  {(['PHB 2014', 'XGE'] as const).map((source) => {
                    const list = FEATS.filter((f) => f.source === source && !char.feats.includes(f.id));
                    if (list.length === 0) return null;
                    return (
                      <div key={source} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
                          <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--acc)' }}>
                            {source === 'PHB 2014' ? 'LIVRO DO JOGADOR 2014' : "XANATHAR'S GUIDE (RACIAIS)"}
                          </span>
                          <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--line), transparent)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: 8 }}>
                          {list.map((f) => {
                            const active = featId === f.id;
                            const issue = featPrereqIssue(char, f);
                            return (
                              <LoreTooltip
                                key={f.id}
                                info={passiveLore(
                                  f.label,
                                  `Talento · ${f.source}${f.prereq ? ` · requer ${f.prereq}` : ''}`,
                                  `${f.desc}${f.notes ? `\n\n${f.notes}` : ''}${issue ? `\n\n✕ ${issue}` : ''}`,
                                  [f.source, ...(f.prereq ? ['Pré-requisito'] : [])],
                                )}
                                anchorStyle={{ display: 'block' }}
                              >
                                <button
                                  onClick={() => { if (!issue) { setFeatId(f.id); setFeatAbility(''); } }}
                                  disabled={!!issue}
                                  style={{ ...seg(active), width: '100%', textAlign: 'left', minHeight: 52, opacity: issue ? 0.42 : 1, cursor: issue ? 'not-allowed' : 'pointer' }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 13, color: active ? t.gold : 'var(--ink)' }}>{f.label}</span>
                                    {f.prereq && (
                                      <span style={{ flex: 'none', fontSize: 8.5, letterSpacing: '.08em', color: issue ? t.danger : 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                                        REQ
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ marginTop: 2, fontSize: 10.5, color: 'var(--muted)', fontFamily: "'Inter', sans-serif", fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.desc}</div>
                                </button>
                              </LoreTooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {featId && getFeat(featId)?.abilityChoice && (
                    <div style={{ marginTop: 9, display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>+1 em:</span>
                      {getFeat(featId)!.abilityChoice!.map((k) => (
                        <button key={k} onClick={() => setFeatAbility(k)} disabled={totals[k] >= 20} style={{ ...seg(featAbility === k), flex: 'none', padding: '7px 12px', opacity: totals[k] >= 20 ? 0.4 : 1 }}>
                          {ABILITY_SHORT[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* características ganhas */}
          {features.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={microLabel}>Você desbloqueia neste nível</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {features.map((f) => (
                  <span key={f} className="fv-chip fv-chip-gold">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* validação + confirmar */}
          {errors.length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.danger, 0.45), background: hexA(t.danger, 0.08) }}>
              {errors.map((e) => (
                <div key={e} style={{ fontSize: 12.5, color: t.danger, fontWeight: 600 }}>• {e}</div>
              ))}
            </div>
          )}
          <button
            onClick={confirm}
            disabled={errors.length > 0 || pendingChoice}
            className="fv-btn-gold"
            style={{ marginTop: 16, width: '100%', padding: 14, fontSize: 15, opacity: errors.length > 0 || pendingChoice ? 0.45 : 1 }}
          >
            Confirmar Evolução para o Nível {newLevel}
          </button>
        </Panel>
      )}

      {atCap && (
        <Panel>
          <div style={{ textAlign: 'center', padding: '14px 0', fontFamily: "'Cinzel', serif", fontSize: 17, color: t.gold }}>
            Lenda consolidada — nível máximo {MAX_LEVEL} alcançado.
          </div>
        </Panel>
      )}

      {/* linha do tempo */}
      <Panel>
        <SectionLabel>Linha do Tempo da Evolução</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {[...char.levelHistory].reverse().map((r) => (
            <TimelineEntry key={r.level} record={r} conMod={conMod} />
          ))}
          {char.levelHistory.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sem registros ainda — evolua o personagem para começar a crônica.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}

const microLabel: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 8,
};

function CampChip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <button
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid ' + (on ? t.gold : t.line),
        color: on ? t.gold : 'var(--muted)',
        background: on ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.22)',
        transition: '.2s',
      }}
    >
      <span style={{ width: 8, height: 8, transform: 'rotate(45deg)', border: '1px solid currentColor', background: on ? 'currentColor' : 'transparent' }} />
      {label}
    </button>
  );
}

function TimelineEntry({ record, conMod }: { record: LevelUpRecord; conMod: number }) {
  const t = useTheme();
  const cls = getClass(record.classId);
  const sub = getSubclass(record.subclassId);
  const asiText =
    record.asi?.kind === 'asi'
      ? 'ASI: ' + Object.entries(record.asi.increases).map(([k, v]) => `+${v} ${ABILITY_SHORT[k as AbilityKey]}`).join(', ')
      : record.asi?.kind === 'feat'
        ? `Talento: ${getFeat(record.asi.featId)?.label ?? record.asi.featId}${record.asi.ability ? ` (+1 ${ABILITY_SHORT[record.asi.ability]})` : ''}`
        : null;
  const hpLabel = record.level === 1 ? 'PV inicial' : 'PV ganho';
  const methodLabel = record.hpMethod === 'media' ? 'média' : record.hpMethod === 'rolagem' ? 'rolagem' : 'manual';

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '11px 13px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--line)',
        borderLeft: '3px solid ' + t.gold,
        background: 'rgba(0,0,0,.22)',
      }}
    >
      <div
        style={{
          flex: 'none',
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--radius-md)',
          border: '1px solid ' + hexA(t.gold, 0.4),
          background: hexA(t.gold, 0.08),
          fontFamily: "'Chakra Petch', monospace",
          fontWeight: 700,
          fontSize: 16,
          color: t.gold,
        }}
      >
        {record.level}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
          Nível {record.level} — {cls.label} {record.classLevel}
          {record.synthetic && <span style={{ marginLeft: 8, fontSize: 9.5, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>migrado (média)</span>}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
          {hpLabel}: {record.hpValue} ({methodLabel}) {conMod >= 0 ? '+' : ''}{conMod} CON
        </div>
        {sub && record.subclassId && (
          <div style={{ marginTop: 3, fontSize: 12, color: t.gold }}>Subclasse escolhida: {sub.label}</div>
        )}
        {asiText && <div style={{ marginTop: 3, fontSize: 12, color: t.gold }}>{asiText}</div>}
        {record.features.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {record.features.map((f) => (
              <span key={f} className="fv-chip" style={{ fontSize: 10.5, padding: '3px 8px' }}>{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
