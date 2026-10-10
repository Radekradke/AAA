import { spellDamageLabel } from '@/engine/spellCast';
import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import type { Spell } from '@/types/dnd';
import { AUTOMATION_CHIP, spellAutomation } from '@/engine/spellAutomation';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { SpellLibrary } from '@/components/spells/SpellLibrary';
import { SPELL_BY_ID, SPELLS, spellsForClass, spellVisible } from '@/data/spells';
import { useUiStore } from '@/store/uiStore';
import { SOURCE_SHORT } from '@/data/contentPacks';
import { getClass } from '@/data/classes';
import { casterKind, casterOf, expandedSpellIds, grantedSpells, itemGrantedSpells, syncSpellSlots } from '@/engine/spellcasting';
import { forgetBlock, learnBlock, prepareBlock, spellLearnState } from '@/engine/spellRules';
import { SpellCastButton } from '@/components/spells/SpellCastButton';
import { ItemChargeSpells } from '@/components/spells/ItemChargeSpells';
import { ABILITY_SHORT } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { Icon } from '@/components/ui/Icon';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { passiveLore, spellLore } from '@/lib/lore';
import { useInk } from '@/lib/contrast';
import { SchoolIcon } from '@/components/ui/RuleIcon';
import { SpellThumb } from '@/components/spells/SpellThumb';

/** Mago: copiar para o grimório custa 50 po por círculo (PHB 2014); truques não se copiam. */
function scrollCost(sp: Spell): number {
  return sp.level * 50;
}

