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
  { id: 'Agarrado', label: 'Agarrado', short: 'Deslocamento 0', desc: 'Seu deslocamento fica 0 e não recebe bônus. Termina se quem agarra ficar incapacitado ou se algo afastar você do alcance dele.' },
  { id: 'Amedrontado', label: 'Amedrontado', short: 'Desvantagem perto da fonte', desc: 'Desvantagem em testes de atributo e jogadas de ataque enquanto a fonte do medo estiver à vista; você não se aproxima dela por vontade própria.' },
  { id: 'Atordoado', label: 'Atordoado', short: 'Sem ações/reações', desc: 'Incapacitado, não se move e fala com dificuldade. Falha automaticamente em salvaguardas de FOR e DES; ataques contra você têm vantagem.' },
  { id: 'Caído', label: 'Caído', short: 'No chão', desc: 'Só rasteja (ou levanta gastando metade do deslocamento). Seus ataques têm desvantagem. Ataques contra você a até 1,5 m têm vantagem; de mais longe, desvantagem.' },
  { id: 'Cego', label: 'Cego', short: 'Não enxerga', desc: 'Falha em testes que exigem visão; ataques contra você têm vantagem e os seus, desvantagem.' },
  { id: 'Enfeitiçado', label: 'Enfeitiçado', short: 'Não ataca o encantador', desc: 'Você não pode atacar quem o enfeitiçou nem mirá-lo com efeitos nocivos, e essa criatura tem vantagem em testes sociais com você.' },
  { id: 'Envenenado', label: 'Envenenado', short: 'Desvantagem em ataques/testes', desc: 'Desvantagem em jogadas de ataque e testes de atributo enquanto o veneno durar.' },
  { id: 'Exausto', label: 'Exausto', short: 'Níveis de exaustão', desc: 'Efeitos cumulativos por nível (2014): 1 desvantagem em testes; 2 metade do deslocamento; 3 desvantagem em ataques/salvaguardas; 4 metade do PV máx; 5 deslocamento 0; 6 morte. Descanso longo (com comida e água) remove 1 nível.' },
  { id: 'Impedido', label: 'Impedido', short: 'Preso no lugar', desc: 'Deslocamento 0. Ataques contra você têm vantagem; seus ataques e suas salvaguardas de DES têm desvantagem.' },
  { id: 'Incapacitado', label: 'Incapacitado', short: 'Sem ações/reações', desc: 'Você não pode realizar ações nem reações.' },
  { id: 'Inconsciente', label: 'Inconsciente', short: 'Caído e indefeso', desc: 'Incapacitado, não se move nem fala, solta o que segura e cai. Falha em salvaguardas de FOR e DES; ataques contra você têm vantagem e, a até 1,5 m, acertos são críticos.' },
  { id: 'Invisível', label: 'Invisível', short: 'Não pode ser visto', desc: 'Só é visto com magia ou sentido especial (conta como fortemente obscurecido). Ataques contra você têm desvantagem; os seus têm vantagem.' },
  { id: 'Paralisado', label: 'Paralisado', short: 'Imóvel e indefeso', desc: 'Incapacitado, não se move nem fala. Falha em salvaguardas de FOR e DES; ataques contra você têm vantagem e, a até 1,5 m, acertos são críticos.' },
  { id: 'Petrificado', label: 'Petrificado', short: 'Virou pedra', desc: 'Você e o que veste viram pedra (peso ×10). Incapacitado, não se move nem fala; ataques contra você têm vantagem; falha em salvaguardas de FOR e DES; resistência a todo dano; imune a veneno e doença.' },
  { id: 'Surdo', label: 'Surdo', short: 'Não ouve', desc: 'Você falha automaticamente em qualquer teste que dependa de audição.' },
];

export const CONDITION_BY_ID: Record<string, ConditionDef> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c]),
);
// "Restringido" era um nome duplicado de Impedido (Restrained): fichas antigas continuam lendo
CONDITION_BY_ID['Restringido'] = CONDITION_BY_ID['Impedido'];

export function getCondition(id: string): ConditionDef | undefined {
  return CONDITION_BY_ID[id];
}
