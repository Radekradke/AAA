/**
 * Condições de D&D 5e (2014) com resumos parafraseados em português.
 * Fonte de verdade única — usada pela Mesa, Descanso e tooltips.
 */
export interface ConditionDef {
  id: string;
  label: string;
  /** Resumo curto exibido no chip ativo da Mesa. */
  short: string;
  /** Descrição completa (tooltip). */
  desc: string;
}

export const CONDITIONS: ConditionDef[] = [
  { id: 'Agarrado', label: 'Agarrado', short: 'Deslocamento 0', desc: 'Seu deslocamento fica 0 enquanto algo mantém você preso. Termina se você escapar ou o agarrador for afastado.' },
  { id: 'Amedrontado', label: 'Amedrontado', short: 'Desvantagem perto da fonte', desc: 'Desvantagem em testes e ataques enquanto a fonte do medo estiver à vista; você não se aproxima voluntariamente dela.' },
  { id: 'Atordoado', label: 'Atordoado', short: 'Sem ações/reações', desc: 'Você fica incapacitado, falha em salvaguardas de FOR e DES e ataques contra você têm vantagem.' },
  { id: 'Caído', label: 'Caído', short: 'No chão', desc: 'Ataques corpo a corpo próximos têm vantagem contra você; seus ataques sofrem desvantagem. Levantar custa metade do movimento.' },
  { id: 'Cego', label: 'Cego', short: 'Não enxerga', desc: 'Falha em testes que exigem visão; ataques contra você têm vantagem e os seus, desvantagem.' },
  { id: 'Enfeitiçado', label: 'Enfeitiçado', short: 'Não ataca o encantador', desc: 'Você não pode atacar quem o enfeitiçou, e essa criatura tem vantagem em interações sociais com você.' },
  { id: 'Envenenado', label: 'Envenenado', short: 'Desvantagem em ataques/testes', desc: 'Desvantagem em jogadas de ataque e testes de atributo enquanto o veneno durar.' },
  { id: 'Exausto', label: 'Exausto', short: 'Níveis de exaustão', desc: 'Efeitos cumulativos por nível (2014): 1 desvantagem em testes; 2 metade do deslocamento; 3 desvantagem em ataques/salvaguardas; 4 metade do PV máx; 5 deslocamento 0; 6 morte. Descanso longo remove 1 nível.' },
  { id: 'Impedido', label: 'Impedido', short: 'Deslocamento 0', desc: 'Deslocamento 0; ataques contra você têm vantagem, os seus e salvaguardas de DES sofrem desvantagem.' },
  { id: 'Incapacitado', label: 'Incapacitado', short: 'Sem ações/reações', desc: 'Você não pode realizar ações nem reações.' },
  { id: 'Inconsciente', label: 'Inconsciente', short: 'Caído e indefeso', desc: 'Você cai, fica incapacitado, solta o que segura e não percebe o ambiente. Ataques próximos que acertam são críticos.' },
  { id: 'Invisível', label: 'Invisível', short: 'Não pode ser visto', desc: 'Ataques contra você têm desvantagem; os seus têm vantagem. Você ainda pode ser ouvido e deixar rastros.' },
  { id: 'Paralisado', label: 'Paralisado', short: 'Imóvel e indefeso', desc: 'Incapacitado e imóvel; falha em salvaguardas de FOR e DES; ataques próximos que acertam são críticos.' },
  { id: 'Petrificado', label: 'Petrificado', short: 'Virou pedra', desc: 'Você e seus pertences viram pedra. Incapacitado, não envelhece, resistência a todo dano e imune a veneno/doença.' },
  { id: 'Restringido', label: 'Restringido', short: 'Preso no lugar', desc: 'Deslocamento 0; ataques contra você têm vantagem, os seus e salvaguardas de DES sofrem desvantagem.' },
  { id: 'Surdo', label: 'Surdo', short: 'Não ouve', desc: 'Você falha automaticamente em qualquer teste que dependa de audição.' },
];

export const CONDITION_BY_ID: Record<string, ConditionDef> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c]),
);

export function getCondition(id: string): ConditionDef | undefined {
  return CONDITION_BY_ID[id];
}
