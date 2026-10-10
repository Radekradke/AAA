import type { Spell } from '@/types/dnd';
import { ABILITY_SHORT } from '@/data/skills';
import { damageRoll, damageTiming, healRoll, hpPool, isFixedRoll } from './spellCast';
import { spellOutcome } from './spellEffects';

/**
 * O que a ficha faz ao conjurar — e o que fica com a mesa. Ter a magia
 * cadastrada não quer dizer que todo o efeito é automático: este resumo
 * diz, magia a magia, o que a ficha aplica sozinha, o que ela só rola e o
 * que o mestre resolve. Assim ninguém confia numa automação que não houve.
 *
 * - `auto`: a ficha aplica sozinha (CA, PV temporários, concentração…).
 * - `roll`: a ficha rola os dados; o resultado vai para a mesa.
 * - `table`: depende da mesa — o mestre aplica ou o jogador anota.
 */
export type AutomationKind = 'auto' | 'roll' | 'table';

export interface AutomationLine {
  kind: AutomationKind;
  text: string;
  /** Linha que vale para qualquer magia (espaço, concentração): não conta como efeito. */
  generic?: boolean;
}

/** Nível geral: tudo resolvido, parte resolvida ou só descrito. */
export type AutomationLevel = 'full' | 'partial' | 'manual';

export interface SpellAutomation {
  level: AutomationLevel;
  lines: AutomationLine[];
}

export const AUTOMATION_LEVEL_LABEL: Record<AutomationLevel, string> = {
  full: 'Automática',
  partial: 'Automação parcial',
  manual: 'Resolvida na mesa',
};

export const AUTOMATION_KIND_LABEL: Record<AutomationKind, string> = {
  auto: 'A ficha aplica',
  roll: 'A ficha rola',
  table: 'Fica com a mesa',
};

/** Magias que ligam um dano extra nos seus ataques (Bruxaria, Marca do Caçador). */
const MARKS: Record<string, string> = {
  'phb-hex': 'Liga +1d6 necrótico nos seus ataques contra o alvo',
  'phb-hunters-mark': 'Liga +1d6 nos seus ataques com arma contra o alvo',
};

