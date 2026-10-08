import type { StepProps } from './stepTypes';
import type { Spell } from '@/types/dnd';
import type { ChoiceOption } from '@/data/classChoices';
import { StepHeader } from './creatorUi';
import { ChoicePicker } from '@/components/sheet/ChoicePicker';
import { getClass } from '@/data/classes';
import { getSpell } from '@/data/spells';
import { ABILITY_LABELS } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { STEP_SPELLS } from '@/engine/creationSummary';
import { creationSpellPlan, suggestCreationSpells } from '@/engine/creationSpells';
import type { SpellPick } from '@/engine/creationSpells';

/** Uma linha curta do efeito (a carta inteira fica na aba Magias). */
function short(sp: Spell): string {
  const meta = [sp.castingTime, sp.range].filter(Boolean).join(' · ');
  const first = (sp.desc ?? '').split(/(?<=[.!?])\s/)[0] ?? '';
  const text = first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
  return [meta, text].filter(Boolean).join(' — ');
}

function tagOf(sp: Spell): string | undefined {
  if (sp.damage) return `${sp.damage.dice} ${sp.damage.type}`;
  if (sp.heal) return `cura ${sp.heal}`;
  if (sp.concentration) return 'concentração';
  if (sp.ritual) return 'ritual';
  return sp.school.toLowerCase();
}

const options = (p: SpellPick): ChoiceOption[] => p.pool.map((sp) => ({ id: sp.id, label: sp.name, tag: tagOf(sp), desc: short(sp) }));

/**
 * Capítulo VI — Magias (só para quem conjura no 1º nível): truques e magias
 * escolhidos já na criação, nos limites da classe. Chega com a sugestão
 * clássica de cada classe; tudo dá para trocar aqui mesmo.
 */
export function StepSpells({ char, update }: StepProps) {
  const plan = creationSpellPlan(char);
  const cls = getClass(char.classId);
  if (!plan) {
    return (
      <div className="fv-step">
        <StepHeader step={STEP_SPELLS} char={char} />
        <p className="fv-step-note">O {cls.label} não conjura magias no 1º nível.</p>
      </div>
    );
  }

  const ability = ABILITY_LABELS[plan.ability as keyof typeof ABILITY_LABELS] ?? plan.ability;
  const level = (id: string) => getSpell(id)?.level ?? -1;
  // troca só o grupo editado; o resto da lista (truques, magias de graça) fica
  const setPrepared = (pool: SpellPick, next: string[]) =>
    update((c) => {
      const inPool = new Set(pool.pool.map((s) => s.id));
      c.preparedSpells = [...c.preparedSpells.filter((id) => !inPool.has(id)), ...next];
    });
  const setBook = (next: string[]) =>
    update((c) => {
      c.knownSpells = next;
      // preparada que saiu do grimório deixa de estar preparada
      c.preparedSpells = c.preparedSpells.filter((id) => level(id) < 1 || next.includes(id) || plan.free.some((f) => f.id === id));
    });

  const spellsLabel = plan.kind === 'known' ? 'Magias conhecidas (1º círculo)' : plan.kind === 'prepared' ? 'Magias preparadas (1º círculo)' : 'Grimório (1º círculo)';
  const spellsHint =
    plan.kind === 'known'
      ? `O ${cls.label} conhece ${plan.spells.max} magias e só troca uma ao subir de nível.`
      : plan.kind === 'prepared'
        ? `Você conhece a lista inteira; prepara ${plan.spells.max} por dia (${ability} ${modStr(plan.mod)} + nível). Dá para trocar depois de um descanso longo, na aba Magias.`
        : `Seis magias de mago no grimório. Outras entram depois copiando de pergaminhos (50 po por círculo).`;
  const subtitle =
    `${cls.label}: ${plan.cantrips.max} truques e ${plan.spells.max} ${plan.kind === 'known' ? 'magias conhecidas' : plan.kind === 'prepared' ? 'preparadas' : 'magias no grimório'}` +
    ` · conjura com ${ability} (${modStr(plan.mod)}).`;

  return (
    <div className="fv-step fv-spells-step">
      <StepHeader step={STEP_SPELLS} char={char} subtitle={subtitle} />

      {plan.free.length > 0 && (
        <p className="fv-detail-due fv-spells-free">
          Já vêm prontas, sem contar no limite:{' '}
          {plan.free.map((f) => `${getSpell(f.id)?.name ?? f.id} (${f.source})`).join(' · ')}
        </p>
      )}

      {plan.cantrips.max > 0 && (
        <ChoicePicker
          label="Truques"
          hint="À vontade, sem gastar espaço de magia. Truques não se trocam depois."
          options={options(plan.cantrips)}
          taken={[]}
          need={plan.cantrips.max}
          value={plan.cantrips.chosen}
          onChange={(next) => setPrepared(plan.cantrips, next)}
        />
      )}

      <ChoicePicker
        label={spellsLabel}
        hint={spellsHint}
        options={options(plan.spells)}
        taken={[]}
        need={plan.spells.max}
        value={plan.spells.chosen}
        onChange={(next) => (plan.kind === 'spellbook' ? setBook(next) : setPrepared(plan.spells, next))}
      />

      {plan.prepared && (
        <ChoicePicker
          label="Preparadas hoje"
          hint={`Das magias do grimório, você prepara ${plan.prepared.max} por dia (${ability} ${modStr(plan.mod)} + nível). Muda depois de um descanso longo.`}
          options={options(plan.prepared)}
          taken={[]}
          need={plan.prepared.max}
          value={plan.prepared.chosen}
          onChange={(next) => setPrepared(plan.prepared!, next)}
        />
      )}

      <div className="fv-kit-actions">
        <button type="button" className="fv-link-btn" onClick={() => update((c) => suggestCreationSpells(c))}>
          Usar a sugestão do {cls.label}
        </button>
      </div>
    </div>
  );
}
