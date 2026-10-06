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
  rarity: DeedRarity;
  /** Aparece como "???" até ser liberado. */
  secret?: boolean;
  /** Alcunha de classe: só entra na lista de quem tem essa classe. */
  cls?: string;
  unlocked: (c: Character) => boolean;
}

const n = (c: Character, k: keyof DeedCounts) => c.deeds?.counts?.[k] ?? 0;
/** Nível numa classe (multiclasse conta cada uma). */
const classLv = (c: Character, id: string) => (c.classLevels?.length ? c.classLevels.find((x) => x.classId === id)?.level ?? 0 : c.classId === id ? c.level : 0);
const same = (t: string) => ({ m: t, f: t });

export const TITLES: TitleDef[] = [
  // ---------- sangue e aço ----------
  { id: 'lamina-sangrenta', ...same('Lâmina Sangrenta'), lore: 'A lâmina já não volta limpa para a bainha.', hint: '10 golpes finais.', rarity: 'comum', unlocked: (c) => n(c, 'kills') >= 10 },
  { id: 'carniceiro', m: 'o Carniceiro', f: 'a Carniceira', lore: 'Os campos de batalha ficam em silêncio quando chega.', hint: '25 golpes finais.', rarity: 'raro', unlocked: (c) => n(c, 'kills') >= 25 },
  { id: 'ceifador', m: 'o Ceifador', f: 'a Ceifadora', lore: 'Onde passa, a colheita é sempre farta — e vermelha.', hint: '50 golpes finais.', rarity: 'epico', unlocked: (c) => n(c, 'kills') >= 50 },
  { id: 'deus-da-guerra', m: 'Deus da Guerra', f: 'Deusa da Guerra', lore: 'Bardos juram que nenhum exército sobreviveu à sua fúria.', hint: '100 golpes finais.', rarity: 'lendario', unlocked: (c) => n(c, 'kills') >= 100 },

  // ---------- monstros ----------
  { id: 'coracao-de-dragao', ...same('Coração de Dragão'), lore: 'Bebeu do sangue de um wyrm e não queimou por dentro.', hint: 'Derrubar um dragão.', rarity: 'epico', unlocked: (c) => n(c, 'dragons') >= 1 },
  { id: 'senhor-dos-wyrms', m: 'o Senhor dos Wyrms', f: 'a Senhora dos Wyrms', lore: 'Os dragões contam histórias sobre esse nome para assustar os filhotes.', hint: 'Derrubar 3 dragões.', rarity: 'lendario', unlocked: (c) => n(c, 'dragons') >= 3 },
  { id: 'quebra-montanhas', ...same('Quebra-Montanhas'), lore: 'Fez tombar o que parecia ser parte da paisagem.', hint: 'Derrubar um gigante.', rarity: 'raro', unlocked: (c) => n(c, 'giants') >= 1 },
  { id: 'luz-das-criptas', ...same('Luz das Criptas'), lore: 'Os mortos voltam a descansar quando essa tocha passa.', hint: 'Devolver 10 mortos-vivos ao túmulo.', rarity: 'raro', unlocked: (c) => n(c, 'undead') >= 10 },
  { id: 'martelo-dos-infernos', ...same('Martelo dos Infernos'), lore: 'Há um nome escrito nas paredes do Abismo — e não é um elogio.', hint: 'Derrubar um demônio ou diabo.', rarity: 'raro', unlocked: (c) => n(c, 'fiends') >= 1 },
  { id: 'inquisidor', m: 'o Inquisidor', f: 'a Inquisidora', lore: 'Corruptores sussurram uns aos outros para não cruzar seu caminho.', hint: 'Derrubar 5 demônios ou diabos.', rarity: 'epico', unlocked: (c) => n(c, 'fiends') >= 5 },
  { id: 'matador-de-titas', m: 'o Matador de Titãs', f: 'a Matadora de Titãs', lore: 'Ninguém apostava uma moeda de cobre. Ainda bem.', hint: 'Golpe final numa criatura de ND maior que o seu nível.', rarity: 'epico', secret: true, unlocked: (c) => n(c, 'upsets') >= 1 },
  { id: 'lenda-viva', ...same('Lenda Viva'), lore: 'Já derrubou três vezes o que era maior que o próprio destino.', hint: '3 golpes finais em criaturas de ND maior que o seu nível.', rarity: 'lendario', secret: true, unlocked: (c) => n(c, 'upsets') >= 3 },

  // ---------- sorte e destino ----------
  { id: 'abencoado-tymora', m: 'o Abençoado por Tymora', f: 'a Abençoada por Tymora', lore: 'A Senhora da Sorte sorri — e às vezes pisca.', hint: '10 vinte naturais.', rarity: 'raro', unlocked: (c) => n(c, 'crits') >= 10 },
  { id: 'mao-do-destino', ...same('Mão do Destino'), lore: 'O que toca, acontece. Os oráculos já desistiram de prever.', hint: '50 vinte naturais.', rarity: 'lendario', unlocked: (c) => n(c, 'crits') >= 50 },
  { id: 'tempestade-viva', ...same('Tempestade Viva'), lore: 'Numa só noite, o céu inteiro caiu sobre os inimigos.', hint: '3 vinte naturais no mesmo dia.', rarity: 'epico', secret: true, unlocked: (c) => n(c, 'critBursts') >= 1 },
  { id: 'amaldicoado-beshaba', m: 'o Amaldiçoado por Beshaba', f: 'a Amaldiçoada por Beshaba', lore: 'A Donzela do Infortúnio tem um favorito. Infelizmente.', hint: '20 uns naturais.', rarity: 'raro', unlocked: (c) => n(c, 'fumbles') >= 20 },
  { id: 'toque-fatal', ...same('Toque Fatal'), lore: 'Bastou um gesto simples — e o inimigo não levantou mais.', hint: 'Golpe final com um truque.', rarity: 'raro', secret: true, unlocked: (c) => n(c, 'cantripKills') >= 1 },

  // ---------- morte e volta ----------
  { id: 'fio-da-navalha', ...same('Fio da Navalha'), lore: 'Vive sempre a um suspiro do fim — e gosta.', hint: 'Levar um golpe e ficar com 1 PV.', rarity: 'raro', secret: true, unlocked: (c) => n(c, 'clutch') >= 1 },
  { id: 'sangue-de-fenix', ...same('Sangue de Fênix'), lore: 'Caiu três vezes. Levantou três vezes.', hint: 'Cair a 0 PV e voltar 3 vezes.', rarity: 'epico', unlocked: (c) => n(c, 'comebacks') >= 3 },
  { id: 'imortal', m: 'o Imortal', f: 'a Imortal', lore: 'A Rainha Corvo já marcou esse nome cinco vezes — e cinco vezes errou.', hint: 'Cair a 0 PV e voltar 5 vezes.', rarity: 'lendario', unlocked: (c) => n(c, 'comebacks') >= 5 },
  { id: 'voltou-do-vale', m: 'o Que Voltou do Vale', f: 'a Que Voltou do Vale', lore: 'Olhou a morte nos olhos, riu e voltou andando.', hint: '20 natural num Teste contra a Morte.', rarity: 'epico', secret: true, unlocked: (c) => n(c, 'deathSaveCrits') >= 1 },
  { id: 'imperador-da-loucura', m: 'o Imperador da Loucura', f: 'a Imperatriz da Loucura', lore: 'Corre para o perigo como quem corre para casa.', hint: 'Cair a 0 PV 5 vezes.', rarity: 'epico', unlocked: (c) => n(c, 'downs') >= 5 },

  // ---------- marcas da estrada ----------
  { id: 'marcado', m: 'o Marcado', f: 'a Marcada', lore: 'Cada cicatriz tem uma história — e um inimigo que não está mais aqui.', hint: '3 cicatrizes na carta.', rarity: 'raro', unlocked: (c) => (c.scars?.length ?? 0) >= 3 },
  { id: 'mil-cicatrizes', ...same('Mil Cicatrizes'), lore: 'A pele virou um mapa das guerras que venceu.', hint: '6 cicatrizes na carta.', rarity: 'epico', unlocked: (c) => (c.scars?.length ?? 0) >= 6 },
  { id: 'veterano', m: 'o Veterano', f: 'a Veterana', lore: 'Já viu de tudo nas estradas — e sobreviveu para contar.', hint: '10 sessões na mesa ao vivo.', rarity: 'raro', unlocked: (c) => (c.sessions?.length ?? 0) >= 10 },
  { id: 'velho-lobo', m: 'o Velho Lobo', f: 'a Velha Loba', lore: 'Os jovens aventureiros pagam bebida só para ouvir uma história.', hint: '25 sessões na mesa ao vivo.', rarity: 'epico', unlocked: (c) => (c.sessions?.length ?? 0) >= 25 },
  { id: 'cavaleiro-errante', m: 'o Cavaleiro Errante', f: 'a Cavaleira Errante', lore: 'Nenhuma estrada é longa demais com uma boa montaria.', hint: 'Ter uma montaria.', rarity: 'comum', unlocked: (c) => (c.allies ?? []).some((a) => a.kind === 'montaria') },
  { id: 'senhor-das-feras', m: 'o Senhor das Feras', f: 'a Senhora das Feras', lore: 'Os animais da floresta param para ver passar.', hint: 'Ter 2 companheiros, montarias ou familiares.', rarity: 'raro', unlocked: (c) => (c.allies?.length ?? 0) + (c.companion !== undefined && classLv(c, 'ranger') >= 3 ? 1 : 0) >= 2 },
  { id: 'portador-reliquia', m: 'o Portador da Relíquia', f: 'a Portadora da Relíquia', lore: 'Carrega algo que reis matariam para ter.', hint: 'Ter um item lendário.', rarity: 'raro', unlocked: (c) => c.inventory.some((i) => i.rarity === 'lendario') },

  // ---------- caminho do herói (nível) ----------
  { id: 'heroi-da-estrada', ...same('Herói da Estrada'), lore: 'As vilas começam a saber o seu nome.', hint: 'Chegar ao nível 5.', rarity: 'comum', unlocked: (c) => c.level >= 5 },
  { id: 'campeao-do-reino', m: 'o Campeão do Reino', f: 'a Campeã do Reino', lore: 'Reis pedem conselho; inimigos pedem trégua.', hint: 'Chegar ao nível 11.', rarity: 'raro', unlocked: (c) => c.level >= 11 },
  { id: 'semideus', m: 'o Semideus', f: 'a Semideusa', lore: 'Os templos discutem se ainda é mortal.', hint: 'Chegar ao nível 17.', rarity: 'epico', unlocked: (c) => c.level >= 17 },
  { id: 'avatar', ...same('Avatar dos Deuses'), lore: 'Quando caminha, o mundo se ajeita para abrir passagem.', hint: 'Chegar ao nível 20.', rarity: 'lendario', unlocked: (c) => c.level >= 20 },

  // ---------- alcunhas de classe (nível 10 na classe) ----------
  { id: 'cls-barbarian', cls: 'barbarian', ...same('Fúria Encarnada'), lore: 'Quando o grito começa, até os aliados recuam um passo.', hint: 'Bárbaro nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'barbarian') >= 10 },
  { id: 'cls-bard', cls: 'bard', m: 'o Menestrel Eterno', f: 'a Menestrel Eterna', lore: 'Suas canções serão cantadas muito depois do último acorde.', hint: 'Bardo nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'bard') >= 10 },
  { id: 'cls-cleric', cls: 'cleric', m: 'o Salvador', f: 'a Salvadora', lore: 'Mais de uma alma deve a vida a essas mãos.', hint: 'Clérigo nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'cleric') >= 10 },
  { id: 'cls-druid', cls: 'druid', ...same('Coração da Floresta'), lore: 'As árvores se inclinam para ouvir quando fala.', hint: 'Druida nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'druid') >= 10 },
  { id: 'cls-fighter', cls: 'fighter', ...same('Muralha de Aço'), lore: 'Nenhuma linha que segura jamais foi rompida.', hint: 'Guerreiro nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'fighter') >= 10 },
  { id: 'cls-monk', cls: 'monk', ...same('Punho do Céu'), lore: 'Move-se como o vento e bate como o trovão.', hint: 'Monge nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'monk') >= 10 },
  { id: 'cls-paladin', cls: 'paladin', ...same('Escudo dos Inocentes'), lore: 'Onde há quem não possa lutar, há esse juramento.', hint: 'Paladino nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'paladin') >= 10 },
  { id: 'cls-ranger', cls: 'ranger', m: 'o Caçador de Sombras', f: 'a Caçadora de Sombras', lore: 'Nenhuma presa escapa — nem as que andam no escuro.', hint: 'Patrulheiro nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'ranger') >= 10 },
  { id: 'cls-rogue', cls: 'rogue', ...same('Sombra Sem Nome'), lore: 'Ninguém sabe o rosto. Todos sabem o preço.', hint: 'Ladino nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'rogue') >= 10 },
  { id: 'cls-sorcerer', cls: 'sorcerer', m: 'o Herdeiro do Caos', f: 'a Herdeira do Caos', lore: 'A magia não foi aprendida: nasceu no sangue, e quer sair.', hint: 'Feiticeiro nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'sorcerer') >= 10 },
  { id: 'cls-warlock', cls: 'warlock', m: 'Koschei, o Imortal', f: 'Baba Yaga', lore: 'Fez um pacto que nem os deuses ousam desfazer.', hint: 'Bruxo nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'warlock') >= 10 },
  { id: 'cls-wizard', cls: 'wizard', m: 'o Arquimago', f: 'a Arquimaga', lore: 'As bibliotecas de três reinos guardam seus tratados.', hint: 'Mago nível 10.', rarity: 'epico', unlocked: (c) => classLv(c, 'wizard') >= 10 },
];

export const TITLE_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

/** O título na forma do gênero do personagem. */
export function titleName(t: TitleDef, gender: Character['gender'] | undefined): string {
  return gender === 'fem' ? t.f : t.m;
}

/** Títulos que valem para este herói (as alcunhas de classe só das classes dele). */
export function titlesFor(c: Character): TitleDef[] {
  const classes = new Set([c.classId, ...(c.classLevels ?? []).map((x) => x.classId)]);
  return TITLES.filter((t) => !t.cls || classes.has(t.cls));
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

/** Fichas antigas ou de outras versões (snapshot da mesa) não derrubam a tela. */
function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}
