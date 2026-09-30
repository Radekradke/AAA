/**
 * O que cada característica de classe faz — D&D 5e 2014, resumido com
 * palavras próprias (sem texto oficial). A chave é o nome exato usado em
 * classFeatures.ts / subclasses.ts. Características sem entrada aparecem
 * só com o nome.
 */
export const FEATURE_INFO: Record<string, string> = {
  /* ---------- comuns ---------- */
  'Aumento de Atributo': '+2 em um atributo ou +1 em dois (máximo 20) — ou um talento, se a mesa permitir.',

  /* ---------- Feiticeiro ---------- */
  'Conjuração': 'Conjura magias da sua classe. Veja a aba Magias para CD, bônus de ataque e espaços.',
  'Origem de Feitiçaria (subclasse)': 'A fonte do seu poder inato: Linhagem Dracônica ou Magia Selvagem. Dá características nos níveis 1, 6, 14 e 18.',
  'Fonte de Magia': 'Pontos de Feitiçaria iguais ao seu nível de feiticeiro (voltam no descanso longo). Conjuração Flexível — ação bônus: transforma pontos em espaço de magia (1º círculo = 2 pontos, 2º = 3, 3º = 5, 4º = 6, 5º = 7; o espaço criado some no descanso longo) ou um espaço em pontos (pontos = círculo).',
  'Metamagia (2 opções)': 'Aprende 2 formas de moldar magias gastando Pontos de Feitiçaria. Só uma Metamagia por magia, salvo quando a opção diz o contrário.',
  'Metamagia (+1)': 'Aprende mais uma opção de Metamagia.',
  'Restauração Feiticeira': 'Ao terminar um descanso curto, recupera 4 Pontos de Feitiçaria gastos.',
  'Ancestral Dragão': 'Escolha o dragão da sua linhagem (define o tipo de dano ligado a ela). Você fala Dracônico e dobra a proficiência em testes de Carisma ao lidar com dragões.',
  'Resiliência Dracônica': '+1 PV máximo por nível de feiticeiro. Sem armadura, sua CA é 13 + DES (escudo soma).',
  'Afinidade Elemental': 'Ao conjurar magia que cause o dano da sua linhagem, soma CAR a uma jogada de dano dela. Pode gastar 1 Ponto de Feitiçaria para ter resistência a esse dano por 1 hora.',
  'Asas Dracônicas': 'Ação bônus: asas surgem das costas e você ganha deslocamento de voo igual ao seu deslocamento. Some com outra ação bônus; armadura sem abertura impede.',
  'Presença Dracônica': 'Ação: gaste 5 Pontos de Feitiçaria e irradie por 1 minuto (concentração) uma aura de 18 m de temor ou fascínio; hostis fazem salvaguarda de SAB ou ficam amedrontados/encantados.',
  'Surto de Magia Selvagem': 'Depois de conjurar magia de 1º círculo ou maior, o mestre pode pedir que role 1d20; num 1, role na tabela de Surto de Magia Selvagem.',
  'Marés do Caos': 'Ganha vantagem em uma jogada de ataque, teste ou salvaguarda. Volta no descanso longo — ou antes, se o mestre provocar um surto.',
  'Distorcer o Destino': 'Reação: gaste 2 Pontos de Feitiçaria para somar ou subtrair 1d4 da jogada de ataque, teste ou salvaguarda de uma criatura que você vê.',
  'Caos Controlado': 'Quando rola na tabela de Surto de Magia Selvagem, rola duas vezes e escolhe o resultado.',
  'Bombardeio de Magia': 'Ao rolar dano de uma magia, escolha um dado que saiu no máximo: role-o de novo e some. Uma vez por turno.',

  /* ---------- Guerreiro ---------- */
  'Estilo de Luta': 'Uma especialidade de combate — veja sua escolha em "Escolhas".',
  'Retomar o Fôlego': 'Ação bônus: recupera 1d10 + nível de guerreiro em PV. Uma vez por descanso curto ou longo.',
  'Surto de Ação (1 uso)': 'No seu turno, ganha uma ação a mais. Uma vez por descanso curto ou longo.',
  'Surto de Ação (2 usos)': 'Pode usar o Surto de Ação duas vezes entre descansos, mas só uma vez por turno.',
  'Arquétipo Marcial (subclasse)': 'Campeão, Mestre de Batalha ou Cavaleiro Arcano. Dá características nos níveis 3, 7, 10, 15 e 18.',
  'Ataque Extra': 'Ataca duas vezes quando usa a ação de Ataque.',
  'Ataque Extra (2)': 'Ataca três vezes quando usa a ação de Ataque.',
  'Ataque Extra (3)': 'Ataca quatro vezes quando usa a ação de Ataque.',
  'Indomável (1 uso)': 'Rola de novo uma salvaguarda que falhou e fica com o novo resultado. Uma vez por descanso longo.',
  'Indomável (2 usos)': 'Indomável passa a ter 2 usos por descanso longo.',
  'Indomável (3 usos)': 'Indomável passa a ter 3 usos por descanso longo.',
  'Crítico Aprimorado (19-20)': 'Seus ataques com arma causam acerto crítico com 19 ou 20 no d20.',
  'Atleta Notável': 'Soma metade da proficiência (arredondada para cima) em testes de FOR, DES e CON em que não é proficiente. Salto em distância com corrida vai mais longe (+FOR × 30 cm).',
  'Estilo de Luta Adicional': 'Escolha um segundo Estilo de Luta.',
  'Crítico Superior (18-20)': 'Seus ataques com arma causam acerto crítico com 18, 19 ou 20.',
  'Sobrevivente': 'No início de cada turno, se tiver no máximo metade dos PV (e mais de 0), recupera 5 + mod. de CON.',
  'Superioridade em Combate': 'Aprende 3 manobras e ganha 4 dados de superioridade (d8), gastos um por manobra. Voltam em descanso curto ou longo. CD das manobras = 8 + proficiência + FOR ou DES.',
  'Estudioso da Guerra': 'Proficiência com um tipo de ferramenta de artesão à sua escolha.',
  'Conhecer o Inimigo': 'Observando ou interagindo com uma criatura por 1 minuto fora de combate, descobre se ela é superior, igual ou inferior a você em duas características (FOR, DES, CON, CA, PV atuais, níveis de classe…).',
  'Manobras (+2)': 'Aprende mais 2 manobras e pode trocar uma que já sabe por outra.',
  'Dado de Superioridade (5º)': 'Ganha um 5º dado de superioridade.',
  'Dado de Superioridade (6º)': 'Ganha um 6º dado de superioridade.',
  'Superioridade Aprimorada (d10)': 'Seus dados de superioridade viram d10.',
  'Superioridade Aprimorada (d12)': 'Seus dados de superioridade viram d12.',
  'Implacável': 'Ao rolar iniciativa sem nenhum dado de superioridade, recupera 1.',
  'Conjuração (Cavaleiro Arcano)': 'Conjura magias da lista de mago com Inteligência (um terço de conjurador). Quase todas precisam ser de abjuração ou evocação; nos níveis 3, 8, 14 e 20 uma pode ser de qualquer escola. Ao subir de nível pode trocar 1 magia conhecida.',
  'Vínculo com Arma': 'Ritual de 1 hora com até duas armas: ninguém consegue desarmar você delas, e você as invoca para a mão com uma ação bônus (no mesmo plano).',
  'Magia de Guerra': 'Ao usar a ação para conjurar um truque, pode fazer um ataque com arma como ação bônus.',
  'Golpe Arcano': 'Ao acertar uma criatura com arma, ela tem desvantagem na próxima salvaguarda contra uma magia sua até o fim do seu próximo turno.',
  'Truque adicional': 'Aprende mais um truque de mago.',
  'Investida Arcana': 'Ao usar o Surto de Ação, pode se teleportar até 9 m para um espaço livre que vê, antes ou depois da ação extra.',
  'Magia de Guerra Aprimorada': 'Ao usar a ação para conjurar uma magia (não só truque), pode fazer um ataque com arma como ação bônus.',
};

export function featureInfo(name: string): string | undefined {
  // "Afinidade Elemental (Linhagem Dracônica)" → "Afinidade Elemental"
  return FEATURE_INFO[name] ?? FEATURE_INFO[name.replace(/ \([^)]*\)$/, '')];
}
