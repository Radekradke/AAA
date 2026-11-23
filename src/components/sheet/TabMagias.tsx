import { spellDamageLabel } from '@/engine/spellCast';
import { useMemo, useState } from 'react';
import type { TabProps } from './tabProps';
import type { Spell } from '@/types/dnd';
import { AUTOMATION_CHIP, spellAutomation } from '@/engine/spellAutomation';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import '@/styles/magias.css';
import { useCharacterStore } from '@/store/characterStore';
import { SpellLibrary } from '@/components/spells/SpellLibrary';
import { SPELL_BY_ID, SPELLS, spellsForClass, spellVisible } from '@/data/spells';
import { useUiStore } from '@/store/uiStore';
import { getClass } from '@/data/classes';
import { casterKind, casterOf, casterForClass, casterProfiles, changeSpellSelection, expandedSpellIds, grantedSpellsForClass, itemGrantedSpells, spellSelectionOf, syncSpellSlots, syncSlotPools } from '@/engine/spellcasting';
import { forgetBlock, learnBlock, prepareBlock, spellLearnState } from '@/engine/spellRules';
import { wizardFreeCast } from '@/engine/wizard';
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
import { spellArt } from '@/lib/spellArt';
import { useHomebrewStore } from '@/store/homebrewStore';
import { HomebrewSpellEditor } from '@/components/homebrew/HomebrewSpellEditor';
import { pressable } from '@/lib/pressable';

/** Mago: copiar para o grimório custa 50 po por círculo (PHB 2014); truques não se copiam. */
function scrollCost(sp: Spell): number {
  return sp.level * 50;
}

