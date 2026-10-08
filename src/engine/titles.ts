import type { Character } from '@/types/character';
import type { DeedCounts, DeedRarity } from './deeds';

/**
 * Títulos: alcunhas de lenda para o PERSONAGEM (como o mundo passa a
 * chamá-lo), não conquistas de jogador. Cada um tem forma masculina e
 * feminina (segue o gênero da ficha) e é liberado pelos feitos, pelo nível,
 * pela classe, pelas cicatrizes, pelas sessões e pelo que o herói carrega.
 */
export interface TitleDef {
  id: string;
  /** Forma masculina e feminina (iguais quando o título é neutro). */
  m: string;
  f: string;
  /** Uma linha do que se conta na taverna. */
  lore: string;
  /** Como liberar (aparece na lista dos que faltam). */
  hint: string;
  /** O que o herói fez para merecer (no passado; aparece no título escolhido). */
  did: string;
  rarity: DeedRarity;
  /** Aparece como "???" até ser liberado. */
  secret?: boolean;
  /** Alcunha de classe: só entra na lista de quem tem essa classe. */
  cls?: string;
  /** Alcunha de povo: só entra na lista de quem é dessa raça. */
  race?: string;
  unlocked: (c: Character) => boolean;
  /** Títulos de contagem: quanto o herói já tem e quanto precisa. */
  have?: (c: Character) => number;
  need?: number;
}

const n = (c: Character, k: keyof DeedCounts) => c.deeds?.counts?.[k] ?? 0;
/** Nível numa classe (multiclasse conta cada uma). */
const classLv = (c: Character, id: string) => (c.classLevels?.length ? c.classLevels.find((x) => x.classId === id)?.level ?? 0 : c.classId === id ? c.level : 0);
const same = (t: string) => ({ m: t, f: t });
/** Título de contagem: libera ao chegar em `need` e mostra o progresso. */
const at = (have: (c: Character) => number, need: number) => ({ have, need, unlocked: (c: Character) => have(c) >= need });
/** Abates somados de várias criaturas do bestiário (ids fixos: nada de importar o bestiário aqui). */
const hunted = (c: Character, ids: string[]) => ids.reduce((sum, id) => sum + (c.deeds?.hunts?.[id]?.n ?? 0), 0);
const huntList = (c: Character) => Object.values(c.deeds?.hunts ?? {}).filter((h) => h && h.n > 0);
/** Riqueza em peças de ouro (moedas na bolsa). */
const gold = (c: Character) => {
  const m = c.coins ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  return Math.floor((m.pp ?? 0) * 10 + (m.gp ?? 0) + (m.ep ?? 0) / 2 + (m.sp ?? 0) / 10 + (m.cp ?? 0) / 100);
};
const party = (c: Character) => (c.allies?.length ?? 0) + (c.companion !== undefined && classLv(c, 'ranger') >= 3 ? 1 : 0);
const RELIC = new Set(['raro', 'muito-raro', 'lendario']);