export function spellAutomation(sp: Spell): SpellAutomation {
  const lines: AutomationLine[] = [];
  // valores neutros: só importa QUE a ficha aplica algo, não quanto
  const out = spellOutcome(sp, Math.max(1, sp.level), 3);
  const pool = hpPool(sp, sp.level);
  const save = sp.save ? ABILITY_SHORT[sp.save] : null;

  if (sp.level > 0) lines.push({ kind: 'auto', text: 'Desconta o espaço de magia e marca o uso no turno', generic: true });
  if (sp.concentration) lines.push({ kind: 'auto', text: 'Liga a concentração (e encerra a anterior)', generic: true });

  const dmg = sp.damage ? damageRoll(sp, Math.max(1, sp.level), 1, null, 3) : null;
  const timing = damageTiming(sp);
  if (sp.attack && dmg && !isFixedRoll(dmg)) lines.push({ kind: 'roll', text: 'Rola o ataque e, se você confirmar o acerto, o dano' });
  else if (sp.attack) {
    lines.push({ kind: 'roll', text: 'Rola o ataque de magia' });
    lines.push({ kind: 'table', text: 'O efeito no alvo é resolvido com o mestre' });
  } else if (sp.damage && !dmg) {
    lines.push({ kind: 'table', text: `Dano variável (${sp.damage.dice}): role com o mestre` });
  } else if (sp.damage && dmg && isFixedRoll(dmg)) {
    lines.push({ kind: 'auto', text: `Mostra o dano fixo (${dmg.bonus} ${sp.damage.type}), sem rolagem` });
  } else if (sp.damage && timing === 'rider') {
    lines.push({ kind: 'roll', text: `Não rola ao conjurar: deixa um botão para rolar ${sp.damage.dice} no acerto (em Efeitos ativos)` });
    lines.push({ kind: 'table', text: 'Você soma esse dano ao do ataque' });
  } else if (sp.damage && timing === 'trigger') {
    lines.push({ kind: 'roll', text: `Não rola ao conjurar: deixa um botão para rolar ${sp.damage.dice} quando alguém entra ou começa o turno na área` });
  } else if (sp.damage && timing === 'now') {
    lines.push({ kind: 'roll', text: `Rola o dano (${sp.damage.dice} ${sp.damage.type})` });
  }
  if (save) lines.push({ kind: 'table', text: `O alvo faz salvaguarda de ${save} contra a sua CD; o mestre aplica o resultado` });

  if (pool) lines.push({ kind: 'roll', text: 'Rola o total de PV afetados; quem cai é decidido na mesa' });

  const heal = sp.heal ? healRoll(sp, Math.max(1, sp.level), 3) : null;
  if (heal) {
    lines.push(isFixedRoll(heal) ? { kind: 'auto', text: `Cura ${heal.bonus} PV, sem rolagem` } : { kind: 'roll', text: 'Rola a cura' });
    lines.push({ kind: 'auto', text: 'Em você, cura com um toque; em outra criatura, avise a mesa' });
  } else if (sp.heal && !out) {
    lines.push({ kind: 'table', text: `Cura descrita no texto (${sp.heal}): aplique com o mestre` });
  }

  if (out) {
    const e = out.effect;
    if (out.tempHp) lines.push({ kind: 'auto', text: 'Aplica os PV temporários' });
    if (e?.ac || e?.acBase || e?.acMin) lines.push({ kind: 'auto', text: 'Aplica a CA automaticamente' });
    if (e?.speed || e?.speedDouble) lines.push({ kind: 'auto', text: 'Ajusta o deslocamento' });
    if (e?.maxHp) lines.push({ kind: 'auto', text: 'Aumenta o PV máximo e o atual' });
    if (e?.tempPerTurn) lines.push({ kind: 'auto', text: 'Renova os PV temporários a cada turno' });
    if (e) {
      const numeric = e.ac || e.acBase || e.acMin || e.speed || e.speedDouble || e.maxHp || e.tempPerTurn;
      if (!numeric) lines.push({ kind: 'table', text: `Fica marcado na ficha (“${e.label}”), mas você soma nas rolagens` });
      lines.push({ kind: 'auto', text: e.until === 'turn' ? 'Sai sozinho no seu próximo turno' : e.until === 'concentration' ? 'Sai sozinho quando a concentração acaba' : 'Sai sozinho no descanso longo' });
    }
    if (out.target === 'choose') lines.push({ kind: 'table', text: 'Em outra criatura, a ficha não aplica: anote com o mestre' });
  }

  if (MARKS[sp.id]) lines.push({ kind: 'auto', text: MARKS[sp.id] });

  if (sp.conditions?.length) lines.push({ kind: 'table', text: `Condição no alvo (${sp.conditions.join(', ')}): o mestre aplica` });

  const doesSomething = lines.some((l) => !l.generic && (l.kind === 'roll' || l.kind === 'auto'));
  if (!doesSomething) lines.push({ kind: 'table', text: 'Efeito descrito no texto: o mestre resolve na mesa' });

  const hasTable = lines.some((l) => l.kind === 'table');
  const level: AutomationLevel = !doesSomething ? 'manual' : hasTable ? 'partial' : 'full';
  return { level, lines };
}

/** Selo curto para a linha da magia (com o mesmo sentido da dica). */
export const AUTOMATION_CHIP: Record<AutomationLevel, { text: string; color: string; title: string }> = {
  full: { text: '✓ automática', color: '#3FC56B', title: 'A ficha resolve o que cabe a ela ao conjurar' },
  partial: { text: '◐ parcial', color: '#FFC857', title: 'A ficha rola ou aplica uma parte; o resto fica com a mesa' },
  manual: { text: '✋ na mesa', color: '#8B99B0', title: 'A ficha só registra o uso: o efeito é resolvido com o mestre' },
};