export function TabMagias({ char, derived }: TabProps) {
  const store = useCharacterStore();
  const [learn, setLearn] = useState<false | 'class' | 'all'>(false);
  // editor de magia homebrew: undefined = fechado, null = nova
  const [hbSpell, setHbSpell] = useState<Spell | null | undefined>(undefined);
  const hbSpells = useHomebrewStore((s) => s.spells);

  const profiles = casterProfiles(char);
  const [selectedClass, setSelectedClass] = useState(() => casterOf(char)?.classId ?? char.classId);
  const classId = profiles.find((p) => p.classId === selectedClass)?.classId ?? casterOf(char)?.classId ?? char.classId;
  const cls = getClass(classId);
  // conjura pela classe ou pela subclasse (Cavaleiro Arcano / Trapaceiro Arcano: lista de mago, INT)
  const castAbility = casterForClass(char, classId)?.ability ?? cls.spellAbility ?? cls.prim;
  const castMod = derived.abilities[castAbility].mod;
  const caster = casterForClass(char, classId, castMod);
  const kind = caster?.kind ?? casterKind(classId);
  const numbers = derived.spellProfiles?.[classId];
  const castingDerived = numbers ? { ...derived, spellDC: numbers.dc, spellAttack: numbers.attack } : derived;
  const selection = spellSelectionOf(char, classId);
  const isWizard = kind === 'spellbook';
  const listClass = caster?.listClass ?? classId;
  // regras de aprendizado (limites, lista, círculo, escolas, trocas) — "modo mestre" libera ajustes
  // hbSpells: uma magia homebrew nova entra na lista da classe (listIds)
  const st = useMemo(() => spellLearnState(char, castMod, classId), [char, castMod, classId, hbSpells]); // eslint-disable-line react-hooks/exhaustive-deps
  // pacotes de conteúdo ligados mudam as listas (Xanathar, Tasha)
  const packs = useUiStore((s) => s.packs);
  const [freeMode, setFreeMode] = useState(false);
  // filtro por círculo e busca na lista
  const [circle, setCircle] = useState<'all' | number>('all');
  const [q, setQ] = useState('');
  const blockFor = (sp: Spell, mode: 'class' | 'copy') => (freeMode || !st ? null : learnBlock(char, st, sp, mode));

  // máximos vêm das regras (classe + subclasse); o gasto vem da ficha
  const slotView = syncSpellSlots(char);
  const slotPools = syncSlotPools(char);
  const slotEntries = (['spellcasting', 'pact'] as const).flatMap((pool) => Object.entries(slotPools[pool]).map(([lv, slot]) => ({ lv: Number(lv), slot, pool })));

  // dependem da ficha inteira: as contas são baratas e assim nunca mostram valor antigo (B-003)
  const allItemSpells = useMemo(() => itemGrantedSpells(char), [char]);
  // cajados e varinhas (cargas) ficam num bloco próprio; o resto segue como antes
  const chargeSpells = allItemSpells.filter((s) => s.charges);
  const itemSpells = allItemSpells.filter((s) => !s.charges);

  // magias "do personagem": preparadas (todas as classes) + grimório do mago (nível ≥1)
  const prepared = selection.preparedSpells;
  const spellbook = selection.knownSpells;

  // magias de Domínio/Juramento/Círculo: sempre preparadas, fora do limite
  const granted = useMemo(() => grantedSpellsForClass(char, classId), [char, classId]);
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
    const extra = expandedSpellIds(char, classId).map((id) => SPELL_BY_ID[id]).filter((sp) => sp && !base.includes(sp));
    return [...base, ...extra].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    // packs e hbSpells não aparecem na função, mas mudam a lista global que spellsForClass lê
  }, [listClass, char, classId, packs, hbSpells]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (fn: (c: typeof char) => void) => store.updateCharacter(char.id, fn as never);

  // esquecer: respeita as regras (troca ao subir de nível, truques fixos, grimório)
  const forgetInfo = (sp: Spell) => (freeMode || !st ? { block: null, usesSwap: false } : forgetBlock(st, sp));
  const removeSpell = (id: string) => {
    const sp = SPELL_BY_ID[id];
    if (!sp) return;
    const f = forgetInfo(sp);
    if (f.block) return;
    store.forgetSpell(char.id, id, f.usesSwap, classId);
  };

  // aprender/preparar (lista da classe) ou copiar para o grimório (mago, custa ouro)
  const learnSpell = (id: string, copy: boolean) => {
    const sp = SPELL_BY_ID[id];
    if (!sp) return;
    const field: 'knownSpells' | 'preparedSpells' = isWizard && sp.level >= 1 ? 'knownSpells' : 'preparedSpells';
    if (selection[field].includes(id)) return removeSpell(id);
    if (blockFor(sp, copy ? 'copy' : 'class')) return;
    if (copy) return store.copySpell(char.id, id, scrollCost(sp), classId);
    update((c) => {
      changeSpellSelection(c, classId, (s) => { s[field] = [...s[field], id]; });
    });
  };

  const togglePrepared = (id: string) => {
    const isOn = selection.preparedSpells.includes(id);
    if (!isOn && !freeMode && st && prepareBlock(st, false)) return;
    update((c) => {
      changeSpellSelection(c, classId, (s) => { s.preparedSpells = isOn ? s.preparedSpells.filter((x) => x !== id) : [...s.preparedSpells, id]; });
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

  // filtro por círculo, busca e favoritas (fixadas no topo)
  const favorites = char.favoriteSpells ?? [];
  const query = q.trim().toLocaleLowerCase('pt-BR');
  const matches = (sp: Spell) => !query || sp.name.toLocaleLowerCase('pt-BR').includes(query) || sp.school.toLocaleLowerCase('pt-BR').includes(query);
  const inFilter = (sp: Spell) => (circle === 'all' || sp.level === circle) && matches(sp);
  const favSpells = active.filter((sp) => favorites.includes(sp.id) && inFilter(sp));
  const groups: { key: string; label: string; spells: Spell[]; slot?: { max: number; used: number }; note?: string }[] = [
    ...(favSpells.length ? [{ key: 'fav', label: '★ Favoritas', spells: favSpells }] : []),
    ...byCircle
      .map(([lv, spells]) => ({
        key: String(lv),
        label: lv === 0 ? 'Truques' : `${lv}º círculo`,
        spells: spells.filter((sp) => inFilter(sp) && !favorites.includes(sp.id)),
        slot: lv > 0 && slotView[lv] ? { max: slotView[lv].max, used: slotView[lv].used } : undefined,
        note: lv === 0 ? 'à vontade' : undefined,
      }))
      .filter((g) => g.spells.length > 0),
  ];
  // concentração ativa: a magia que está sustentando ganha um brilho
  const concentratingOn = char.combat.concentration ? (char.combat.spellEffects ?? []).find((e) => e.until === 'concentration')?.spellId : undefined;
  const toggleFavorite = (id: string) =>
    update((c) => {
      const fav = c.favoriteSpells ?? [];
      c.favoriteSpells = fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id];
    });

  /** Uma magia: miniatura (com o preparar), nome inteiro, o essencial e Conjurar. */
  const renderRow = (sp: Spell) => {
    const grantSource = grantedFrom.get(sp.id);
    const learned = prepared.includes(sp.id) || spellbook.includes(sp.id);
    const isPrepared = prepared.includes(sp.id);
    const canPrepare = isWizard && sp.level >= 1 && !grantSource; // truques do mago sempre ativos
    const canCast = sp.level === 0 || !isWizard || isPrepared || !!grantSource || (sp.ritual && isWizard);
    const forget = learned ? forgetInfo(sp) : null;
    const fav = favorites.includes(sp.id);
    const art = spellArt(sp.id);
    // Arcano Místico (bruxo 11+): conjura sem espaço, 1× por descanso longo (contador do recurso)
    const arcanumId = sp.level >= 6 && (char.choices?.[`warlock.arcanum${sp.level}`] ?? []).includes(sp.id) ? `arcanum${sp.level}` : null;
    const arcanumLeft = arcanumId ? char.combat.resources?.[arcanumId] ?? 1 : 0;
    // Domínio de Magia (Mago 18º): à vontade no círculo base; Assinatura (20º): 1× por descanso curto sem espaço
    const wizFree = classId === 'wizard' ? wizardFreeCast(char, sp.id) : null;
    return (
      <div
        key={sp.id}
        className={'fv-spell-row' + (art ? ' has-art' : '') + (canPrepare && !isPrepared ? ' is-dormant' : '') + (concentratingOn === sp.id ? ' is-conc' : '') + (fav ? ' is-fav' : '')}
      >
        {art && <span className="fv-spell-bg" style={{ backgroundImage: `url("${art}")` }} aria-hidden />}
        {canPrepare && (
          <button
            type="button"
            className={'fv-spell-prep' + (isPrepared ? ' is-on' : '')}
            aria-pressed={isPrepared}
            aria-label={isPrepared ? `Despreparar ${sp.name}` : `Preparar ${sp.name}`}
            title={isPrepared ? 'Preparada hoje (toque para despreparar)' : 'Preparar para hoje'}
            onClick={() => togglePrepared(sp.id)}
          >
            {isPrepared ? '✓' : '+'}
          </button>
        )}
        <LoreTooltip info={spellLore(sp)} anchorStyle={{ flex: 1, minWidth: 0 }}>
          <span className="fv-spell-text">
            <span className="fv-spell-name">
              <SchoolIcon school={sp.school} size={13} className="fv-spell-school" />
              {sp.name}
            </span>
            <span className="fv-spell-meta">
              {grantSource && <span className="fv-spell-granted">sempre preparada · {grantSource}</span>}
              {arcanumId && <span className="fv-spell-granted">Arcano Místico · {arcanumLeft ? '1×/descanso longo' : 'usado · volta no descanso longo'}</span>}
              {wizFree?.kind === 'mastery' && <span className="fv-spell-granted">Domínio de Magia · à vontade no {sp.level}º círculo</span>}
              {wizFree?.kind === 'signature' && <span className="fv-spell-granted">Magia de Assinatura · {wizFree.left ? '1× sem espaço (descanso curto)' : 'grátis usada · volta no descanso curto'}</span>}
              {canPrepare && !isPrepared && <span className="fv-spell-granted is-muted">não preparada</span>}
              {sp.damage && <Mini c="#FF6A3D">{spellDamageLabel(sp, char.level)}</Mini>}
              {sp.heal && <Mini c="#3FC56B">cura</Mini>}
              {sp.save && <Mini c="#9BB0CC">save {ABILITY_SHORT[sp.save]}</Mini>}
              {sp.concentration && (
                <span className="fv-spell-ico is-conc" title="Concentração">
                  ◎<span className="fv-sr-only">concentração</span>
                </span>
              )}
              {sp.ritual && (
                <span className="fv-spell-ico is-ritual" title="Pode ser conjurada como ritual">
                  ❖<span className="fv-sr-only">ritual</span>
                </span>
              )}
              <AutoMini sp={sp} />
            </span>
          </span>
        </LoreTooltip>
        {canCast && arcanumId ? (
          arcanumLeft > 0 && (
            <SpellCastButton char={char} derived={castingDerived} castingClassId={classId} spell={sp} castMod={castMod} compact free onCast={() => store.setResource(char.id, arcanumId, arcanumLeft - 1)} />
          )
        ) : (
          canCast && (
            <>
              {wizFree && (wizFree.kind === 'mastery' || wizFree.left > 0) && (
                <SpellCastButton
                  char={char}
                  derived={castingDerived} castingClassId={classId}
                  spell={sp}
                  castMod={castMod}
                  compact
                  free
                  onCast={wizFree.kind === 'signature' ? () => store.setResource(char.id, wizFree.resId, 0) : undefined}
                />
              )}
              <SpellCastButton char={char} derived={castingDerived} castingClassId={classId} spell={sp} castMod={castMod} compact />
            </>
          )
        )}
        <span className="fv-spell-tools">
          <button
            type="button"
            className={'fv-spell-tool' + (fav ? ' is-on' : '')}
            aria-pressed={fav}
            aria-label={fav ? `Tirar ${sp.name} das favoritas` : `Fixar ${sp.name} nas favoritas`}
            title={fav ? 'Tirar das favoritas' : 'Fixar no topo (favorita)'}
            onClick={() => toggleFavorite(sp.id)}
          >
            <Icon name={fav ? 'starFill' : 'star'} size={14} />
          </button>
          {forget && !forget.block && (
            <button
              type="button"
              className="fv-spell-tool is-danger"
              onClick={() => removeSpell(sp.id)}
              aria-label={`Esquecer ${sp.name}`}
              title={forget.usesSwap ? 'Esquecer (usa sua troca de nível)' : kind === 'prepared' ? 'Despreparar' : 'Esquecer magia'}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="animate-riseIn fv-mag">
      {/* Espaços de magia + guia */}
      {kind !== 'none' && (
        <Panel full>
          {profiles.length > 1 && <label className="fv-label fv-mag-origin">
            Origem das magias
            <select className="fv-input" aria-label="Classe das magias" value={classId} onChange={(e) => { setSelectedClass(e.target.value); setLearn(false); setCircle('all'); setQ(''); }}>
              {profiles.map((p) => <option key={p.classId} value={p.classId}>{getClass(p.classId).label} · nível {p.level}</option>)}
            </select>
          </label>}
          <SectionLabel
            style={{ marginBottom: 6 }}
            right={
              <span className="fv-spell-dc" title="CD das salvaguardas contra suas magias · bônus de ataque com magia · atributo de conjuração">
                CD <b className="is-gold">{castingDerived.spellDC}</b>
                <i aria-hidden>·</i>
                <b className="is-acc">{castingDerived.spellAttack !== null ? modStr(castingDerived.spellAttack) : '—'}</b>
                <i aria-hidden>·</i>
                {ABILITY_SHORT[castAbility]}
              </span>
            }
          >
            Espaços de Magia
          </SectionLabel>

          <div className="fv-mag-guide">
            {st && st.cantrips.max > 0 && <GuideChip label="Truques" have={st.cantrips.have} target={st.cantrips.max} color="var(--color-accent)" />}
            {st?.known && <GuideChip label={isWizard ? 'grimório (grátis)' : 'conhecidas'} have={st.known.have} target={st.known.max} color="var(--color-metal)" />}
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
          <details className="fv-spell-rules">
            <summary>Como funciona</summary>
            <p className="fv-spell-rule-text">
              {kind === 'known'
                ? 'Você conhece um número fixo de magias da lista da sua classe. Ao subir de nível, aprende as novas e pode trocar UMA que já conhece.'
                : isWizard
                  ? 'Seu grimório ganha 2 magias grátis por nível (de círculos que você conjura). Outras podem ser copiadas de pergaminhos: 50 po por círculo. Prepare até INT + nível por dia.'
                  : 'Você conhece a lista inteira da classe e prepara magias todo dia (troca após descanso longo), até o limite.'}
            </p>
          </details>
          {!freeMode && st && st.swaps > 0 && kind === 'known' && (
            <div role="note" className="fv-spell-warn is-acc">
              <b>Troca disponível ({st.swaps}):</b> esqueça uma magia conhecida (✕ na lista) e aprenda outra da lista da classe.
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
            <div role="note" className={'fv-spell-warn' + (offSchool > caster.schools.free ? '' : ' is-calm')}>
              <b>{caster.via}:</b> magias de {caster.schools.allowed.join(' ou ')}.
              {' '}Fora dessas escolas: {offSchool} de {caster.schools.free} permitida{caster.schools.free === 1 ? '' : 's'} (uma a mais nos níveis 3, 8, 14 e 20).
            </div>
          )}

          {slotEntries.length === 0 && <div className="fv-mag-none">Sem espaços de magia neste nível (truques ainda funcionam).</div>}
          {slotEntries.map(({ lv, slot, pool }) => {
            return (
              <div key={`${pool}-${lv}`} className="fv-mag-slots">
                <LoreTooltip info={passiveLore(`${lv}º círculo${pool === 'pact' ? ' · Pacto' : ''}`, `${slot.max - slot.used}/${slot.max} disponíveis`, `Cada losango é um espaço. Gastos voltam após descanso ${pool === 'pact' ? 'curto ou longo' : 'longo'}.`, ['Magia', 'Recurso'])}>
                  <span className="fv-mag-slots-name">{lv}º círculo{pool === 'pact' ? ' · Pacto' : ''}</span>
                </LoreTooltip>
                <div className="fv-mag-slots-list">
                  {Array.from({ length: slot.max }, (_, i) => {
                    const filled = i >= slot.used;
                    return (
                      <span key={i} {...pressable(() => store.toggleSpellSlot(char.id, lv, i + 1, pool), `Espaço de ${lv}º círculo ${i + 1}: ${filled ? 'livre' : 'gasto'}`)}
                        className={'fv-mag-slot' + (filled ? ' is-on' : '')} />
                    );
                  })}
                </div>
                <span className="fv-mag-slots-n">{slot.max - slot.used} / {slot.max}</span>
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
          <SectionLabel>Magias de raça, itens, talentos e invocações</SectionLabel>
          <div className="fv-mag-items">
            {itemSpells.map((is) => (
              <div key={is.key} className="fv-mag-item">
                <LoreTooltip info={spellLore(is.spell)} anchorStyle={{ flex: 1, minWidth: 0 }}>
                  <span className="fv-mag-item-text">
                    <span className="fv-mag-item-name">{is.spell.name}</span>
                    <span className="fv-mag-item-src">de {is.itemName} · {is.recharge === 'atwill' ? 'à vontade' : `${is.usesMax}×/descanso ${is.recharge === 'short' ? 'curto' : 'longo'}`}</span>
                  </span>
                </LoreTooltip>
                {is.recharge !== 'atwill' && (
                  <span className={'fv-mag-uses' + (is.usesLeft > 0 ? ' is-on' : '')}>{is.usesLeft}/{is.usesMax}</span>
                )}
                {/* conjura de verdade (efeitos, PV temporários, CA, ataque/dano), sem gastar espaço */}
                {is.recharge === 'atwill' || is.usesLeft > 0 ? (
                  <SpellCastButton
                    char={char}
                    derived={derived}
                    spell={is.spell}
                    castMod={castMod}
                    free
                    compact
                    selfOnly={is.selfOnly}
                    onCast={is.recharge === 'atwill' ? undefined : () => store.useItemSpell(char.id, is.key)}
                  />
                ) : (
                  <span className="fv-cast-used">usada · volta no descanso</span>
                )}
              </div>
            ))}
          </div>
          <p className="fv-mag-help">Magias da raça, de talentos e de invocações conjuram sem gastar espaço (e aplicam o efeito na ficha); as de itens só valem com o item equipado ou sintonizado. Recarregam no descanso (curto/longo).</p>
        </Panel>
      )}

      {/* Magias do personagem */}
      {kind !== 'none' && (
        <Panel full>
          <SectionLabel
            right={
              <div className="fv-mag-actions">
                <button type="button" className="fv-mag-learn" onClick={() => setLearn('class')}>
                  + {learnLabel}
                </button>
                {isWizard && (
                  <button type="button" className="fv-mag-learn is-copy" onClick={() => setLearn('all')} title="Copiar uma magia de mago de um pergaminho ou outro grimório: 50 po por círculo">
                    📜 Copiar para o grimório
                  </button>
                )}
              </div>
            }
          >
            {isWizard ? 'Grimório' : kind === 'prepared' ? 'Magias Preparadas' : 'Magias Conhecidas'}
          </SectionLabel>

          {active.length === 0 && (
            <EmptyState icon="spark" title="Nenhuma magia ainda" hint={<>Use <b className="fv-mag-gold">+ {learnLabel}</b> para escolher da lista da sua classe — só aparecem liberadas as magias que você pode pegar agora.</>} />
          )}

          {active.length > 0 && (
            <div className="fv-spell-toolbar">
              <div className="fv-spell-filter" role="group" aria-label="Filtrar por círculo">
                <button type="button" className={circle === 'all' ? 'is-on' : ''} aria-pressed={circle === 'all'} onClick={() => setCircle('all')}>
                  Todas <small>{active.length}</small>
                </button>
                {byCircle.map(([lv, spells]) => (
                  <button key={lv} type="button" className={circle === lv ? 'is-on' : ''} aria-pressed={circle === lv} onClick={() => setCircle(circle === lv ? 'all' : lv)}>
                    {lv === 0 ? 'Truques' : `${lv}º`} <small>{spells.length}</small>
                  </button>
                ))}
              </div>
              {active.length > 8 && (
                <label className="fv-spell-search">
                  <Icon name="search" size={14} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar magia…" aria-label="Buscar magia" />
                </label>
              )}
            </div>
          )}

          {groups.map((g) => (
            <section key={g.key} className="fv-spell-group" aria-label={g.label}>
              <header className="fv-spell-group-head">
                <h3>{g.label}</h3>
                {g.slot ? (
                  <span className="fv-spell-group-slots" title={`${g.slot.max - g.slot.used} de ${g.slot.max} espaços livres`}>
                    {Array.from({ length: g.slot.max }, (_, i) => (
                      <i key={i} className={i >= g.slot!.used ? 'is-on' : ''} aria-hidden />
                    ))}
                    <span>
                      {g.slot.max - g.slot.used} livre{g.slot.max - g.slot.used === 1 ? '' : 's'}
                    </span>
                  </span>
                ) : g.note ? (
                  <span className="fv-spell-group-slots">{g.note}</span>
                ) : null}
                <span className="fv-spell-group-line" aria-hidden />
                <b>{g.spells.length}</b>
              </header>
              <div className="fv-spell-list">{g.spells.map(renderRow)}</div>
            </section>
          ))}
          {active.length > 0 && groups.length === 0 && <p className="fv-spell-empty">Nenhuma magia com “{q}”.</p>}
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
          onHomebrew={setHbSpell}
        />
      )}
      {hbSpell !== undefined && <HomebrewSpellEditor spell={hbSpell} defaultClass={listClass} onClose={() => setHbSpell(undefined)} />}
    </div>
  );
}

function GuideChip({ label, have, target, color }: { label: string; have: number; target: number; color: string }) {
  const over = have > target;
  return (
    <span className={'fv-mag-count' + (over ? ' is-over' : '')} style={{ '--c': color } as React.CSSProperties}>
      <span>{label}</span>
      <b>{have}</b>
      <span>/ {target}</span>
    </span>
  );
}

function Mini({ children, c }: { children: React.ReactNode; c?: string }) {
  const ink = useInk();
  return (
    <span className="fv-mag-mini" style={{ '--c': c ?? '#8B99B0', ...(c ? { color: ink(c) } : {}) } as React.CSSProperties}>
      {children}
    </span>
  );
}

/** Quanto da magia a ficha resolve (detalhe completo na dica). */
function AutoMini({ sp }: { sp: Spell }) {
  const level = spellAutomation(sp).level;
  // totalmente automática não precisa de aviso: só as que ainda pedem algo da mesa
  if (level === 'full') return null;
  const chip = AUTOMATION_CHIP[level];
  return (
    <span title={chip.title}>
      <Mini c={chip.color}>{chip.text}</Mini>
    </span>
  );
}
