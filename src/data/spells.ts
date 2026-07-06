import type { CasterClass, Spell } from '@/types/dnd';

/**
 * Banco de magias — D&D 5e (PHB 2014), em português.
 * Traz a mecânica pública (círculo, escola, tempo, alcance, componentes,
 * duração, concentração, ritual, dano/cura, salvaguarda, área e condições)
 * e um resumo PARAFRASEADO do efeito — sem reproduzir o texto integral do
 * livro. Estrutura expansível: some novas magias livremente.
 *
 * Alcances/áreas em metros pela convenção do jogo (1,5 m por 5 pés).
 */
export const SPELLS: Spell[] = [
  // ======================= TRUQUES (nível 0) =======================
  {
    id: 'sp-firebolt', level: 0, name: 'Raio de Fogo', school: 'Evocação',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], attack: 'ranged', damage: { dice: '1d10', type: 'fogo' },
    desc: 'Arremessa uma chama contra uma criatura ou objeto; objetos inflamáveis pegam fogo.',
    higher: 'O dano aumenta para 2d10 (nv5), 3d10 (nv11) e 4d10 (nv17).', tags: ['dano'],
  },
  {
    id: 'sp-raygelo', level: 0, name: 'Raio de Gelo', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], attack: 'ranged', damage: { dice: '1d8', type: 'gelo' },
    desc: 'Um feixe gélido atinge o alvo e reduz seu deslocamento em 3 m até seu próximo turno.',
    higher: 'O dano aumenta em +1d8 nos níveis 5, 11 e 17.', tags: ['dano', 'controle'],
  },
  {
    id: 'sp-eldritch', level: 0, name: 'Rajada Mística', school: 'Evocação',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: 'Instantânea',
    classes: ['warlock'], attack: 'ranged', damage: { dice: '1d10', type: 'energia' },
    desc: 'Um feixe de energia crepitante — a magia de ataque característica do Bruxo (potencializável por Invocações).',
    higher: 'Dispara mais feixes: 2 (nv5), 3 (nv11) e 4 (nv17), cada um 1d10.', tags: ['dano'],
  },
  {
    id: 'sp-maosmagicas', level: 0, name: 'Mãos Mágicas', school: 'Conjuração',
    castingTime: '1 ação', range: '9 m', components: 'V, S', duration: '1 minuto',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    desc: 'Cria uma mão espectral que manipula objetos, abre portas e carrega até 5 kg à distância.', tags: ['utilidade'],
  },
  {
    id: 'sp-luz', level: 0, name: 'Luz', school: 'Evocação',
    castingTime: '1 ação', range: 'Toque', components: 'V, M', duration: '1 hora',
    classes: ['bard', 'cleric', 'sorcerer', 'wizard'], save: 'dex',
    desc: 'Um objeto emite luz plena num raio de 6 m. Alvo hostil pode resistir com salvaguarda de DES.', tags: ['utilidade'],
  },
  {
    id: 'sp-orientacao', level: 0, name: 'Orientação', school: 'Adivinhação',
    castingTime: '1 ação', range: 'Toque', components: 'V, S', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['cleric', 'druid'],
    desc: 'A criatura tocada soma 1d4 a um teste de habilidade à sua escolha antes de rolar.', tags: ['buff'],
  },
  {
    id: 'sp-prestidigitacao', level: 0, name: 'Prestidigitação', school: 'Transmutação',
    castingTime: '1 ação', range: '3 m', components: 'V, S', duration: 'Até 1 hora',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    desc: 'Pequenos truques mágicos: faíscas, limpar/sujar, aquecer, sabores e ilusões sensoriais menores.', tags: ['utilidade'],
  },
  {
    id: 'sp-chama', level: 0, name: 'Chama Sagrada', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['cleric'], save: 'dex', damage: { dice: '1d8', type: 'radiante' },
    desc: 'Luz sagrada desce sobre o alvo; ele não se beneficia de cobertura na salvaguarda.',
    higher: 'O dano aumenta em +1d8 nos níveis 5, 11 e 17.', tags: ['dano'],
  },
  {
    id: 'sp-toquegelido', level: 0, name: 'Toque Gélido', school: 'Necromancia',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: '1 rodada',
    classes: ['sorcerer', 'warlock', 'wizard'], attack: 'ranged', damage: { dice: '1d8', type: 'necrótico' },
    desc: 'Uma mão esquelética drena o alvo, que não pode recuperar PV até seu próximo turno.',
    higher: 'O dano aumenta em +1d8 nos níveis 5, 11 e 17.', tags: ['dano', 'debuff'],
  },
  {
    id: 'sp-zombaria', level: 0, name: 'Zombaria Viciosa', school: 'Encantamento',
    castingTime: '1 ação', range: '18 m', components: 'V', duration: 'Instantânea',
    classes: ['bard'], save: 'wis', damage: { dice: '1d4', type: 'psíquico' },
    desc: 'Insulto mágico: se falhar na salvaguarda de SAB, o alvo sofre dano e fica com desvantagem no próximo ataque.',
    higher: 'O dano aumenta em +1d4 nos níveis 5, 11 e 17.', tags: ['dano', 'debuff'],
  },
  {
    id: 'sp-acidoespirito', level: 0, name: 'Respingo Ácido', school: 'Conjuração',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '1d6', type: 'ácido' }, area: 'duas criaturas a 1,5 m entre si',
    desc: 'Borrifa ácido em uma ou duas criaturas próximas; salvaguarda de DES evita o dano.',
    higher: 'O dano aumenta em +1d6 nos níveis 5, 11 e 17.', tags: ['dano'],
  },
  {
    id: 'sp-ilusao', level: 0, name: 'Ilusão Menor', school: 'Ilusão',
    castingTime: '1 ação', range: '9 m', components: 'S, M', duration: '1 minuto',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    desc: 'Cria um som OU uma imagem estática do tamanho de um cubo de 1,5 m. Investigação revela a farsa.', tags: ['utilidade'],
  },
  {
    id: 'sp-estabilizar', level: 0, name: 'Estabilizar Criatura', school: 'Necromancia',
    castingTime: '1 ação', range: 'Toque', components: 'V, S', duration: 'Instantânea',
    classes: ['cleric', 'druid'],
    desc: 'Estabiliza uma criatura com 0 PV que esteja fazendo salvaguardas contra a morte.', tags: ['cura', 'utilidade'],
  },
  {
    id: 'sp-produzirchama', level: 0, name: 'Produzir Chama', school: 'Conjuração',
    castingTime: '1 ação', range: 'Pessoal / 9 m', components: 'V, S', duration: '10 minutos',
    classes: ['druid'], attack: 'ranged', damage: { dice: '1d8', type: 'fogo' },
    desc: 'Uma chama na palma ilumina como tocha e pode ser arremessada num ataque à distância.',
    higher: 'O dano aumenta em +1d8 nos níveis 5, 11 e 17.', tags: ['dano', 'utilidade'],
  },

  // ======================= 1º CÍRCULO =======================
  {
    id: 'sp-misseis', level: 1, name: 'Mísseis Mágicos', school: 'Evocação',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], damage: { dice: '3× (1d4+1)', type: 'energia' },
    desc: 'Três dardos de força que acertam automaticamente (sem ataque nem salvaguarda), 1d4+1 cada.',
    higher: 'Cada círculo acima do 1º cria +1 dardo.', tags: ['dano'],
  },
  {
    id: 'sp-escudo', level: 1, name: 'Escudo Arcano', school: 'Abjuração',
    castingTime: 'Reação', range: 'Pessoal', components: 'V, S', duration: '1 rodada',
    classes: ['sorcerer', 'wizard'],
    desc: 'Reação ao ser atingido: +5 de CA até o próximo turno e anula Mísseis Mágicos.', tags: ['defesa'],
  },
  {
    id: 'sp-armaduraarcana', level: 1, name: 'Armadura Arcana', school: 'Abjuração',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: '8 horas',
    classes: ['sorcerer', 'wizard'],
    desc: 'Sobre um alvo desarmado, define a CA base como 13 + modificador de Destreza.', tags: ['defesa', 'buff'],
  },
  {
    id: 'sp-curar', level: 1, name: 'Curar Ferimentos', school: 'Evocação',
    castingTime: '1 ação', range: 'Toque', components: 'V, S', duration: 'Instantânea',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], heal: '1d8 + mod. de conjuração',
    desc: 'A criatura tocada recupera pontos de vida (não afeta mortos-vivos nem construtos).',
    higher: 'A cura aumenta em +1d8 por círculo acima do 1º.', tags: ['cura'],
  },
  {
    id: 'sp-palavracura', level: 1, name: 'Palavra Curativa', school: 'Evocação',
    castingTime: '1 ação bônus', range: '18 m', components: 'V', duration: 'Instantânea',
    classes: ['bard', 'cleric', 'druid'], heal: '1d4 + mod. de conjuração',
    desc: 'Cura à distância como ação bônus — ideal para reerguer um aliado caído no meio do combate.',
    higher: 'A cura aumenta em +1d4 por círculo acima do 1º.', tags: ['cura'],
  },
  {
    id: 'sp-bencao', level: 1, name: 'Bênção', school: 'Encantamento',
    castingTime: '1 ação', range: '9 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['cleric', 'paladin'], area: 'até 3 criaturas',
    desc: 'Até três aliados somam 1d4 em ataques e salvaguardas enquanto durar a concentração.',
    higher: 'Afeta +1 criatura por círculo acima do 1º.', tags: ['buff'],
  },
  {
    id: 'sp-perdicao', level: 1, name: 'Perdição', school: 'Encantamento',
    castingTime: '1 ação', range: '9 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'cleric'], save: 'cha', area: 'até 3 criaturas',
    desc: 'Até três inimigos que falharem em salvaguarda de CAR subtraem 1d4 de ataques e salvaguardas.',
    higher: 'Afeta +1 criatura por círculo acima do 1º.', tags: ['debuff'],
  },
  {
    id: 'sp-flechacida', level: 1, name: 'Mãos Flamejantes', school: 'Evocação',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '3d6', type: 'fogo' }, area: 'cone de 4,5 m',
    desc: 'Um leque de chamas irrompe das mãos; salvaguarda de DES reduz o dano à metade.',
    higher: 'O dano aumenta em +1d6 por círculo acima do 1º.', tags: ['dano'],
  },
  {
    id: 'sp-sono', level: 1, name: 'Sono', school: 'Encantamento',
    castingTime: '1 ação', range: '27 m', components: 'V, S, M', duration: '1 minuto',
    classes: ['bard', 'sorcerer', 'wizard'], area: 'esfera de 6 m', conditions: ['Inconsciente'],
    desc: 'Role 5d8: essa soma de PV de criaturas (das mais fracas às mais fortes) cai no sono mágico.',
    higher: 'Role +2d8 de PV afetados por círculo acima do 1º.', tags: ['controle'],
  },
  {
    id: 'sp-fadas', level: 1, name: 'Fogo das Fadas', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'druid'], save: 'dex', area: 'cubo de 6 m',
    desc: 'Alvos delineados por luz não podem ficar invisíveis e concedem vantagem nos ataques contra eles.', tags: ['controle', 'debuff'],
  },
  {
    id: 'sp-ondatrov', level: 1, name: 'Onda Trovejante', school: 'Evocação',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S', duration: 'Instantânea',
    classes: ['bard', 'druid', 'sorcerer', 'wizard'], save: 'con', damage: { dice: '2d8', type: 'trovejante' }, area: 'cubo de 4,5 m',
    desc: 'Uma onda de força empurra criaturas 3 m para longe; salvaguarda de CON reduz o dano e evita o empurrão.',
    higher: 'O dano aumenta em +1d8 por círculo acima do 1º.', tags: ['dano', 'controle'],
  },
  {
    id: 'sp-detectar', level: 1, name: 'Detectar Magia', school: 'Adivinhação',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S', duration: 'Concentração, até 10 min', concentration: true, ritual: true,
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard'],
    desc: 'Percebe a presença de magia num raio de 9 m e a escola de cada aura mágica. Pode ser ritual.', tags: ['utilidade'],
  },
  {
    id: 'sp-enfeiticar', level: 1, name: 'Enfeitiçar Pessoa', school: 'Encantamento',
    castingTime: '1 ação', range: '9 m', components: 'V, S', duration: '1 hora',
    classes: ['bard', 'druid', 'sorcerer', 'warlock', 'wizard'], save: 'wis', conditions: ['Enfeitiçado'],
    desc: 'Um humanoide que falhar em SAB o considera um conhecido amigável (com vantagem se você estiver hostilizando).',
    higher: 'Afeta +1 criatura por círculo acima do 1º.', tags: ['controle'],
  },
  {
    id: 'sp-comando', level: 1, name: 'Comando', school: 'Encantamento',
    castingTime: '1 ação', range: '18 m', components: 'V', duration: '1 rodada',
    classes: ['cleric', 'paladin'], save: 'wis',
    desc: 'Uma ordem de uma palavra (ex.: "Largue", "Fuja", "Deite") que o alvo obedece se falhar em SAB.',
    higher: 'Afeta +1 criatura por círculo acima do 1º.', tags: ['controle'],
  },
  {
    id: 'sp-repreensao', level: 1, name: 'Repreensão Infernal', school: 'Evocação',
    castingTime: 'Reação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['warlock'], save: 'dex', damage: { dice: '2d10', type: 'fogo' },
    desc: 'Reação ao sofrer dano: envolve o agressor em chamas; salvaguarda de DES reduz à metade.',
    higher: 'O dano aumenta em +1d10 por círculo acima do 1º.', tags: ['dano'],
  },
  {
    id: 'sp-nevoa', level: 1, name: 'Névoa Obscurecente', school: 'Conjuração',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: 'Concentração, até 1 h', concentration: true,
    classes: ['druid', 'ranger', 'sorcerer', 'wizard'], area: 'esfera de 6 m',
    desc: 'Uma névoa densa cria área totalmente encoberta, bloqueando a visão de todos dentro e através dela.', tags: ['controle', 'defesa'],
  },
  {
    id: 'sp-escudofe', level: 1, name: 'Escudo da Fé', school: 'Abjuração',
    castingTime: '1 ação bônus', range: '18 m', components: 'V, S, M', duration: 'Concentração, até 10 min', concentration: true,
    classes: ['cleric', 'paladin'],
    desc: 'Um campo protetor concede +2 de CA a uma criatura enquanto você se concentrar.', tags: ['defesa', 'buff'],
  },
  {
    id: 'sp-heroismo', level: 1, name: 'Heroísmo', school: 'Encantamento',
    castingTime: '1 ação', range: 'Toque', components: 'V, S', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'paladin'],
    desc: 'O alvo fica imune a medo e ganha PV temporários (mod. de conjuração) no início de cada turno.',
    higher: 'Afeta +1 criatura por círculo acima do 1º.', tags: ['buff'],
  },

  {
    id: 'sp-criaragua', level: 1, name: 'Criar ou Destruir Água', school: 'Transmutação',
    castingTime: '1 ação', range: '9 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['cleric', 'druid'], save: 'con',
    desc: 'Cria até 40 L de água (ou chuva numa área) ou destrói água/névoa equivalente.', tags: ['utilidade'],
  },
  {
    id: 'sp-saltar', level: 1, name: 'Saltar', school: 'Transmutação',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: '1 minuto',
    classes: ['druid', 'ranger', 'sorcerer', 'wizard'],
    desc: 'A criatura tocada triplica a distância que consegue saltar.', tags: ['movimento', 'buff'],
  },

  // ======================= 2º CÍRCULO =======================
  {
    id: 'sp-espelho', level: 2, name: 'Imagem Espelhada', school: 'Ilusão',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S', duration: '1 minuto',
    classes: ['sorcerer', 'warlock', 'wizard'],
    desc: 'Cria 3 duplicatas ilusórias; ataques têm chance de atingir uma imagem em vez de você.', tags: ['defesa'],
  },
  {
    id: 'sp-invisibilidade', level: 2, name: 'Invisibilidade', school: 'Ilusão',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: 'Concentração, até 1 h', concentration: true,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'], conditions: ['Invisível'],
    desc: 'O alvo fica invisível até atacar ou conjurar. Objetos que carrega também somem.',
    higher: 'Afeta +1 criatura por círculo acima do 2º.', tags: ['utilidade', 'defesa'],
  },
  {
    id: 'sp-restauracao', level: 2, name: 'Restauração Menor', school: 'Abjuração',
    castingTime: '1 ação', range: 'Toque', components: 'V, S', duration: 'Instantânea',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
    desc: 'Remove uma condição: cego, surdo, paralisado ou envenenado, ou uma doença.', tags: ['cura', 'utilidade'],
  },
  {
    id: 'sp-aterrorizar', level: 2, name: 'Raio do Enfraquecimento', school: 'Necromancia',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['warlock', 'wizard'], attack: 'ranged', damage: { dice: '2d8', type: 'necrótico' },
    desc: 'Um feixe drena a força: o alvo causa metade do dano com ataques corpo a corpo baseados em Força.',
    higher: 'O dano aumenta em +1d8 por círculo acima do 2º.', tags: ['dano', 'debuff'],
  },
  {
    id: 'sp-passos', level: 2, name: 'Passo Enevoado', school: 'Conjuração',
    castingTime: '1 ação bônus', range: 'Pessoal', components: 'V', duration: 'Instantânea',
    classes: ['sorcerer', 'warlock', 'wizard'],
    desc: 'Teleporta-se até 9 m para um espaço livre que você possa ver — fuga ou reposicionamento instantâneo.', tags: ['movimento'],
  },
  {
    id: 'sp-segurar', level: 2, name: 'Imobilizar Pessoa', school: 'Encantamento',
    castingTime: '1 ação', range: '18 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'], save: 'wis', conditions: ['Paralisado'],
    desc: 'Um humanoide que falhar em SAB fica paralisado (refaz a salvaguarda a cada turno). Ataques de perto são críticos.',
    higher: 'Afeta +1 criatura por círculo acima do 2º.', tags: ['controle'],
  },
  {
    id: 'sp-flechacidamelf', level: 2, name: 'Flecha Ácida de Melf', school: 'Evocação',
    castingTime: '1 ação', range: '27 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['wizard'], attack: 'ranged', damage: { dice: '4d4', type: 'ácido' },
    desc: 'Uma flecha de ácido causa dano no impacto e mais 2d4 no fim do próximo turno do alvo.',
    higher: 'O dano aumenta em +1d4 (impacto e residual) por círculo acima do 2º.', tags: ['dano'],
  },
  {
    id: 'sp-espiritual', level: 2, name: 'Arma Espiritual', school: 'Evocação',
    castingTime: '1 ação bônus', range: '18 m', components: 'V, S', duration: '1 minuto',
    classes: ['cleric'], damage: { dice: '1d8 + mod.', type: 'energia' },
    desc: 'Cria uma arma flutuante que ataca (mod. de conjuração) e pode ser reposicionada como ação bônus.',
    higher: 'O dano aumenta em +1d8 a cada dois círculos acima do 2º.', tags: ['dano'],
  },
  {
    id: 'sp-aumentar', level: 2, name: 'Ampliar/Reduzir', school: 'Transmutação',
    castingTime: '1 ação', range: '9 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['sorcerer', 'wizard'], save: 'con',
    desc: 'Aumenta (vantagem em FOR, +1d4 no dano) ou reduz (desvantagem, −1d4) o tamanho do alvo.', tags: ['buff', 'debuff'],
  },
  {
    id: 'sp-calorabrasante', level: 2, name: 'Raio Ardente', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], attack: 'ranged', damage: { dice: '3× 2d6', type: 'fogo' },
    desc: 'Dispara três raios de fogo; cada um é um ataque à distância separado de 2d6.',
    higher: 'Dispara +1 raio por círculo acima do 2º.', tags: ['dano'],
  },
  {
    id: 'sp-teiaaranha', level: 2, name: 'Teia', school: 'Conjuração',
    castingTime: '1 ação', range: '18 m', components: 'V, S, M', duration: 'Concentração, até 1 h', concentration: true,
    classes: ['sorcerer', 'wizard'], save: 'dex', area: 'cubo de 6 m', conditions: ['Impedido'],
    desc: 'Preenche a área com teias pegajosas (terreno difícil); quem falhar em DES fica impedido.', tags: ['controle'],
  },

  // ======================= 3º CÍRCULO =======================
  {
    id: 'sp-bolafogo', level: 3, name: 'Bola de Fogo', school: 'Evocação',
    castingTime: '1 ação', range: '45 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '8d6', type: 'fogo' }, area: 'esfera de 6 m',
    desc: 'Uma explosão de fogo; salvaguarda de DES reduz o dano à metade. Incendeia objetos soltos.',
    higher: 'O dano aumenta em +1d6 por círculo acima do 3º.', tags: ['dano'],
  },
  {
    id: 'sp-relampago', level: 3, name: 'Relâmpago', school: 'Evocação',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S, M', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '8d6', type: 'elétrico' }, area: 'linha de 30 m',
    desc: 'Um raio numa linha de 30 m; salvaguarda de DES reduz o dano à metade.',
    higher: 'O dano aumenta em +1d6 por círculo acima do 3º.', tags: ['dano'],
  },
  {
    id: 'sp-voo', level: 3, name: 'Voo', school: 'Transmutação',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: 'Concentração, até 10 min', concentration: true,
    classes: ['sorcerer', 'warlock', 'wizard'],
    desc: 'A criatura tocada ganha deslocamento de voo de 18 m enquanto durar a concentração.',
    higher: 'Afeta +1 criatura por círculo acima do 3º.', tags: ['movimento', 'buff'],
  },
  {
    id: 'sp-contramagia', level: 3, name: 'Contramágica', school: 'Abjuração',
    castingTime: 'Reação', range: '18 m', components: 'S', duration: 'Instantânea',
    classes: ['sorcerer', 'warlock', 'wizard'],
    desc: 'Reação para interromper uma magia sendo conjurada; magias de 3º círculo ou menos falham automaticamente.',
    higher: 'Interrompe automaticamente magias de círculo igual ao espaço usado.', tags: ['defesa', 'controle'],
  },
  {
    id: 'sp-revigorar', level: 3, name: 'Reviver os Mortos', school: 'Necromancia',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: 'Instantânea',
    classes: ['cleric', 'paladin'], material: 'diamantes no valor de 300 po (consumidos)',
    desc: 'Traz de volta uma criatura morta há até 1 minuto, com 1 PV (não restaura membros nem cura doenças).', tags: ['cura', 'utilidade'],
  },
  {
    id: 'sp-relampagosagrado', level: 3, name: 'Dissipar Magia', school: 'Abjuração',
    castingTime: '1 ação', range: '36 m', components: 'V, S', duration: 'Instantânea',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'sorcerer', 'warlock', 'wizard'],
    desc: 'Encerra magias de 3º círculo ou menos no alvo; para magias mais altas, faça um teste de conjuração.', tags: ['utilidade', 'defesa'],
  },
  {
    id: 'sp-palavracoragem', level: 3, name: 'Revigorar (Palavra de Cura em Massa)', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V', duration: 'Instantânea',
    classes: ['cleric'], heal: '1d4 + mod.', area: 'até 6 criaturas',
    desc: 'Cura até seis criaturas à distância ao mesmo tempo, com uma única ação.',
    higher: 'A cura aumenta em +1d4 por círculo acima do 3º.', tags: ['cura'],
  },
  {
    id: 'sp-medo', level: 3, name: 'Amedrontar', school: 'Ilusão',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'], save: 'wis', area: 'cone de 9 m', conditions: ['Amedrontado'],
    desc: 'Criaturas no cone que falharem em SAB largam o que seguram e fogem, amedrontadas.', tags: ['controle', 'debuff'],
  },
  {
    id: 'sp-hipnose', level: 3, name: 'Acelerar', school: 'Transmutação',
    castingTime: '1 ação', range: '9 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['sorcerer', 'wizard'],
    desc: 'O alvo dobra o deslocamento, ganha +2 de CA, vantagem em DES e uma ação extra por turno.', tags: ['buff'],
  },

  // ======================= 4º CÍRCULO =======================
  {
    id: 'sp-muralha', level: 4, name: 'Muralha de Fogo', school: 'Evocação',
    castingTime: '1 ação', range: '36 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['druid', 'sorcerer', 'wizard'], save: 'dex', damage: { dice: '5d8', type: 'fogo' }, area: 'muro de 18 m',
    desc: 'Ergue uma parede de chamas; quem começa o turno perto ou a atravessa sofre 5d8 (DES reduz à metade).',
    higher: 'O dano aumenta em +1d8 por círculo acima do 4º.', tags: ['dano', 'controle'],
  },
  {
    id: 'sp-banir', level: 4, name: 'Banimento', school: 'Abjuração',
    castingTime: '1 ação', range: '18 m', components: 'V, S, M', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['cleric', 'paladin', 'sorcerer', 'warlock', 'wizard'], save: 'cha',
    desc: 'O alvo que falhar em CAR é banido para um semiplano; se for extraplanar, não retorna.',
    higher: 'Bane +1 criatura por círculo acima do 4º.', tags: ['controle'],
  },
  {
    id: 'sp-tempestade', level: 4, name: 'Tempestade de Gelo', school: 'Evocação',
    castingTime: '1 ação', range: '90 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['druid', 'sorcerer', 'wizard'], save: 'dex', damage: { dice: '2d8 + 4d6', type: 'concussão/gelo' }, area: 'cilindro de 6 m',
    desc: 'Granizo e frio castigam a área; salvaguarda de DES reduz à metade. Vira terreno difícil.',
    higher: 'O dano concussão aumenta em +1d8 por círculo acima do 4º.', tags: ['dano', 'controle'],
  },
  {
    id: 'sp-liberdade', level: 4, name: 'Liberdade de Movimento', school: 'Abjuração',
    castingTime: '1 ação', range: 'Toque', components: 'V, S, M', duration: '1 hora',
    classes: ['bard', 'cleric', 'druid', 'ranger'],
    desc: 'O alvo ignora terreno difícil e não pode ser preso, agarrado nem paralisado por efeitos mágicos.', tags: ['buff', 'defesa'],
  },

  // ======================= 5º CÍRCULO =======================
  {
    id: 'sp-conemar', level: 5, name: 'Cone do Frio', school: 'Evocação',
    castingTime: '1 ação', range: 'Pessoal', components: 'V, S, M', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'con', damage: { dice: '8d8', type: 'gelo' }, area: 'cone de 18 m',
    desc: 'Uma rajada de frio glacial; salvaguarda de CON reduz à metade. Mortos pelo frio viram estátuas de gelo.',
    higher: 'O dano aumenta em +1d8 por círculo acima do 5º.', tags: ['dano'],
  },
  {
    id: 'sp-coluna', level: 5, name: 'Coluna de Chamas', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['cleric', 'druid'], save: 'dex', damage: { dice: '4d6 + 4d6', type: 'fogo/radiante' }, area: 'cilindro de 3 m',
    desc: 'Uma coluna de fogo divino desce do céu (metade fogo, metade radiante); DES reduz à metade.',
    higher: 'O dano aumenta em +1d6 (cada tipo) por círculo acima do 5º.', tags: ['dano'],
  },
  {
    id: 'sp-revivificar', level: 5, name: 'Ressurreição (Reencarnar)', school: 'Necromancia',
    castingTime: '1 hora', range: 'Toque', components: 'V, S, M', duration: 'Instantânea',
    classes: ['cleric', 'druid'],
    desc: 'Traz de volta uma criatura morta há até 10 dias, restaurando-a com todos os PV.', tags: ['cura', 'utilidade'],
  },
  {
    id: 'sp-dominar', level: 5, name: 'Dominar Pessoa', school: 'Encantamento',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Concentração, até 1 min', concentration: true,
    classes: ['bard', 'sorcerer', 'wizard'], save: 'wis', conditions: ['Enfeitiçado'],
    desc: 'Assume o controle de um humanoide que falhar em SAB, dando ordens telepáticas.',
    higher: 'Duração maior e mais alvos em círculos superiores.', tags: ['controle'],
  },

  // ======================= 6º–9º CÍRCULO (ícones) =======================
  {
    id: 'sp-desintegrar', level: 6, name: 'Desintegrar', school: 'Transmutação',
    castingTime: '1 ação', range: '18 m', components: 'V, S, M', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '10d6 + 40', type: 'energia' },
    desc: 'Um raio verde fino; se reduzir o alvo a 0 PV, ele vira pó. Salvaguarda de DES evita o efeito.',
    higher: 'O dano aumenta em +3d6 por círculo acima do 6º.', tags: ['dano'],
  },
  {
    id: 'sp-curargrupo', level: 6, name: 'Cura em Massa', school: 'Evocação',
    castingTime: '1 ação', range: '18 m', components: 'V, S', duration: 'Instantânea',
    classes: ['cleric'], heal: '3d8 + mod.', area: 'até 6 criaturas',
    desc: 'Energia curativa flui para até seis criaturas à sua escolha em um raio de 9 m.', tags: ['cura'],
  },
  {
    id: 'sp-teletransporte', level: 7, name: 'Teletransporte', school: 'Conjuração',
    castingTime: '1 ação', range: '3 m', components: 'V', duration: 'Instantânea',
    classes: ['bard', 'sorcerer', 'wizard'],
    desc: 'Transporta instantaneamente você e até oito criaturas para um destino conhecido.', tags: ['movimento', 'utilidade'],
  },
  {
    id: 'sp-palavrapoder', level: 8, name: 'Palavra de Poder: Atordoar', school: 'Encantamento',
    castingTime: '1 ação', range: '18 m', components: 'V', duration: 'Instantânea',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'], save: 'con', conditions: ['Atordoado'],
    desc: 'Uma palavra de poder atordoa um alvo com 150 PV ou menos (salvaguarda de CON encerra).', tags: ['controle'],
  },
  {
    id: 'sp-desejo', level: 9, name: 'Desejo', school: 'Conjuração',
    castingTime: '1 ação', range: 'Pessoal', components: 'V', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'],
    desc: 'A magia mais poderosa: replica qualquer magia de até 8º círculo ou altera a realidade (com riscos).', tags: ['utilidade'],
  },
  {
    id: 'sp-meteoro', level: 9, name: 'Chuva de Meteoros', school: 'Evocação',
    castingTime: '1 ação', range: '1,5 km', components: 'V, S', duration: 'Instantânea',
    classes: ['sorcerer', 'wizard'], save: 'dex', damage: { dice: '20d6 + 20d6', type: 'fogo/concussão' }, area: '4 esferas de 12 m',
    desc: 'Meteoros flamejantes caem em quatro pontos, devastando tudo; DES reduz o dano imenso à metade.', tags: ['dano'],
  },
];

export const SPELL_BY_ID: Record<string, Spell> = Object.fromEntries(
  SPELLS.map((s) => [s.id, s]),
);

export function getSpell(id: string): Spell | undefined {
  return SPELL_BY_ID[id];
}

/** Todas as magias que a classe pode aprender/preparar até o círculo dado. */
export function spellsForClass(classId: string, maxCircle = 9): Spell[] {
  return SPELLS.filter(
    (spell) => (spell.classes ? spell.classes.includes(classId as CasterClass) : true) && spell.level <= Math.max(0, maxCircle),
  ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** Truques e magias sugeridos por padrão para conjuradores novos. */
export function defaultPreparedForClass(classId: string, maxCircle: number): string[] {
  return spellsForClass(classId, Math.min(1, maxCircle))
    .filter((s) => s.level <= 1)
    .slice(0, 4)
    .map((s) => s.id);
}
