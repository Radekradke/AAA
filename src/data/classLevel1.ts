/**
 * O que cada classe ganha no 1º nível — D&D 5e 2014 (Livro do Jogador), em
 * palavras próprias e no tamanho do painel da criação. "{sub}" vira a lista
 * de subclasses disponíveis (muda com os pacotes de conteúdo ligados).
 */
export const CLASS_LEVEL1: Record<string, { name: string; desc: string }[]> = {
  barbarian: [
    { name: 'Fúria', desc: 'Ação bônus, 2× por descanso longo, dura 1 min: +2 no dano corpo a corpo com FOR, vantagem em testes e salvaguardas de FOR e metade do dano de concussão, cortante e perfurante. Sem armadura pesada e sem conjurar.' },
    { name: 'Defesa sem Armadura', desc: 'Sem armadura: CA = 10 + DES + CON (o escudo soma).' },
  ],
  bard: [
    { name: 'Conjuração', desc: 'Conjura com CAR: 2 truques e 4 magias conhecidas de 1º círculo (escolha no capítulo Magias). Instrumento musical serve de foco.' },
    { name: 'Inspiração de Bardo (d6)', desc: 'Ação bônus: um aliado que ouve você ganha 1d6 para somar a um ataque, teste ou salvaguarda. Usos = mod. de CAR por descanso longo.' },
  ],
  cleric: [
    { name: 'Conjuração', desc: 'Conjura com SAB: 3 truques; todo dia prepara SAB + nível magias da lista inteira do clérigo. Símbolo sagrado serve de foco.' },
    { name: 'Domínio Divino', desc: 'Escolhido no capítulo Dons ({sub}): magias de domínio sempre preparadas e poderes já no 1º nível.' },
  ],
  druid: [
    { name: 'Druídico', desc: 'Língua secreta dos druidas; deixa mensagens ocultas que só outros druidas percebem.' },
    { name: 'Conjuração', desc: 'Conjura com SAB: 2 truques; todo dia prepara SAB + nível magias da lista do druida. Foco druídico (ramo, cajado, totem).' },
  ],
  fighter: [
    { name: 'Estilo de Luta', desc: 'Uma especialidade de combate para sempre — Defesa, Duelismo, Arquearia… (escolha no capítulo Dons).' },
    { name: 'Retomar o Fôlego', desc: 'Ação bônus: recupera 1d10 + nível de guerreiro em PV. 1× por descanso curto ou longo.' },
  ],
  monk: [
    { name: 'Defesa sem Armadura', desc: 'Sem armadura e sem escudo: CA = 10 + DES + SAB.' },
    { name: 'Artes Marciais (d4)', desc: 'Desarmado ou com arma de monge: usa DES, o dano vira 1d4 (se for maior) e, depois de Atacar, dá um golpe desarmado com a ação bônus.' },
  ],
  paladin: [
    { name: 'Sentido Divino', desc: 'Ação: sente celestiais, corruptores e mortos-vivos a até 18 m. Usos = 1 + CAR por descanso longo.' },
    { name: 'Cura pelas Mãos', desc: 'Reserva de 5 PV por nível de paladino (volta no descanso longo): toque para curar, ou gaste 5 para curar uma doença ou veneno.' },
  ],
  ranger: [
    { name: 'Inimigo Favorito', desc: 'Um tipo de criatura (escolha nos Dons): vantagem para rastreá-la e lembrar o que sabe dela, e um idioma dela.' },
    { name: 'Explorador Nato', desc: 'Um terreno favorito (escolha nos Dons): lá você não se perde, viaja melhor e soma o dobro da proficiência em testes de INT e SAB ligados a ele.' },
  ],
  rogue: [
    { name: 'Especialização', desc: 'Dobra a proficiência em 2 perícias suas (ou 1 perícia + Ferramentas de Ladrão). Marque no capítulo Perícias.' },
    { name: 'Ataque Furtivo (1d6)', desc: '1× por turno, +1d6 de dano com arma de acuidade ou à distância, se tiver vantagem ou um aliado ao lado do alvo.' },
    { name: 'Gíria de Ladrão', desc: 'Língua secreta de gírias, sinais e símbolos dos ladinos.' },
  ],
  sorcerer: [
    { name: 'Conjuração', desc: 'Conjura com CAR: 4 truques e 2 magias conhecidas de 1º círculo (escolha no capítulo Magias).' },
    { name: 'Origem de Feitiçaria', desc: 'Escolhida no capítulo Dons ({sub}): a fonte do seu poder, com poderes já no 1º nível.' },
  ],
  warlock: [
    { name: 'Patrono Transcendental', desc: 'Escolhido no capítulo Dons ({sub}): quem lhe dá poder — magias extras na lista e um poder no 1º nível.' },
    { name: 'Magia de Pacto', desc: 'Conjura com CAR: 2 truques, 2 magias conhecidas e 1 espaço de magia que volta no descanso curto.' },
  ],
  wizard: [
    { name: 'Conjuração', desc: 'Conjura com INT: 3 truques e um grimório com 6 magias de 1º círculo; todo dia prepara INT + nível delas. Conjura rituais do grimório.' },
    { name: 'Recuperação Arcana', desc: '1× por dia, num descanso curto, recupera espaços de magia gastos (no 1º nível, um espaço de 1º círculo).' },
  ],
};