export function TabMagias({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [learn, setLearn] = useState<false | 'class' | 'all'>(false);

  const cls = getClass(char.classId);
  // conjura pela classe ou pela subclasse (Cavaleiro Arcano / Trapaceiro Arcano: lista de mago, INT)
  const castAbility = casterOf(char)?.ability ?? cls.spellAbility ?? cls.prim;
  const castMod = derived.abilities[castAbility].mod;
  const caster = casterOf(char, castMod);
  const kind = caster?.kind ?? casterKind(char.classId);
  const isWizard = kind === 'spellbook';
  const listClass = caster?.listClass ?? char.classId;
  // regras de aprendizado (limites, lista, círculo, escolas, trocas) — "modo mestre" libera ajustes
  const st = useMemo(() => spellLearnState(char, castMod), [char, castMod]);
  // pacotes de conteúdo ligados mudam as listas (Xanathar, Tasha)
  const packs = useUiStore((s) => s.packs);
  const [freeMode, setFreeMode] = useState(false);
  const blockFor = (sp: Spell, mode: 'class' | 'copy') => (freeMode || !st ? null : learnBlock(char, st, sp, mode));

  // máximos vêm das regras (classe + subclasse); o gasto vem da ficha
  const slotView = syncSpellSlots(char);
  const slotLevels = Object.keys(slotView).map(Number).sort((a, b) => a - b);

  const allItemSpells = useMemo(() => itemGrantedSpells(char), [char.inventory, char.equipped, char.combat.itemSpellUses, char.combat.itemCharges, char.feats, char.level, char.raceId, char.subraceId, char.choices]);
  // cajados e varinhas (cargas) ficam num bloco próprio; o resto segue como antes
  const chargeSpells = allItemSpells.filter((s) => s.charges);
  const itemSpells = allItemSpells.filter((s) => !s.charges);

  // magias "do personagem": preparadas (todas as classes) + grimório do mago (nível ≥1)
  const prepared = char.preparedSpells;
  const spellbook = char.knownSpells; // usado só pelo mago (nível ≥1)

  // magias de Domínio/Juramento/Círculo: sempre preparadas, fora do limite
  const granted = useMemo(() => grantedSpells(char), [char.subclassId, char.classLevels, char.level, char.choices]);
  const grantedFrom = useMemo(() => new Map(granted.map((g) => [g.id, g.source])), [granted]);
  const activeIds = useMemo(
    () => Array.from(new Set([...(isWizard ? [...prepared, ...spellbook] : prepared), ...granted.map((g) => g.id)])),
    [isWizard, prepared, spellbook, granted],
  );
  const active = useMemo(
    () => activeIds.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    [activeIds],
  );

  // Cavaleiro/Trapaceiro Arcano: quase todas as magias de 2 escolas; algumas livres (níveis 3, 8, 14, 20)
  const offSchool = st?.offSchool ?? 0;

  // lista da classe + lista expandida do patrono (Bruxo)
  const classLearnList = useMemo(() => {
    const base = spellsForClass(listClass, 9);
    const extra = expandedSpellIds(char).map((id) => SPELL_BY_ID[id]).filter((sp) => sp && !base.includes(sp));
    return [...base, ...extra].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [listClass, char.subclassId, packs]);

  const update = (fn: (c: typeof char) => void) => store.updateCharacter(char.id, fn as never);

  // esquecer: respeita as regras (troca ao subir de nível, truques fixos, grimório)
  const forgetInfo = (sp: Spell) => (freeMode || !st ? { block: null, usesSwap: false } : forgetBlock(st, sp));
  const removeSpell = (id: string) => {
    const sp = SPELL_BY_ID[id];
    if (!sp) return;
    const f = forgetInfo(sp);
    if (f.block) return;
    store.forgetSpell(char.id, id, f.usesSwap);
  };

  // aprender/preparar (lista da classe) ou copiar para o grimório (mago, custa ouro)
  const learnSpell = (id: string, copy: boolean) => {
    const sp = SPELL_BY_ID[id];
    if (!sp) return;
    const field: 'knownSpells' | 'preparedSpells' = isWizard && sp.level >= 1 ? 'knownSpells' : 'preparedSpells';
    if (char[field].includes(id)) return removeSpell(id);
    if (blockFor(sp, copy ? 'copy' : 'class')) return;
    if (copy) return store.copySpell(char.id, id, scrollCost(sp));
    update((c) => {
      c[field] = [...c[field], id];
    });
  };

  const togglePrepared = (id: string) => {
    const isOn = char.preparedSpells.includes(id);
    if (!isOn && !freeMode && st && prepareBlock(st, false)) return;
    update((c) => {
      c.preparedSpells = isOn ? c.preparedSpells.filter((x) => x !== id) : [...c.preparedSpells, id];
    });
  };

  const byCircle = useMemo(() => {
    const map = new Map<number, Spell[]>();
    for (const sp of active) {
      const arr = map.get(sp.level) ?? [];
      arr.push(sp);
      map.set(sp.level, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [active]);

  if (kind === 'none' && allItemSpells.length === 0) {
    return (
      <div className="animate-riseIn">
        <Panel full>
          <EmptyState icon="spark" title="Esta classe não conjura magias" hint="Guerreiros, bárbaros, ladinos e monges (base) não têm magias — mas subclasses (Cavaleiro Arcano, Trapaceiro Arcano) e itens mágicos podem conceder conjuração." />
        </Panel>
      </div>
    );
  }

  const learnLabel = kind === 'prepared' ? 'Preparar' : isWizard ? 'Aprender' : 'Aprender';

  return (
    <div className="animate-riseIn" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}>
      {/* Espaços de magia + guia */}
      {kind !== 'none' && (
        <Panel full>
          <SectionLabel
            style={{ marginBottom: 6 }}
            right={
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                CD <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-num)' }}>{derived.spellDC}</b> · ataque{' '}
                <b style={{ color: 'var(--acc)', fontFamily: 'var(--font-num)' }}>{derived.spellAttack !== null ? modStr(derived.spellAttack) : '—'}</b>
                {' '}· {ABILITY_SHORT[castAbility]}
              </span>
            }
          >
            Espaços de Magia
          </SectionLabel>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            {st && st.cantrips.max > 0 && <GuideChip label="Truques" have={st.cantrips.have} target={st.cantrips.max} color={t.acc} />}
            {st?.known && <GuideChip label={isWizard ? 'grimório (grátis)' : 'conhecidas'} have={st.known.have} target={st.known.max} color={t.gold} />}
            {st?.prepared && <GuideChip label="preparadas" have={st.prepared.have} target={st.prepared.max} color="#C24DFF" />}
            {st && st.maxCircle > 0 && (
              <span className="fv-spell-rule-chip">até o {st.maxCircle}º círculo</span>
            )}
            <button
              type="button"
              className={'fv-spell-free' + (freeMode ? ' is-on' : '')}
              aria-pressed={freeMode}
              onClick={() => setFreeMode((f) => !f)}
              title="Libera adicionar/remover sem as regras (correções combinadas com o mestre)"
            >
              {freeMode ? '🔓 Modo mestre ligado' : '🔒 Regras do PHB'}
            </button>
          </div>
          <p className="fv-spell-rule-text">
            {kind === 'known'
              ? 'Você conhece um número fixo de magias da lista da sua classe. Ao subir de nível, aprende as novas e pode trocar UMA que já conhece.'
              : isWizard
                ? 'Seu grimório ganha 2 magias grátis por nível (de círculos que você conjura). Outras podem ser copiadas de pergaminhos: 50 po por círculo. Prepare até INT + nível por dia.'
                : 'Você conhece a lista inteira da classe e prepara magias todo dia (troca após descanso longo), até o limite.'}
          </p>
          {!freeMode && st && st.swaps > 0 && kind === 'known' && (
            <div role="note" className="fv-spell-warn" style={{ borderColor: 'var(--acc)' }}>
              <b style={{ color: 'var(--acc)' }}>Troca disponível ({st.swaps}):</b> esqueça uma magia conhecida (✕ na lista) e aprenda outra da lista da classe.
            </div>
          )}

          {/* fichas antigas (antes da correção) podem ter vindo com magias a mais */}
          {st && st.cantrips.have > st.cantrips.max && (
            <div role="note" className="fv-spell-warn">
              <b>Truques a mais:</b> você tem {st.cantrips.have}, mas o limite é {st.cantrips.max}. Esqueça o excedente com o <span aria-hidden>×</span> (ou ligue o modo mestre, se foi combinado).
            </div>
          )}
          {st?.known && st.known.have > st.known.max && (
            <div role="note" className="fv-spell-warn">
              <b>Magias a mais:</b> {st.known.have} de {st.known.max}. Esqueça o excedente com o <span aria-hidden>×</span>.
            </div>
          )}

          {caster?.schools && (
            <div role="note" className="fv-spell-warn" style={offSchool > caster.schools.free ? undefined : { borderColor: 'var(--line)' }}>
              <b style={offSchool > caster.schools.free ? undefined : { color: 'var(--acc)' }}>{caster.via}:</b> magias de {caster.schools.allowed.join(' ou ')}.
              {' '}Fora dessas escolas: {offSchool} de {caster.schools.free} permitida{caster.schools.free === 1 ? '' : 's'} (uma a mais nos níveis 3, 8, 14 e 20).
            </div>
          )}

          {slotLevels.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Sem espaços de magia neste nível (truques ainda funcionam).</div>}
          {slotLevels.map((lv) => {
            const slot = slotView[lv];
            return (
              <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <LoreTooltip info={passiveLore(`${lv}º círculo`, `${slot.max - slot.used}/${slot.max} disponíveis`, 'Cada losango é um espaço. Gastos voltam após descanso longo.', ['Magia', 'Recurso'])}>
                  <span style={{ cursor: 'help', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)', minWidth: 90 }}>{lv}º círculo</span>
                </LoreTooltip>
                <div style={{ flex: 1, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {Array.from({ length: slot.max }, (_, i) => {
                    const filled = i >= slot.used;
                    return (
                      <span key={i} onClick={() => store.toggleSpellSlot(char.id, lv, i + 1)}
                        style={{ cursor: 'pointer', width: 19, height: 19, borderRadius: 6, transform: 'rotate(45deg)', border: '1px solid ' + (filled ? t.acc : t.line), background: filled ? hexA(t.acc, 0.85) : 'transparent', boxShadow: filled ? '0 0 10px ' + hexA(t.acc, 0.6) : 'none', transition: '.2s' }} />
                    );
                  })}
                </div>
                <span style={{ fontFamily: 'var(--font-num)', fontSize: 12, color: 'var(--muted)' }}>{slot.max - slot.used} / {slot.max}</span>
              </div>
            );
          })}
        </Panel>
      )}

      {/* Cajados e varinhas: cargas compartilhadas, custo por magia */}
      {chargeSpells.length > 0 && (
        <Panel full>
          <SectionLabel>Cajados e varinhas</SectionLabel>
          <ItemChargeSpells char={char} derived={derived} castMod={castMod} spells={chargeSpells} />
        </Panel>
      )}

      {/* Magias concedidas por itens (BG3) */}
      {itemSpells.length > 0 && (
        <Panel full>
          <SectionLabel>Magias de raça, itens e talentos</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {itemSpells.map((is) => (
              <div key={is.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.acc2 ?? t.acc, 0.4), background: 'var(--lift)' }}>
                <LoreTooltip info={spellLore(is.spell)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                  <span style={{ cursor: 'help', display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>{is.spell.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>de {is.itemName} · {is.recharge === 'atwill' ? 'à vontade' : `${is.usesMax}×/descanso ${is.recharge === 'short' ? 'curto' : 'longo'}`}</span>
                  </span>
                </LoreTooltip>
                {is.recharge === 'atwill' ? (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: t.acc, padding: '4px 9px', borderRadius: 999, border: '1px solid ' + hexA(t.acc, 0.5) }}>à vontade</span>
                ) : (
                  <>
                    <span style={{ fontFamily: 'var(--font-num)', fontSize: 12, color: is.usesLeft > 0 ? t.gold : 'var(--muted)' }}>{is.usesLeft}/{is.usesMax}</span>
                    <button
                      onClick={() => is.usesLeft > 0 && store.useItemSpell(char.id, is.key)}
                      disabled={is.usesLeft === 0}
                      style={{ cursor: is.usesLeft > 0 ? 'pointer' : 'not-allowed', minHeight: 32, padding: '5px 13px', borderRadius: 999, border: '1px solid ' + (is.usesLeft > 0 ? t.gold : t.line), color: is.usesLeft > 0 ? t.gold : 'var(--muted)', background: is.usesLeft > 0 ? hexA(t.gold, 0.12) : 'transparent', fontWeight: 700, fontSize: 12, opacity: is.usesLeft > 0 ? 1 : 0.5 }}
                    >
                      Usar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p style={{ margin: '9px 0 0', fontSize: 11, color: 'var(--muted)' }}>Magias da raça e de talentos conjuram sem gastar espaço; as de itens só valem com o item equipado ou sintonizado. Recarregam no descanso (curto/longo).</p>
        </Panel>
      )}

      {/* Magias do personagem */}
      {kind !== 'none' && (
        <Panel full>
          <SectionLabel
            right={
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setLearn('class')} style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.1) }}>
                  + {learnLabel}
                </button>
                {isWizard && (
                  <button onClick={() => setLearn('all')} title="Copiar uma magia de mago de um pergaminho ou outro grimório: 50 po por círculo" style={{ cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--acc)', color: 'var(--acc)', background: 'var(--lift)' }}>
                    📜 Copiar para o grimório
                  </button>
                )}
              </div>
            }
          >
            {isWizard ? 'Grimório' : kind === 'prepared' ? 'Magias Preparadas' : 'Magias Conhecidas'}
          </SectionLabel>

          {active.length === 0 && (
            <EmptyState icon="spark" title="Nenhuma magia ainda" hint={<>Use <b style={{ color: t.gold }}>+ {learnLabel}</b> para escolher da lista da sua classe — só aparecem liberadas as magias que você pode pegar agora.</>} />
          )}

          {byCircle.map(([lv, spells]) => (
            <div key={lv} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 7px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{lv === 0 ? 'Truques' : `${lv}º círculo`}</span>
                <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--line), transparent)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-num)' }}>{spells.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 6 }}>
                {spells.map((sp) => {
                  const grantSource = grantedFrom.get(sp.id);
                  const learned = prepared.includes(sp.id) || spellbook.includes(sp.id);
                  const isPrepared = prepared.includes(sp.id);
                  const canPrepare = isWizard && sp.level >= 1 && !grantSource; // truques do mago sempre ativos
                  return (
                    <div key={sp.id} className="fv-spell-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (canPrepare && isPrepared ? hexA(t.gold, 0.5) : 'var(--line)'), background: canPrepare && isPrepared ? hexA(t.gold, 0.06) : 'var(--sunk)' }}>
                      <SpellThumb spell={sp} size={34} />
                      <LoreTooltip info={spellLore(sp)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                        <span style={{ cursor: 'help', display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</span>
                          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                            {grantSource && <Mini c="var(--gold)">sempre preparada · {grantSource}</Mini>}
                            <Mini>
                              <SchoolIcon school={sp.school} size={10} />
                              {sp.school}
                            </Mini>
                            {sp.source && <Mini c="var(--acc)">{SOURCE_SHORT[sp.source]}</Mini>}
                            {sp.damage && <Mini c="#FF6A3D">{spellDamageLabel(sp, char.level)}</Mini>}
                            {sp.heal && <Mini c="#3FC56B">cura</Mini>}
                            {sp.save && <Mini c="#9BB0CC">save {ABILITY_SHORT[sp.save]}</Mini>}
                            {sp.concentration && <Mini c="#C24DFF">conc.</Mini>}
                            {sp.ritual && <Mini c="#4FA37A">ritual</Mini>}
                            <AutoMini sp={sp} />
                          </span>
                        </span>
                      </LoreTooltip>
                      {canPrepare && (
                        <button
                          onClick={() => togglePrepared(sp.id)}
                          title={isPrepared ? 'Preparada' : 'Preparar'}
                          style={{ cursor: 'pointer', flex: 'none', minHeight: 30, padding: '4px 11px', borderRadius: 999, border: '1px solid ' + (isPrepared ? t.gold : t.line), color: isPrepared ? t.gold : 'var(--muted)', background: isPrepared ? hexA(t.gold, 0.14) : 'transparent', fontWeight: 700, fontSize: 11.5 }}
                        >
                          {isPrepared ? '★ Preparada' : '☆ Preparar'}
                        </button>
                      )}
                      {(sp.level === 0 || !isWizard || isPrepared || grantSource || (sp.ritual && isWizard)) && (
                        <SpellCastButton char={char} derived={derived} spell={sp} castMod={castMod} compact />
                      )}
                      {learned && !forgetInfo(sp).block && (
                        <button
                          type="button"
                          className="fv-item-remove"
                          onClick={() => removeSpell(sp.id)}
                          aria-label={`Esquecer ${sp.name}`}
                          title={forgetInfo(sp).usesSwap ? 'Esquecer (usa sua troca de nível)' : kind === 'prepared' ? 'Despreparar' : 'Esquecer magia'}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {learn && (
        <SpellLibrary
          title={learn === 'all' ? 'Copiar para o grimório (50 po por círculo)' : `${learnLabel} magias — ${caster?.via ?? cls.label}`}
          spells={learn === 'all' ? SPELLS.filter((s) => spellVisible(s) && s.level >= 1 && (s.classes ?? []).includes('wizard')) : classLearnList}
          blockReason={(s) => blockFor(s, learn === 'all' ? 'copy' : 'class')}
          selected={activeIds}
          onToggle={(id) => learnSpell(id, learn === 'all')}
          onClose={() => setLearn(false)}
          actionLabel={learnLabel}
          costOf={learn === 'all' ? (s) => scrollCost(s) : undefined}
        />
      )}
    </div>
  );
}

function GuideChip({ label, have, target, color }: { label: string; have: number; target: number; color: string }) {
  const over = have > target;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontSize: 11.5, padding: '4px 10px', borderRadius: 999, border: '1px solid ' + hexA(color, 0.5), background: hexA(color, 0.08) }}>
      <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{label}</span>
      <b style={{ fontFamily: 'var(--font-num)', color: over ? 'var(--danger)' : color }}>{have}</b>
      <span style={{ color: 'var(--muted)' }}>/ {target}</span>
    </span>
  );
}

function Mini({ children, c }: { children: React.ReactNode; c?: string }) {
  const ink = useInk();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5, color: c ? ink(c) : 'var(--muted)', border: '1px solid ' + hexA(c ?? '#8B99B0', 0.4), background: hexA(c ?? '#8B99B0', 0.08), whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

/** Quanto da magia a ficha resolve (detalhe completo na dica). */
function AutoMini({ sp }: { sp: Spell }) {
  const chip = AUTOMATION_CHIP[spellAutomation(sp).level];
  return (
    <span title={chip.title}>
      <Mini c={chip.color}>{chip.text}</Mini>
    </span>
  );
}