export const TITLES: TitleDef[] = [
  // ---------- sangue e aço ----------
  { id: 'lamina-sangrenta', ...same('Lâmina Sangrenta'), lore: 'A lâmina já não volta limpa para a bainha.', did: 'Deu 10 golpes finais.', hint: '10 golpes finais.', rarity: 'comum', ...at((c) => n(c, 'kills'), 10) },
  { id: 'carniceiro', m: 'o Carniceiro', f: 'a Carniceira', lore: 'Os campos de batalha ficam em silêncio quando chega.', did: 'Deu 25 golpes finais.', hint: '25 golpes finais.', rarity: 'raro', ...at((c) => n(c, 'kills'), 25) },
  { id: 'ceifador', m: 'o Ceifador', f: 'a Ceifadora', lore: 'Onde passa, a colheita é sempre farta — e vermelha.', did: 'Deu 50 golpes finais.', hint: '50 golpes finais.', rarity: 'epico', ...at((c) => n(c, 'kills'), 50) },
  { id: 'deus-da-guerra', m: 'Deus da Guerra', f: 'Deusa da Guerra', lore: 'Bardos juram que nenhum exército sobreviveu à sua fúria.', did: 'Deu 100 golpes finais.', hint: '100 golpes finais.', rarity: 'lendario', ...at((c) => n(c, 'kills'), 100) },
  { id: 'primeiro-sangue', ...same('Primeiro Sangue'), lore: 'Todo nome de lenda começa com uma lâmina molhada.', did: 'Deu o primeiro golpe final.', hint: 'Dar o primeiro golpe final.', rarity: 'comum', ...at((c) => n(c, 'kills'), 1) },
  { id: 'flagelo-dos-reinos', ...same('Flagelo dos Reinos'), lore: 'Há reinos que mudaram as fronteiras só para não ficar no caminho.', did: 'Deu 250 golpes finais.', hint: '250 golpes finais.', rarity: 'lendario', ...at((c) => n(c, 'kills'), 250) },

  // ---------- monstros ----------
  { id: 'coracao-de-dragao', ...same('Coração de Dragão'), lore: 'Bebeu do sangue de um wyrm e não queimou por dentro.', did: 'Derrubou um dragão.', hint: 'Derrubar um dragão.', rarity: 'epico', ...at((c) => n(c, 'dragons'), 1) },
  { id: 'senhor-dos-wyrms', m: 'o Senhor dos Wyrms', f: 'a Senhora dos Wyrms', lore: 'Os dragões contam histórias sobre esse nome para assustar os filhotes.', did: 'Derrubou 3 dragões.', hint: 'Derrubar 3 dragões.', rarity: 'lendario', ...at((c) => n(c, 'dragons'), 3) },
  { id: 'quebra-montanhas', ...same('Quebra-Montanhas'), lore: 'Fez tombar o que parecia ser parte da paisagem.', did: 'Derrubou um gigante.', hint: 'Derrubar um gigante.', rarity: 'raro', ...at((c) => n(c, 'giants'), 1) },
  { id: 'derrubador-de-gigantes', m: 'o Derrubador de Gigantes', f: 'a Derrubadora de Gigantes', lore: 'Os gigantes das colinas já não descem para o vale.', did: 'Derrubou 5 gigantes.', hint: 'Derrubar 5 gigantes.', rarity: 'epico', ...at((c) => n(c, 'giants'), 5) },
  { id: 'luz-das-criptas', ...same('Luz das Criptas'), lore: 'Os mortos voltam a descansar quando essa tocha passa.', did: 'Devolveu 10 mortos-vivos ao túmulo.', hint: 'Devolver 10 mortos-vivos ao túmulo.', rarity: 'raro', ...at((c) => n(c, 'undead'), 10) },
  { id: 'vigia-do-tumulo', m: 'o Vigia do Túmulo', f: 'a Vigia do Túmulo', lore: 'O primeiro morto que se levantou caiu de novo — e ficou.', did: 'Devolveu um morto-vivo ao túmulo.', hint: 'Devolver um morto-vivo ao túmulo.', rarity: 'comum', ...at((c) => n(c, 'undead'), 1) },
  { id: 'flagelo-dos-mortos', m: 'o Flagelo dos Mortos', f: 'a Flagelo dos Mortos', lore: 'Necromantes queimam os próprios livros quando ouvem que está na região.', did: 'Devolveu 50 mortos-vivos ao túmulo.', hint: 'Devolver 50 mortos-vivos ao túmulo.', rarity: 'epico', ...at((c) => n(c, 'undead'), 50) },
  { id: 'martelo-dos-infernos', ...same('Martelo dos Infernos'), lore: 'Há um nome escrito nas paredes do Abismo — e não é um elogio.', did: 'Derrubou um demônio ou diabo.', hint: 'Derrubar um demônio ou diabo.', rarity: 'raro', ...at((c) => n(c, 'fiends'), 1) },
  { id: 'inquisidor', m: 'o Inquisidor', f: 'a Inquisidora', lore: 'Corruptores sussurram uns aos outros para não cruzar seu caminho.', did: 'Derrubou 5 demônios ou diabos.', hint: 'Derrubar 5 demônios ou diabos.', rarity: 'epico', ...at((c) => n(c, 'fiends'), 5) },
  { id: 'guardiao-dos-portoes', m: 'o Guardião dos Portões', f: 'a Guardiã dos Portões', lore: 'Os portais para os planos inferiores tremem quando se aproxima.', did: 'Derrubou 15 demônios ou diabos.', hint: 'Derrubar 15 demônios ou diabos.', rarity: 'lendario', ...at((c) => n(c, 'fiends'), 15) },
  { id: 'matador-de-titas', m: 'o Matador de Titãs', f: 'a Matadora de Titãs', lore: 'Ninguém apostava uma moeda de cobre. Ainda bem.', did: 'Deu o golpe final numa criatura de ND maior que o próprio nível.', hint: 'Golpe final numa criatura de ND maior que o seu nível.', rarity: 'epico', secret: true, ...at((c) => n(c, 'upsets'), 1) },
  { id: 'lenda-viva', ...same('Lenda Viva'), lore: 'Já derrubou três vezes o que era maior que o próprio destino.', did: 'Deu 3 golpes finais em criaturas de ND maior que o próprio nível.', hint: '3 golpes finais em criaturas de ND maior que o seu nível.', rarity: 'lendario', secret: true, ...at((c) => n(c, 'upsets'), 3) },
  { id: 'quebra-destinos', ...same('Quebra-Destinos'), lore: 'As profecias pararam de prever a sua morte. Cansaram de errar.', did: 'Deu 10 golpes finais em criaturas de ND maior que o próprio nível.', hint: '10 golpes finais em criaturas de ND maior que o seu nível.', rarity: 'lendario', secret: true, ...at((c) => n(c, 'upsets'), 10) },

  // ---------- sorte e destino ----------
  { id: 'abencoado-tymora', m: 'o Abençoado por Tymora', f: 'a Abençoada por Tymora', lore: 'A Senhora da Sorte sorri — e às vezes pisca.', did: 'Tirou 10 vinte naturais.', hint: '10 vinte naturais.', rarity: 'raro', ...at((c) => n(c, 'crits'), 10) },
  { id: 'mao-do-destino', ...same('Mão do Destino'), lore: 'O que toca, acontece. Os oráculos já desistiram de prever.', did: 'Tirou 50 vinte naturais.', hint: '50 vinte naturais.', rarity: 'lendario', ...at((c) => n(c, 'crits'), 50) },
  { id: 'favorito-da-sorte', m: 'o Favorito da Sorte', f: 'a Favorita da Sorte', lore: 'Apostadores tocam a sua capa antes de jogar os dados.', did: 'Tirou 25 vinte naturais.', hint: '25 vinte naturais.', rarity: 'epico', ...at((c) => n(c, 'crits'), 25) },
  { id: 'senhor-do-acaso', m: 'o Senhor do Acaso', f: 'a Senhora do Acaso', lore: 'Dizem que os dados obedecem quando ele sopra neles.', did: 'Tirou 100 vinte naturais.', hint: '100 vinte naturais.', rarity: 'lendario', ...at((c) => n(c, 'crits'), 100) },
  { id: 'tempestade-viva', ...same('Tempestade Viva'), lore: 'Numa só noite, o céu inteiro caiu sobre os inimigos.', did: 'Tirou 3 vinte naturais no mesmo dia.', hint: '3 vinte naturais no mesmo dia.', rarity: 'epico', secret: true, ...at((c) => n(c, 'critBursts'), 1) },
  { id: 'olho-da-tempestade', ...same('Olho da Tempestade'), lore: 'Três noites de raios. Os inimigos ainda ouvem o trovão quando dormem.', did: 'Tirou 3 vinte naturais no mesmo dia, três vezes.', hint: '3 dias com 3 vinte naturais cada.', rarity: 'lendario', secret: true, ...at((c) => n(c, 'critBursts'), 3) },
  { id: 'amaldicoado-beshaba', m: 'o Amaldiçoado por Beshaba', f: 'a Amaldiçoada por Beshaba', lore: 'A Donzela do Infortúnio tem um favorito. Infelizmente.', did: 'Tirou 20 uns naturais.', hint: '20 uns naturais.', rarity: 'raro', ...at((c) => n(c, 'fumbles'), 20) },
  { id: 'desastrado', m: 'o Desastrado', f: 'a Desastrada', lore: 'Tropeça na própria sombra — e ainda assim chega lá.', did: 'Tirou 5 uns naturais.', hint: '5 uns naturais.', rarity: 'comum', ...at((c) => n(c, 'fumbles'), 5) },
  { id: 'cria-de-beshaba', m: 'o Filho de Beshaba', f: 'a Filha de Beshaba', lore: 'Gatos pretos atravessam a rua para não cruzar o seu caminho.', did: 'Tirou 50 uns naturais.', hint: '50 uns naturais.', rarity: 'epico', ...at((c) => n(c, 'fumbles'), 50) },
  { id: 'toque-fatal', ...same('Toque Fatal'), lore: 'Bastou um gesto simples — e o inimigo não levantou mais.', did: 'Deu um golpe final com um truque.', hint: 'Golpe final com um truque.', rarity: 'raro', secret: true, ...at((c) => n(c, 'cantripKills'), 1) },
  { id: 'mestre-dos-truques', m: 'o Mestre dos Truques', f: 'a Mestra dos Truques', lore: 'Não precisa de magia grande para acabar com uma briga.', did: 'Deu 10 golpes finais com truques.', hint: '10 golpes finais com truques.', rarity: 'epico', ...at((c) => n(c, 'cantripKills'), 10) },

  // ---------- morte e volta ----------
  { id: 'fio-da-navalha', ...same('Fio da Navalha'), lore: 'Vive sempre a um suspiro do fim — e gosta.', did: 'Levou um golpe e ficou de pé com 1 PV.', hint: 'Levar um golpe e ficar com 1 PV.', rarity: 'raro', secret: true, ...at((c) => n(c, 'clutch'), 1) },
  { id: 'dancarino-da-morte', m: 'o Dançarino da Morte', f: 'a Dançarina da Morte', lore: 'Já dançou cinco vezes com ela e nunca pisou no seu pé.', did: 'Ficou de pé com 1 PV cinco vezes.', hint: 'Levar um golpe e ficar com 1 PV 5 vezes.', rarity: 'epico', secret: true, ...at((c) => n(c, 'clutch'), 5) },
  { id: 'sangue-de-fenix', ...same('Sangue de Fênix'), lore: 'Caiu três vezes. Levantou três vezes.', did: 'Caiu a 0 PV e voltou 3 vezes.', hint: 'Cair a 0 PV e voltar 3 vezes.', rarity: 'epico', ...at((c) => n(c, 'comebacks'), 3) },
  { id: 'teimoso', m: 'o Teimoso', f: 'a Teimosa', lore: 'Caiu. Levantou. Ainda resmungando.', did: 'Caiu a 0 PV e voltou.', hint: 'Cair a 0 PV e voltar.', rarity: 'comum', ...at((c) => n(c, 'comebacks'), 1) },
  { id: 'imortal', m: 'o Imortal', f: 'a Imortal', lore: 'A Rainha Corvo já marcou esse nome cinco vezes — e cinco vezes errou.', did: 'Caiu a 0 PV e voltou 5 vezes.', hint: 'Cair a 0 PV e voltar 5 vezes.', rarity: 'lendario', ...at((c) => n(c, 'comebacks'), 5) },
  { id: 'sem-tumulo', m: 'o Sem-Túmulo', f: 'a Sem-Túmulo', lore: 'Já cavaram dez covas com esse nome. Todas continuam vazias.', did: 'Caiu a 0 PV e voltou 10 vezes.', hint: 'Cair a 0 PV e voltar 10 vezes.', rarity: 'lendario', ...at((c) => n(c, 'comebacks'), 10) },
  { id: 'voltou-do-vale', m: 'o Que Voltou do Vale', f: 'a Que Voltou do Vale', lore: 'Olhou a morte nos olhos, riu e voltou andando.', did: 'Tirou 20 natural num Teste contra a Morte.', hint: '20 natural num Teste contra a Morte.', rarity: 'epico', secret: true, ...at((c) => n(c, 'deathSaveCrits'), 1) },
  { id: 'riso-da-morte', ...same('Riso da Morte'), lore: 'Três vezes a morte veio buscar. Três vezes foi mandada embora rindo.', did: 'Tirou 20 natural em 3 Testes contra a Morte.', hint: '3 vinte naturais em Testes contra a Morte.', rarity: 'lendario', secret: true, ...at((c) => n(c, 'deathSaveCrits'), 3) },
  { id: 'imperador-da-loucura', m: 'o Imperador da Loucura', f: 'a Imperatriz da Loucura', lore: 'Corre para o perigo como quem corre para casa.', did: 'Caiu a 0 PV 5 vezes.', hint: 'Cair a 0 PV 5 vezes.', rarity: 'epico', ...at((c) => n(c, 'downs'), 5) },
  { id: 'para-raios', ...same('Para-Raios'), lore: 'Se há um golpe vindo, acerta primeiro nele — e ele parece gostar.', did: 'Caiu a 0 PV 10 vezes.', hint: 'Cair a 0 PV 10 vezes.', rarity: 'epico', ...at((c) => n(c, 'downs'), 10) },

  // ---------- bestiário de caçadas ----------
  { id: 'caca-ratos', ...same('Caça-Ratos'), lore: 'Toda lenda começa num porão. A dele começou em muitos.', did: 'Abateu 10 ratos.', hint: 'Abater 10 ratos (comuns ou gigantes).', rarity: 'comum', ...at((c) => hunted(c, ['rat', 'giant-rat']), 10) },
  { id: 'flagelo-dos-goblins', ...same('Flagelo dos Goblins'), lore: 'Nas tocas, os goblins contam histórias sobre esse nome para assustar os filhotes.', did: 'Abateu 10 goblinoides.', hint: 'Abater 10 goblins, hobgoblins ou bugbears.', rarity: 'raro', ...at((c) => hunted(c, ['goblin', 'hobgoblin', 'bugbear']), 10) },
  { id: 'terror-das-estradas', ...same('Terror das Estradas'), lore: 'Bandidos mudam de rota quando ouvem que vai passar.', did: 'Abateu 10 bandidos, capangas ou cultistas.', hint: 'Abater 10 bandidos, capangas, capitães ou cultistas.', rarity: 'raro', ...at((c) => hunted(c, ['bandit', 'thug', 'bandit-captain', 'cultist']), 10) },
  { id: 'pele-de-lobo', ...same('Pele de Lobo'), lore: 'Veste o casaco de quem quis caçá-lo.', did: 'Abateu 10 lobos.', hint: 'Abater 10 lobos, lobos atrozes, worgs ou lobisomens.', rarity: 'raro', ...at((c) => hunted(c, ['wolf', 'dire-wolf', 'worg', 'werewolf']), 10) },
  { id: 'terror-dos-orcs', m: 'o Terror dos Orcs', f: 'a Terror dos Orcs', lore: 'As tribos pintam esse rosto nos escudos — para lembrar de quem fugir.', did: 'Abateu 10 orcs ou gnolls.', hint: 'Abater 10 orcs ou gnolls.', rarity: 'raro', ...at((c) => hunted(c, ['orc', 'gnoll']), 10) },
  { id: 'rompe-teias', ...same('Rompe-Teias'), lore: 'Entra na toca da aranha e sai com a teia enrolada no braço.', did: 'Abateu 5 aranhas gigantes.', hint: 'Abater 5 aranhas gigantes.', rarity: 'raro', ...at((c) => hunted(c, ['giant-spider']), 5) },
  { id: 'queima-trolls', ...same('Queima-Trolls'), lore: 'Aprendeu do jeito difícil: só fogo e ácido.', did: 'Abateu 3 trolls.', hint: 'Abater 3 trolls.', rarity: 'epico', ...at((c) => hunted(c, ['troll']), 3) },
  { id: 'olhos-vendados', ...same('Olhos Vendados'), lore: 'Venceu o que transforma em pedra sem nunca encarar.', did: 'Abateu uma medusa ou um basilisco.', hint: 'Abater uma medusa ou um basilisco.', rarity: 'epico', ...at((c) => hunted(c, ['medusa', 'basilisk']), 1) },
  { id: 'corta-cabecas', ...same('Corta-Cabeças'), lore: 'Cortou uma, nasceram duas. Cortou todas.', did: 'Abateu uma hidra.', hint: 'Abater uma hidra.', rarity: 'epico', ...at((c) => hunted(c, ['hydra']), 1) },
  { id: 'estaca-de-prata', m: 'o Matador de Vampiros', f: 'a Matadora de Vampiros', lore: 'Dorme de dia com uma estaca debaixo do travesseiro. Só por garantia.', did: 'Abateu um vampiro.', hint: 'Abater um vampiro.', rarity: 'epico', ...at((c) => hunted(c, ['vampire']), 1) },
  { id: 'desconfiado', m: 'o Desconfiado', f: 'a Desconfiada', lore: 'Depois daquele baú, cutuca toda porta e chuta todo tesouro.', did: 'Abateu um mímico.', hint: 'Abater um mímico.', rarity: 'raro', secret: true, ...at((c) => hunted(c, ['mimic']), 1) },
  { id: 'naturalista', m: 'o Naturalista', f: 'a Naturalista', lore: 'Já enfrentou mais tipos de criatura do que muito sábio estudou.', did: 'Caçou 10 espécies diferentes.', hint: 'Caçar 10 criaturas diferentes do bestiário.', rarity: 'raro', ...at((c) => huntList(c).length, 10) },
  { id: 'bestiario-vivo', ...same('Bestiário Vivo'), lore: 'Os eruditos pagam para copiar as anotações das suas caçadas.', did: 'Caçou 25 espécies diferentes.', hint: 'Caçar 25 criaturas diferentes do bestiário.', rarity: 'epico', ...at((c) => huntList(c).length, 25) },
  { id: 'fim-de-linhagem', ...same('Fim de Linhagem'), lore: 'Há uma espécie inteira que aprendeu a fugir do seu cheiro.', did: 'Chegou a Nêmesis numa criatura (25 abates).', hint: 'Chegar a Nêmesis numa criatura do bestiário (25 abates).', rarity: 'epico', ...at((c) => huntList(c).filter((h) => h.n >= 25).length, 1) },
  { id: 'grande-cacador', m: 'o Grande Caçador', f: 'a Grande Caçadora', lore: 'Três espécies têm o seu nome gravado como o pior dos pesadelos.', did: 'Chegou a Nêmesis em 3 criaturas.', hint: 'Chegar a Nêmesis em 3 criaturas do bestiário.', rarity: 'lendario', ...at((c) => huntList(c).filter((h) => h.n >= 25).length, 3) },

  // ---------- marcas da estrada ----------
  { id: 'marcado', m: 'o Marcado', f: 'a Marcada', lore: 'Cada cicatriz tem uma história — e um inimigo que não está mais aqui.', did: 'Ganhou 3 cicatrizes.', hint: '3 cicatrizes na carta.', rarity: 'raro', ...at((c) => (c.scars?.length ?? 0), 3) },
  { id: 'mil-cicatrizes', ...same('Mil Cicatrizes'), lore: 'A pele virou um mapa das guerras que venceu.', did: 'Ganhou 6 cicatrizes.', hint: '6 cicatrizes na carta.', rarity: 'epico', ...at((c) => (c.scars?.length ?? 0), 6) },
  { id: 'remendado', m: 'o Remendado', f: 'a Remendada', lore: 'Tem mais pontos que um sapato velho — e continua de pé.', did: 'Ganhou 10 cicatrizes.', hint: '10 cicatrizes na carta.', rarity: 'lendario', ...at((c) => c.scars?.length ?? 0, 10) },
  { id: 'veterano', m: 'o Veterano', f: 'a Veterana', lore: 'Já viu de tudo nas estradas — e sobreviveu para contar.', did: 'Jogou 10 sessões na mesa ao vivo.', hint: '10 sessões na mesa ao vivo.', rarity: 'raro', ...at((c) => (c.sessions?.length ?? 0), 10) },
  { id: 'andarilho', m: 'o Andarilho', f: 'a Andarilha', lore: 'As botas já conhecem mais estradas que muitos mapas.', did: 'Jogou 3 sessões na mesa ao vivo.', hint: '3 sessões na mesa ao vivo.', rarity: 'comum', ...at((c) => c.sessions?.length ?? 0, 3) },
  { id: 'velho-lobo', m: 'o Velho Lobo', f: 'a Velha Loba', lore: 'Os jovens aventureiros pagam bebida só para ouvir uma história.', did: 'Jogou 25 sessões na mesa ao vivo.', hint: '25 sessões na mesa ao vivo.', rarity: 'epico', ...at((c) => (c.sessions?.length ?? 0), 25) },
  { id: 'lenda-das-tavernas', ...same('Lenda das Tavernas'), lore: 'Em toda taverna do reino há alguém que jura ter bebido com você.', did: 'Jogou 50 sessões na mesa ao vivo.', hint: '50 sessões na mesa ao vivo.', rarity: 'lendario', ...at((c) => c.sessions?.length ?? 0, 50) },
  { id: 'cavaleiro-errante', m: 'o Cavaleiro Errante', f: 'a Cavaleira Errante', lore: 'Nenhuma estrada é longa demais com uma boa montaria.', did: 'Conquistou uma montaria.', hint: 'Ter uma montaria.', rarity: 'comum', unlocked: (c) => (c.allies ?? []).some((a) => a.kind === 'montaria') },
  { id: 'senhor-das-feras', m: 'o Senhor das Feras', f: 'a Senhora das Feras', lore: 'Os animais da floresta param para ver passar.', did: 'Reuniu 2 companheiros, montarias ou familiares.', hint: 'Ter 2 companheiros, montarias ou familiares.', rarity: 'raro', ...at(party, 2) },
  { id: 'rei-do-bando', m: 'o Rei do Bando', f: 'a Rainha do Bando', lore: 'Anda com um pequeno exército de patas, asas e garras.', did: 'Reuniu 4 companheiros, montarias ou familiares.', hint: 'Ter 4 companheiros, montarias ou familiares.', rarity: 'epico', ...at(party, 4) },
  { id: 'portador-reliquia', m: 'o Portador da Relíquia', f: 'a Portadora da Relíquia', lore: 'Carrega algo que reis matariam para ter.', did: 'Carrega um item lendário.', hint: 'Ter um item lendário.', rarity: 'raro', unlocked: (c) => c.inventory.some((i) => i.rarity === 'lendario') },
  { id: 'colecionador', m: 'o Colecionador de Relíquias', f: 'a Colecionadora de Relíquias', lore: 'Magos invejam a sua mochila; ladrões sonham com ela.', did: 'Juntou 3 itens raros ou melhores.', hint: 'Ter 3 itens raros, muito raros ou lendários.', rarity: 'epico', ...at((c) => c.inventory.filter((i) => RELIC.has(i.rarity)).length, 3) },
  { id: 'tres-elos', m: 'o Portador dos Três Elos', f: 'a Portadora dos Três Elos', lore: 'Três objetos de poder respiram no mesmo ritmo que ele.', did: 'Sintonizou 3 itens mágicos.', hint: 'Sintonizar 3 itens mágicos.', rarity: 'raro', ...at((c) => c.inventory.filter((i) => i.attuned).length, 3) },
  { id: 'bolsa-pesada', ...same('Bolsa Pesada'), lore: 'O tilintar das moedas chega antes dele na taverna.', did: 'Juntou 1.000 PO.', hint: 'Juntar 1.000 PO na bolsa.', rarity: 'raro', ...at(gold, 1000) },
  { id: 'principe-mercador', m: 'o Príncipe Mercador', f: 'a Princesa Mercadora', lore: 'Guildas inteiras pedem empréstimo — e pagam juros.', did: 'Juntou 10.000 PO.', hint: 'Juntar 10.000 PO na bolsa.', rarity: 'epico', ...at(gold, 10000) },
  { id: 'barao-do-ouro', m: 'o Barão do Ouro', f: 'a Baronesa do Ouro', lore: 'Até os dragões perguntam onde guarda o tesouro.', did: 'Juntou 100.000 PO.', hint: 'Juntar 100.000 PO na bolsa.', rarity: 'lendario', ...at(gold, 100000) },
  { id: 'pe-rapado', m: 'o Pé-Rapado', f: 'a Pé-Rapada', lore: 'Salvou reinos, matou monstros — e ainda pede fiado na taverna.', did: 'Chegou ao nível 5 sem uma peça de ouro na bolsa.', hint: 'Nível 5 ou mais com a bolsa vazia (menos de 1 PO).', rarity: 'comum', secret: true, unlocked: (c) => c.level >= 5 && gold(c) < 1 },
  { id: 'talentoso', m: 'o Talentoso', f: 'a Talentosa', lore: 'Aprende num dia o que os outros levam anos.', did: 'Aprendeu 3 talentos.', hint: 'Ter 3 talentos.', rarity: 'raro', ...at((c) => c.feats?.length ?? 0, 3) },
  { id: 'mil-caminhos', ...same('Mil Caminhos'), lore: 'Nenhum mestre conseguiu prendê-lo a uma só escola.', did: 'Seguiu 3 classes diferentes.', hint: 'Ter 3 classes (multiclasse).', rarity: 'raro', ...at((c) => c.classLevels?.length ?? 1, 3) },

  // ---------- caminho do herói (nível) ----------
  { id: 'heroi-da-estrada', ...same('Herói da Estrada'), lore: 'As vilas começam a saber o seu nome.', did: 'Chegou ao nível 5.', hint: 'Chegar ao nível 5.', rarity: 'comum', ...at((c) => c.level, 5) },
  { id: 'campeao-do-reino', m: 'o Campeão do Reino', f: 'a Campeã do Reino', lore: 'Reis pedem conselho; inimigos pedem trégua.', did: 'Chegou ao nível 11.', hint: 'Chegar ao nível 11.', rarity: 'raro', ...at((c) => c.level, 11) },
  { id: 'semideus', m: 'o Semideus', f: 'a Semideusa', lore: 'Os templos discutem se ainda é mortal.', did: 'Chegou ao nível 17.', hint: 'Chegar ao nível 17.', rarity: 'epico', ...at((c) => c.level, 17) },
  { id: 'avatar', ...same('Avatar dos Deuses'), lore: 'Quando caminha, o mundo se ajeita para abrir passagem.', did: 'Chegou ao nível 20.', hint: 'Chegar ao nível 20.', rarity: 'lendario', ...at((c) => c.level, 20) },

  // ---------- alcunhas de classe (nível 10 na classe) ----------
  { id: 'cls-barbarian', cls: 'barbarian', ...same('Fúria Encarnada'), lore: 'Quando o grito começa, até os aliados recuam um passo.', did: 'Chegou ao nível 10 de Bárbaro.', hint: 'Bárbaro nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'barbarian'), 10) },
  { id: 'cls-bard', cls: 'bard', m: 'o Menestrel Eterno', f: 'a Menestrel Eterna', lore: 'Suas canções serão cantadas muito depois do último acorde.', did: 'Chegou ao nível 10 de Bardo.', hint: 'Bardo nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'bard'), 10) },
  { id: 'cls-cleric', cls: 'cleric', m: 'o Salvador', f: 'a Salvadora', lore: 'Mais de uma alma deve a vida a essas mãos.', did: 'Chegou ao nível 10 de Clérigo.', hint: 'Clérigo nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'cleric'), 10) },
  { id: 'cls-druid', cls: 'druid', ...same('Coração da Floresta'), lore: 'As árvores se inclinam para ouvir quando fala.', did: 'Chegou ao nível 10 de Druida.', hint: 'Druida nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'druid'), 10) },
  { id: 'cls-fighter', cls: 'fighter', ...same('Muralha de Aço'), lore: 'Nenhuma linha que segura jamais foi rompida.', did: 'Chegou ao nível 10 de Guerreiro.', hint: 'Guerreiro nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'fighter'), 10) },
  { id: 'cls-monk', cls: 'monk', ...same('Punho do Céu'), lore: 'Move-se como o vento e bate como o trovão.', did: 'Chegou ao nível 10 de Monge.', hint: 'Monge nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'monk'), 10) },
  { id: 'cls-paladin', cls: 'paladin', ...same('Escudo dos Inocentes'), lore: 'Onde há quem não possa lutar, há esse juramento.', did: 'Chegou ao nível 10 de Paladino.', hint: 'Paladino nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'paladin'), 10) },
  { id: 'cls-ranger', cls: 'ranger', m: 'o Caçador de Sombras', f: 'a Caçadora de Sombras', lore: 'Nenhuma presa escapa — nem as que andam no escuro.', did: 'Chegou ao nível 10 de Patrulheiro.', hint: 'Patrulheiro nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'ranger'), 10) },
  { id: 'cls-rogue', cls: 'rogue', ...same('Sombra Sem Nome'), lore: 'Ninguém sabe o rosto. Todos sabem o preço.', did: 'Chegou ao nível 10 de Ladino.', hint: 'Ladino nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'rogue'), 10) },
  { id: 'cls-sorcerer', cls: 'sorcerer', m: 'o Herdeiro do Caos', f: 'a Herdeira do Caos', lore: 'A magia não foi aprendida: nasceu no sangue, e quer sair.', did: 'Chegou ao nível 10 de Feiticeiro.', hint: 'Feiticeiro nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'sorcerer'), 10) },
  { id: 'cls-warlock', cls: 'warlock', m: 'Koschei, o Imortal', f: 'Baba Yaga', lore: 'Fez um pacto que nem os deuses ousam desfazer.', did: 'Chegou ao nível 10 de Bruxo.', hint: 'Bruxo nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'warlock'), 10) },
  { id: 'cls-wizard', cls: 'wizard', m: 'o Arquimago', f: 'a Arquimaga', lore: 'As bibliotecas de três reinos guardam seus tratados.', did: 'Chegou ao nível 10 de Mago.', hint: 'Mago nível 10.', rarity: 'epico', ...at((c) => classLv(c, 'wizard'), 10) },

  // ---------- alcunhas de povo (nível 8) ----------
  { id: 'race-human', race: 'human', m: 'o Incansável', f: 'a Incansável', lore: 'Vive pouco, então vive tudo de uma vez.', did: 'Chegou ao nível 8 como Humano.', hint: 'Humano nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'human' && c.level >= 8 },
  { id: 'race-elf', race: 'elf', ...same('Estrela do Crepúsculo'), lore: 'Viu reinos nascerem e caírem — e ainda canta para eles.', did: 'Chegou ao nível 8 como Elfo.', hint: 'Elfo nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'elf' && c.level >= 8 },
  { id: 'race-dwarf', race: 'dwarf', ...same('Martelo da Montanha'), lore: 'As montanhas lembram o nome de cada clã. Agora lembram o seu.', did: 'Chegou ao nível 8 como Anão.', hint: 'Anão nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'dwarf' && c.level >= 8 },
  { id: 'race-halfling', race: 'halfling', ...same('Pé-Leve'), lore: 'Ninguém espera muito de alguém tão pequeno. Esse é sempre o erro.', did: 'Chegou ao nível 8 como Halfling.', hint: 'Halfling nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'halfling' && c.level >= 8 },
  { id: 'race-half-elf', race: 'half-elf', ...same('Ponte Entre Dois Mundos'), lore: 'Nem cá nem lá — e por isso bem-vindo em toda parte.', did: 'Chegou ao nível 8 como Meio-elfo.', hint: 'Meio-elfo nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'half-elf' && c.level >= 8 },
  { id: 'race-half-orc', race: 'half-orc', ...same('Presas de Ferro'), lore: 'Herdou a força de um povo e a teimosia do outro.', did: 'Chegou ao nível 8 como Meio-orc.', hint: 'Meio-orc nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'half-orc' && c.level >= 8 },
  { id: 'race-gnome', race: 'gnome', m: 'o Engenhoso', f: 'a Engenhosa', lore: 'Já consertou um golem com um garfo e muita convicção.', did: 'Chegou ao nível 8 como Gnomo.', hint: 'Gnomo nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'gnome' && c.level >= 8 },
  { id: 'race-tiefling', race: 'tiefling', ...same('Chama Infernal'), lore: 'Os chifres assustam. O que vem depois, mais ainda.', did: 'Chegou ao nível 8 como Tiefling.', hint: 'Tiefling nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'tiefling' && c.level >= 8 },
  { id: 'race-dragonborn', race: 'dragonborn', m: 'o Herdeiro dos Dragões', f: 'a Herdeira dos Dragões', lore: 'O sangue ferve como o dos antigos wyrms — e eles o reconhecem.', did: 'Chegou ao nível 8 como Draconato.', hint: 'Draconato nível 8.', rarity: 'raro', unlocked: (c) => c.raceId === 'dragonborn' && c.level >= 8 },

  // ---------- ápice da classe (nível 20 na classe) ----------
  { id: 'cls20-barbarian', cls: 'barbarian', m: 'o Rei Bárbaro', f: 'a Rainha Bárbara', lore: 'Tribos inteiras se ajoelham quando o tambor de guerra soa.', did: 'Chegou ao nível 20 de Bárbaro.', hint: 'Bárbaro nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'barbarian'), 20) },
  { id: 'cls20-bard', cls: 'bard', ...same('Voz que Move Reinos'), lore: 'Uma canção começou uma guerra; outra acabou com ela.', did: 'Chegou ao nível 20 de Bardo.', hint: 'Bardo nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'bard'), 20) },
  { id: 'cls20-cleric', cls: 'cleric', m: 'o Escolhido dos Deuses', f: 'a Escolhida dos Deuses', lore: 'Quando ora, os deuses não só ouvem: respondem em pessoa.', did: 'Chegou ao nível 20 de Clérigo.', hint: 'Clérigo nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'cleric'), 20) },
  { id: 'cls20-druid', cls: 'druid', ...same('Voz das Estações'), lore: 'O inverno espera a sua permissão para chegar.', did: 'Chegou ao nível 20 de Druida.', hint: 'Druida nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'druid'), 20) },
  { id: 'cls20-fighter', cls: 'fighter', m: 'o Mestre de Armas', f: 'a Mestra de Armas', lore: 'Não existe arma que não aprenda a obedecer às suas mãos.', did: 'Chegou ao nível 20 de Guerreiro.', hint: 'Guerreiro nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'fighter'), 20) },
  { id: 'cls20-monk', cls: 'monk', m: 'o Grão-Mestre', f: 'a Grã-Mestra', lore: 'Mosteiros inteiros guardam silêncio quando entra.', did: 'Chegou ao nível 20 de Monge.', hint: 'Monge nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'monk'), 20) },
  { id: 'cls20-paladin', cls: 'paladin', ...same('Juramento Vivo'), lore: 'Não carrega um juramento: virou um.', did: 'Chegou ao nível 20 de Paladino.', hint: 'Paladino nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'paladin'), 20) },
  { id: 'cls20-ranger', cls: 'ranger', m: 'o Senhor das Trilhas', f: 'a Senhora das Trilhas', lore: 'Não existe floresta onde se perca, nem presa que perca de vista.', did: 'Chegou ao nível 20 de Patrulheiro.', hint: 'Patrulheiro nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'ranger'), 20) },
  { id: 'cls20-rogue', cls: 'rogue', ...same('Mão Invisível'), lore: 'Reis acordam sem a coroa e não sabem como.', did: 'Chegou ao nível 20 de Ladino.', hint: 'Ladino nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'rogue'), 20) },
  { id: 'cls20-sorcerer', cls: 'sorcerer', ...same('Tormenta Arcana'), lore: 'A magia já não cabe no corpo: transborda pelo ar.', did: 'Chegou ao nível 20 de Feiticeiro.', hint: 'Feiticeiro nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'sorcerer'), 20) },
  { id: 'cls20-warlock', cls: 'warlock', m: 'o Arauto do Patrono', f: 'a Arauta do Patrono', lore: 'Quem fala com ele sente que outra coisa está escutando.', did: 'Chegou ao nível 20 de Bruxo.', hint: 'Bruxo nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'warlock'), 20) },
  { id: 'cls20-wizard', cls: 'wizard', m: 'o Tecelão da Realidade', f: 'a Tecelã da Realidade', lore: 'Reescreve as regras do mundo com uma frase.', did: 'Chegou ao nível 20 de Mago.', hint: 'Mago nível 20.', rarity: 'lendario', ...at((c) => classLv(c, 'wizard'), 20) },
];

export const TITLE_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

/** O título na forma do gênero do personagem. */
export function titleName(t: TitleDef, gender: Character['gender'] | undefined): string {
  return gender === 'fem' ? t.f : t.m;
}

/** Títulos que valem para este herói (as alcunhas de classe só das classes dele). */
export function titlesFor(c: Character): TitleDef[] {
  const classes = new Set([c.classId, ...(c.classLevels ?? []).map((x) => x.classId)]);
  return TITLES.filter((t) => (!t.cls || classes.has(t.cls)) && (!t.race || t.race === c.raceId));
}

/** Títulos que o herói já pode usar. */
export function availableTitles(c: Character): TitleDef[] {
  return TITLES.filter((t) => safe(() => t.unlocked(c)));
}

/** Título escolhido, já na forma certa (só vale se estiver liberado). */
export function heroTitle(c: Character | null | undefined): string | null {
  const t = c?.title ? TITLE_BY_ID[c.title] : undefined;
  return c && t && safe(() => t.unlocked(c)) ? titleName(t, c.gender) : null;
}

/** Definição do título escolhido (só se estiver liberado). */
export function heroTitleDef(c: Character | null | undefined): TitleDef | null {
  const t = c?.title ? TITLE_BY_ID[c.title] : undefined;
  return c && t && safe(() => t.unlocked(c)) ? t : null;
}

/** Quanto o herói já tem num título de contagem (null = título sem contagem). */
export function titleProgress(t: TitleDef, c: Character): { have: number; need: number } | null {
  if (!t.have || t.need === undefined) return null;
  let have = 0;
  try {
    have = Math.max(0, Math.floor(t.have(c)));
  } catch {
    have = 0;
  }
  return { have, need: t.need };
}

/** O que o herói fez para merecer o título ("Deu 25 golpes finais — já são 34."). */
export function titleDeed(t: TitleDef, c: Character): string {
  const p = titleProgress(t, c);
  return p && p.have > p.need ? `${t.did.replace(/\.$/, '')} — já são ${p.have.toLocaleString('pt-BR')}.` : t.did;
}

/** Título escolhido + o que o herói fez, numa linha (para tooltip). */
export function heroTitleTip(c: Character | null | undefined): string | undefined {
  const t = heroTitleDef(c);
  return t && c ? `${t.lore}\nComo conquistou: ${titleDeed(t, c)}` : undefined;
}

/** Fichas antigas ou de outras versões (snapshot da mesa) não derrubam a tela. */
function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}
