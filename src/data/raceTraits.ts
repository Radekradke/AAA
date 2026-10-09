/**
 * O que cada traço racial faz — D&D 5e 2014 (Livro do Jogador), com palavras
 * próprias. A chave é o nome usado em races.ts (raça e sub-raça).
 */
export const RACE_TRAIT_INFO: Record<string, string> = {
  // Humano
  Versatilidade: '+1 em todos os atributos.',
  'Idioma adicional': 'Fala, lê e escreve um idioma extra à sua escolha.',
  // sentidos
  'Visão no Escuro': 'Até 18 m, enxerga na penumbra como em luz plena e no escuro como na penumbra (só em tons de cinza).',
  'Visão Superior no Escuro': 'Como a Visão no Escuro, mas até 36 m.',
  // Elfo
  'Sentidos Aguçados': 'Proficiência em Percepção.',
  'Ancestral Feérico': 'Vantagem nas salvaguardas para não ser enfeitiçado, e magia não consegue pôr você para dormir.',
  Transe: 'Medita 4 horas em vez de dormir 8 e termina o descanso longo do mesmo jeito.',
  'Treinamento Élfico com Armas': 'Proficiência com espada longa, espada curta, arco curto e arco longo.',
  'Truque de Mago': 'Um truque da lista do mago, conjurado com INT e à vontade (escolha nos Dons).',
  'Pés Ligeiros': 'Deslocamento base de 10,5 m.',
  'Máscara da Natureza': 'Pode tentar se esconder mesmo só levemente encoberto por folhagem, chuva forte, neve ou névoa.',
  'Sensibilidade à Luz Solar': 'Sob luz do sol direta: desvantagem nas jogadas de ataque e nos testes de Percepção que dependem da visão.',
  'Magia Drow': 'Globos de luz à vontade; fogo das fadas no 3º nível e escuridão no 5º, cada um 1× por descanso longo (CAR).',
  'Treinamento Drow com Armas': 'Proficiência com rapieira, espada curta e besta de mão.',
  // Anão
  'Resistência a veneno': 'Vantagem nas salvaguardas contra veneno e resistência a dano de veneno.',
  'Combate anão': 'Proficiência com machado de batalha, machadinha, martelo leve e martelo de guerra.',
  'Proficiência com Ferramentas': 'Ferramentas de ferreiro, suprimentos de cervejeiro ou ferramentas de pedreiro (escolha nos Dons).',
  'Especialização em Rochas': 'Em testes de História sobre trabalhos em pedra, conta como proficiente e soma o dobro do bônus.',
  'Tenacidade Anã': '+1 PV máximo por nível.',
  'Treinamento Anão com Armaduras': 'Proficiência com armaduras leves e médias.',
  // Halfling
  Sortudo: 'Tirou 1 no d20 num ataque, teste ou salvaguarda? Role de novo e fique com o novo resultado.',
  Bravura: 'Vantagem nas salvaguardas para não ficar amedrontado.',
  'Agilidade Halfling': 'Pode passar pelo espaço de qualquer criatura de tamanho maior que o seu.',
  'Furtividade Natural': 'Pode tentar se esconder atrás de uma criatura pelo menos um tamanho maior que você.',
  'Resiliência Robusta': 'Vantagem nas salvaguardas contra veneno e resistência a dano de veneno.',
  // Meio-Elfo / Meio-Orc
  'Versatilidade em Perícias': 'Proficiência em duas perícias à sua escolha.',
  'Resistência Implacável': 'Ao cair a 0 PV sem morrer na hora, fica com 1 PV (1× por descanso longo).',
  'Ataques Selvagens': 'No acerto crítico com arma corpo a corpo, rola mais um dado de dano da arma.',
  Ameaçador: 'Proficiência em Intimidação.',
  // Gnomo
  'Astúcia Gnômica': 'Vantagem nas salvaguardas de INT, SAB e CAR contra magia.',
  'Ilusionista Nato': 'Conhece o truque ilusão menor (INT).',
  'Falar com Bestas Pequenas': 'Comunica ideias simples a bestas Pequenas ou menores, por sons e gestos.',
  'Conhecimento de Artífice': 'Em testes de História sobre itens mágicos, alquímicos ou mecanismos, soma o dobro da proficiência.',
  Engenhoqueiro: 'Proficiência com ferramentas de funileiro; monta pequenos mecanismos (brinquedo, isqueiro, caixinha de música).',
  // Tiefling
  'Resistência a fogo': 'Resistência a dano de fogo.',
  'Legado Infernal': 'Taumaturgia à vontade; repreensão infernal no 3º nível e escuridão no 5º, cada uma 1× por descanso longo (CAR).',
  // Draconato
  'Ancestral Dracônico': 'A cor do seu dragão define o tipo de dano do Sopro e a sua resistência.',
  Sopro: 'Ação: 2d6 do tipo do seu dragão numa área (CD 8 + CON + proficiência; metade se passar). 3d6 no 6º nível, 4d6 no 11º, 5d6 no 16º. Volta no descanso curto ou longo.',
  'Resistência a Dano': 'Resistência ao tipo de dano do seu ancestral dracônico.',
};

/** Descrição de um traço racial oficial (entende "Sopro (fogo)"). */
export function raceTraitInfo(name: string): string | undefined {
  return RACE_TRAIT_INFO[name] ?? RACE_TRAIT_INFO[name.replace(/ \(.*\)$/, '')];
}
