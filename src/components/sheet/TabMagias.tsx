import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import type { Spell } from '@/types/dnd';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useCharacterStore } from '@/store/characterStore';
import { SpellLibrary } from '@/components/spells/SpellLibrary';
import { SPELL_BY_ID, SPELLS, spellsForClass } from '@/data/spells';
import { getClass } from '@/data/classes';
import { casterKind, cantripsKnown, spellsKnownOrPrepared, itemGrantedSpells } from '@/engine/spellcasting';
import { ABILITY_SHORT } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { passiveLore, spellLore } from '@/lib/lore';

/** Custo em ouro para escrever uma magia de um pergaminho/grimório (estilo BG3). */
function scrollCost(sp: Spell): number {
  return sp.level === 0 ? 25 : sp.level * 50;
}

export function TabMagias({ char, derived }: TabProps) {
  const t = useTheme();
  const store = useCharacterStore();
  const [learn, setLearn] = useState<false | 'class' | 'all'>(false);

  const cls = getClass(char.classId);
  const kind = casterKind(char.classId);
  const isWizard = kind === 'spellbook';
  const castAbility = cls.spellAbility ?? cls.prim;
  const castMod = derived.abilities[castAbility].mod;

  const slotLevels = Object.keys(char.combat.spellSlots).map(Number).sort((a, b) => a - b);
  const maxCircle = Math.max(0, ...slotLevels);

  const itemSpells = useMemo(() => itemGrantedSpells(char), [char.inventory, char.equipped, char.combat.itemSpellUses]);

  // magias "do personagem": preparadas (todas as classes) + grimório do mago (nível ≥1)
  const prepared = char.preparedSpells;
  const spellbook = char.knownSpells; // usado só pelo mago (nível ≥1)

  const activeIds = useMemo(
    () => (isWizard ? Array.from(new Set([...prepared, ...spellbook])) : prepared),
    [isWizard, prepared, spellbook],
  );
  const active = useMemo(
    () => activeIds.map((id) => SPELL_BY_ID[id]).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    [activeIds],
  );

  const cantripsHave = active.filter((s) => s.level === 0).length;
  const spellsHave = active.filter((s) => s.level >= 1).length;
  const preparedCount = prepared.map((id) => SPELL_BY_ID[id]).filter((s) => s && s.level >= 1).length;
  const cantripTarget = cantripsKnown(char.classId, char.level);
  const guide = spellsKnownOrPrepared(char.classId, char.level, castMod);
  const prepMax = Math.max(1, castMod + (char.classId === 'paladin' ? Math.floor(char.level / 2) : char.level));

  const update = (fn: (c: typeof char) => void) => store.updateCharacter(char.id, fn as never);

  // adiciona/remove magia (com custo de ouro no caminho "pergaminho")
  const learnSpell = (id: string, scroll: boolean) => {
    const sp = SPELL_BY_ID[id];
    if (!sp) return;
    const field: 'knownSpells' | 'preparedSpells' = isWizard && sp.level >= 1 ? 'knownSpells' : 'preparedSpells';
    const already = char[field].includes(id);
    if (already) {
      update((c) => {
        c[field] = c[field].filter((x) => x !== id);
        if (field === 'knownSpells') c.preparedSpells = c.preparedSpells.filter((x) => x !== id);
      });
      return;
    }
    const cost = scroll ? scrollCost(sp) : 0;
    if (cost && char.coins.gp < cost) return;
    update((c) => {
      if (cost) c.coins.gp = Math.max(0, c.coins.gp - cost);
      c[field] = [...c[field], id];
    });
  };

  const togglePrepared = (id: string) =>
    update((c) => {
      c.preparedSpells = c.preparedSpells.includes(id) ? c.preparedSpells.filter((x) => x !== id) : [...c.preparedSpells, id];
    });

  const removeSpell = (id: string) =>
    update((c) => {
      c.preparedSpells = c.preparedSpells.filter((x) => x !== id);
      c.knownSpells = (c.knownSpells ?? []).filter((x) => x !== id);
    });

  const byCircle = useMemo(() => {
    const map = new Map<number, Spell[]>();
    for (const sp of active) {
      const arr = map.get(sp.level) ?? [];
      arr.push(sp);
      map.set(sp.level, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [active]);

  if (kind === 'none' && itemSpells.length === 0) {
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
                CD <b style={{ color: 'var(--gold)', fontFamily: "'Chakra Petch', monospace" }}>{derived.spellDC}</b> · ataque{' '}
                <b style={{ color: 'var(--acc)', fontFamily: "'Chakra Petch', monospace" }}>{derived.spellAttack !== null ? modStr(derived.spellAttack) : '—'}</b>
                {' '}· {ABILITY_SHORT[castAbility]}
              </span>
            }
          >
            Espaços de Magia
          </SectionLabel>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {cantripTarget > 0 && <GuideChip label="Truques" have={cantripsHave} target={cantripTarget} color={t.acc} />}
            {isWizard ? (
              <>
                <GuideChip label="grimório" have={spellsHave} target={guide.count} color={t.gold} />
                <GuideChip label="preparadas" have={preparedCount} target={prepMax} color="#C24DFF" />
              </>
            ) : guide.count > 0 ? (
              <GuideChip label={guide.label} have={spellsHave} target={guide.count} color={t.gold} />
            ) : null}
            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
              {kind === 'known' ? 'Escolhe magias fixas ao subir de nível.' : isWizard ? 'Grimório: aprende ao subir e copia de pergaminhos (custa ouro).' : 'Prepara magias da lista da classe por dia.'}
            </span>
          </div>

          {slotLevels.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Sem espaços de magia neste nível (truques ainda funcionam).</div>}
          {slotLevels.map((lv) => {
            const slot = char.combat.spellSlots[lv];
            return (
              <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <LoreTooltip info={passiveLore(`${lv}º círculo`, `${slot.max - slot.used}/${slot.max} disponíveis`, 'Cada losango é um espaço. Gastos voltam após descanso longo.', ['Magia', 'Recurso'])}>
                  <span style={{ cursor: 'help', fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--ink)', minWidth: 90 }}>{lv}º círculo</span>
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
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--muted)' }}>{slot.max - slot.used} / {slot.max}</span>
              </div>
            );
          })}
        </Panel>
      )}

      {/* Magias concedidas por itens (BG3) */}
      {itemSpells.length > 0 && (
        <Panel full>
          <SectionLabel>Magias de Itens</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {itemSpells.map((is) => (
              <div key={is.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + hexA(t.acc2 ?? t.acc, 0.4), background: hexA(t.acc2 ?? t.acc, 0.06) }}>
                <LoreTooltip info={spellLore(is.spell)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                  <span style={{ cursor: 'help', display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>{is.spell.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>de {is.itemName} · {is.recharge === 'atwill' ? 'à vontade' : `1×/descanso ${is.recharge === 'short' ? 'curto' : 'longo'}`}</span>
                  </span>
                </LoreTooltip>
                {is.recharge === 'atwill' ? (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: t.acc, padding: '4px 9px', borderRadius: 999, border: '1px solid ' + hexA(t.acc, 0.5) }}>à vontade</span>
                ) : (
                  <>
                    <span style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: is.usesLeft > 0 ? t.gold : 'var(--muted)' }}>{is.usesLeft}/{is.usesMax}</span>
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
          <p style={{ margin: '9px 0 0', fontSize: 11, color: 'var(--muted)' }}>Só valem com o item equipado ou sintonizado. Recarregam no descanso (curto/longo).</p>
        </Panel>
      )}

      {/* Magias do personagem */}
      {kind !== 'none' && (
        <Panel full>
          <SectionLabel
            right={
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setLearn('class')} style={{ cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold)', background: hexA(t.gold, 0.1) }}>
                  + {learnLabel}
                </button>
                <button onClick={() => setLearn('all')} title="Aprender de pergaminho/grimório em troca de ouro" style={{ cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--acc)', color: 'var(--acc)', background: hexA(t.acc, 0.1) }}>
                  📜 De pergaminho
                </button>
              </div>
            }
          >
            {isWizard ? 'Grimório' : kind === 'prepared' ? 'Magias Preparadas' : 'Magias Conhecidas'}
          </SectionLabel>

          {active.length === 0 && (
            <EmptyState icon="spark" title="Nenhuma magia ainda" hint={<>Use <b style={{ color: t.gold }}>+ {learnLabel}</b> para a lista da sua classe, ou <b style={{ color: t.acc }}>📜 De pergaminho</b> (custa ouro) para aprender de um pergaminho/grimório.</>} />
          )}

          {byCircle.map(([lv, spells]) => (
            <div key={lv} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 7px' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{lv === 0 ? 'Truques' : `${lv}º círculo`}</span>
                <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--line), transparent)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{spells.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {spells.map((sp) => {
                  const isPrepared = prepared.includes(sp.id);
                  const canPrepare = isWizard && sp.level >= 1; // truques do mago sempre ativos
                  return (
                    <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (canPrepare && isPrepared ? hexA(t.gold, 0.5) : 'var(--line)'), background: canPrepare && isPrepared ? hexA(t.gold, 0.06) : 'rgba(0,0,0,.24)' }}>
                      <LoreTooltip info={spellLore(sp)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                        <span style={{ cursor: 'help', display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</span>
                          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                            <Mini>{sp.school}</Mini>
                            {sp.damage && <Mini c="#FF6A3D">{sp.damage.dice} {sp.damage.type}</Mini>}
                            {sp.heal && <Mini c="#3FC56B">cura</Mini>}
                            {sp.save && <Mini c="#9BB0CC">save {ABILITY_SHORT[sp.save]}</Mini>}
                            {sp.concentration && <Mini c="#C24DFF">conc.</Mini>}
                            {sp.ritual && <Mini c="#4FA37A">ritual</Mini>}
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
                      <button onClick={() => removeSpell(sp.id)} aria-label="Esquecer" style={{ cursor: 'pointer', flex: 'none', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14 }}>✕</button>
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
          title={learn === 'all' ? 'Aprender de pergaminho/grimório' : `${learnLabel} magias — ${cls.label}`}
          spells={(learn === 'all' ? SPELLS : spellsForClass(char.classId, 9)).filter((s) => s.level <= maxCircle)}
          selected={activeIds}
          onToggle={(id) => learnSpell(id, learn === 'all')}
          onClose={() => setLearn(false)}
          actionLabel={learnLabel}
          costOf={learn === 'all' ? (s) => scrollCost(s) : undefined}
          blockedAdd={learn === 'all' ? (s) => char.coins.gp < scrollCost(s) : undefined}
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
      <b style={{ fontFamily: "'Chakra Petch', monospace", color: over ? 'var(--danger)' : color }}>{have}</b>
      <span style={{ color: 'var(--muted)' }}>/ {target}</span>
    </span>
  );
}

function Mini({ children, c }: { children: React.ReactNode; c?: string }) {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5, color: c ?? 'var(--muted)', border: '1px solid ' + hexA(c ?? '#8B99B0', 0.4), background: hexA(c ?? '#8B99B0', 0.08), whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}
