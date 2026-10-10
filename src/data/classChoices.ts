/**
 * Escolhas de classe por nível — D&D 5e 2014 (Livro do Jogador).
 * Resumos em português com palavras próprias (sem texto oficial).
 *
 * Um `ChoiceSpec` diz: "ao atingir o nível N desta classe/subclasse, escolha
 * X opções do catálogo Y". As escolhas ficam guardadas na ficha em
 * `char.choices[chave]` e ACUMULAM entre níveis (ex.: Metamagia 2 no 3º,
 * +1 no 10º, +1 no 17º → 4 no total).
 */
import { TOOLS } from './tools';
import { WEAPONS } from './weapons';
import { SKILLS } from './skills';
import { SPELL_BY_ID } from './spells';
import { LAND_SPELLS } from './subclassSpells';
import { COMPANION_BEASTS } from './beasts';

export interface ChoiceOption {
  id: string;
  label: string;
  desc: string;
  /** Rótulo curto extra (custo, dano, pré-requisito…). */
  tag?: string;
  /** Pré-requisito: nível mínimo na classe, pacto escolhido ou magia conhecida. */
  prereq?: { level?: number; pact?: string; spell?: string };
}

export interface ChoiceSpec {
  /** Chave de armazenamento (sem prefixo de classe) — acumula entre níveis. */
  key: string;
  /** Catálogo de opções. */
  catalog: CatalogId;
  label: string;
  /** Quantas escolher neste nível. */
  count: number;
  /** Explicação curta mostrada acima das opções. */
  hint?: string;
  /** Restringe o catálogo (ex.: estilos permitidos ao Paladino). */
  only?: string[];
  /** Pode trocar uma opção antiga por outra ao ganhar novas (Manobras, Invocações). */
  canReplace?: boolean;
  /** Catálogo `spell`: de quais listas e de que círculo (exato ou até o maior espaço da classe). */
  spell?: { classes?: string[]; circle?: number; upToSlots?: boolean; schools?: string[] };
  /** Só aparece se outra escolha da mesma classe tiver esta opção (ex.: Pacto do Tomo) — ou uma de `anyOf`. */
  requires?: { key: string; id: string; anyOf?: string[] };
  /** Opções que não contam no limite de magias conhecidas/truques (ex.: Livro das Sombras). */
  bonusSpells?: boolean;
}

export type CatalogId =
  | 'metamagic'
  | 'dragonAncestor'
  | 'fightingStyle'
  | 'maneuver'
  | 'artisanTool'
  | 'totemSpirit'
  | 'totemAspect'
  | 'totemAttunement'
  | 'skill'
  | 'druidLand'
  | 'discipline'
  | 'favoredEnemy'
  | 'favoredTerrain'
  | 'hunterPrey'
  | 'hunterTactics'
  | 'hunterMultiattack'
  | 'hunterDefense'
  | 'pactBoon'
  | 'invocation'
  | 'language'
  | 'beast'
  | 'instrument'
  | 'monkTool'
  | 'weapon'
  /** Magias da biblioteca, filtradas pelo `spell` da escolha. */
  | 'spell';

/* ------------------------------------------------------------------ */
/* Catálogos                                                           */
/* ------------------------------------------------------------------ */

export const METAMAGIC: ChoiceOption[] = [
  { id: 'careful', label: 'Magia Cuidadosa', tag: '1 ponto', desc: 'Ao conjurar magia que pede salvaguarda, escolha até o seu mod. de Carisma em criaturas (mín. 1): elas passam automaticamente.' },
  { id: 'distant', label: 'Magia Distante', tag: '1 ponto', desc: 'Dobra o alcance de uma magia de 1,5 m ou mais; magias de toque passam a ter alcance de 9 m.' },
  { id: 'empowered', label: 'Magia Potencializada', tag: '1 ponto', desc: 'Rola de novo até o seu mod. de Carisma em dados de dano (mín. 1) e fica com os novos. Pode ser usada junto com outra Metamagia.' },
  { id: 'extended', label: 'Magia Estendida', tag: '1 ponto', desc: 'Dobra a duração de uma magia de 1 minuto ou mais (máximo de 24 horas).' },
  { id: 'heightened', label: 'Magia Elevada', tag: '3 pontos', desc: 'Um alvo da magia tem desvantagem na primeira salvaguarda contra ela.' },
  { id: 'quickened', label: 'Magia Acelerada', tag: '2 pontos', desc: 'Uma magia de 1 ação passa a ser conjurada com uma ação bônus.' },
  { id: 'subtle', label: 'Magia Sutil', tag: '1 ponto', desc: 'Conjura sem componentes verbais nem somáticos — ninguém percebe o gesto ou a palavra.' },
  { id: 'twinned', label: 'Magia Gêmea', tag: 'pontos = círculo', desc: 'Uma magia que afeta só uma criatura (e não tem alcance pessoal) mira uma segunda criatura. Custa pontos iguais ao círculo (1 para truques).' },
];

export const DRAGON_ANCESTOR: ChoiceOption[] = [
  { id: 'black', label: 'Dragão Negro', tag: 'ácido', desc: 'Seu dano ligado à linhagem é de ácido.' },
  { id: 'blue', label: 'Dragão Azul', tag: 'elétrico', desc: 'Seu dano ligado à linhagem é elétrico.' },
  { id: 'brass', label: 'Dragão de Latão', tag: 'fogo', desc: 'Seu dano ligado à linhagem é de fogo.' },
  { id: 'bronze', label: 'Dragão de Bronze', tag: 'elétrico', desc: 'Seu dano ligado à linhagem é elétrico.' },
  { id: 'copper', label: 'Dragão de Cobre', tag: 'ácido', desc: 'Seu dano ligado à linhagem é de ácido.' },
  { id: 'gold', label: 'Dragão de Ouro', tag: 'fogo', desc: 'Seu dano ligado à linhagem é de fogo.' },
  { id: 'green', label: 'Dragão Verde', tag: 'veneno', desc: 'Seu dano ligado à linhagem é de veneno.' },
  { id: 'red', label: 'Dragão Vermelho', tag: 'fogo', desc: 'Seu dano ligado à linhagem é de fogo.' },
  { id: 'silver', label: 'Dragão de Prata', tag: 'frio', desc: 'Seu dano ligado à linhagem é de frio.' },
  { id: 'white', label: 'Dragão Branco', tag: 'frio', desc: 'Seu dano ligado à linhagem é de frio.' },
];

export const FIGHTING_STYLES: ChoiceOption[] = [
  { id: 'archery', label: 'Arquearia', tag: '+2 ataque à distância', desc: '+2 nas jogadas de ataque com armas à distância.' },
  { id: 'defense', label: 'Defesa', tag: '+1 CA', desc: '+1 na CA enquanto estiver usando armadura.' },
  { id: 'dueling', label: 'Duelo', tag: '+2 dano', desc: '+2 de dano com arma corpo a corpo empunhada em uma mão, sem nenhuma outra arma.' },
  { id: 'gwf', label: 'Combate com Armas Grandes', desc: 'Com arma de duas mãos ou versátil usada com as duas mãos, rola de novo resultados 1 ou 2 no dado de dano (fica com o novo).' },
  { id: 'protection', label: 'Proteção', desc: 'Com escudo: quando uma criatura que você vê ataca outro alvo a até 1,5 m de você, sua reação impõe desvantagem no ataque.' },
  { id: 'twf', label: 'Combate com Duas Armas', desc: 'Soma o modificador de atributo ao dano do ataque da segunda arma.' },
];

export const MANEUVERS: ChoiceOption[] = [
  { id: 'commanders', label: 'Ataque de Comando', desc: 'Abre mão de um dos seus ataques: um aliado usa a reação para atacar e soma o dado de superioridade ao dano.' },
  { id: 'disarming', label: 'Ataque Desarmante', desc: 'Soma o dado ao dano; o alvo faz salvaguarda de FOR ou larga um item que esteja segurando.' },
  { id: 'distracting', label: 'Ataque Distrativo', desc: 'Soma o dado ao dano; o próximo ataque de outra criatura contra o alvo tem vantagem.' },
  { id: 'evasive', label: 'Passo Evasivo', desc: 'Ao se mover, rola o dado e soma à sua CA até terminar o movimento.' },
  { id: 'feinting', label: 'Ataque Fingido', desc: 'Ação bônus: vantagem no próximo ataque contra uma criatura a 1,5 m; se acertar, soma o dado ao dano.' },
  { id: 'goading', label: 'Ataque Provocador', desc: 'Soma o dado ao dano; o alvo (salvaguarda de SAB) tem desvantagem para atacar alguém que não seja você.' },
  { id: 'lunging', label: 'Ataque de Estocada', desc: 'Aumenta o alcance corpo a corpo desse ataque em 1,5 m; se acertar, soma o dado ao dano.' },
  { id: 'maneuvering', label: 'Ataque de Manobra', desc: 'Soma o dado ao dano; um aliado usa a reação para se mover metade do deslocamento sem provocar ataque do alvo.' },
  { id: 'menacing', label: 'Ataque Ameaçador', desc: 'Soma o dado ao dano; o alvo faz salvaguarda de SAB ou fica amedrontado até o fim do seu próximo turno.' },
  { id: 'parry', label: 'Aparar', desc: 'Reação ao ser atingido corpo a corpo: reduz o dano em dado + mod. de DES.' },
  { id: 'precision', label: 'Ataque Preciso', desc: 'Soma o dado à jogada de ataque (antes ou depois de rolar, antes do resultado).' },
  { id: 'pushing', label: 'Ataque de Empurrão', desc: 'Soma o dado ao dano; alvo Grande ou menor faz salvaguarda de FOR ou é empurrado 4,5 m.' },
  { id: 'rally', label: 'Reunir', desc: 'Ação bônus: um aliado ganha PV temporários iguais ao dado + seu mod. de Carisma.' },
  { id: 'riposte', label: 'Contra-ataque', desc: 'Reação quando uma criatura erra você corpo a corpo: ataca de volta e soma o dado ao dano.' },
  { id: 'sweeping', label: 'Ataque Amplo', desc: 'Ao acertar, outra criatura a 1,5 m do alvo e ao seu alcance sofre dano igual ao dado (se o ataque também a acertaria).' },
  { id: 'trip', label: 'Ataque de Derrubada', desc: 'Soma o dado ao dano; alvo Grande ou menor faz salvaguarda de FOR ou fica caído.' },
];

/** Ferramentas de artesão (Estudioso da Guerra do Mestre de Batalha) — vêm do cadastro de ferramentas. */
/* ---------- Bárbaro · Guerreiro Totêmico (3º, 6º, 14º) ---------- */
export const TOTEM_SPIRIT: ChoiceOption[] = [
  { id: 'bear', label: 'Urso', desc: 'Em fúria, resistência a todo dano exceto psíquico.' },
  { id: 'eagle', label: 'Águia', desc: 'Em fúria e sem armadura pesada, ataques de oportunidade contra você têm desvantagem e você pode Disparar como ação bônus.' },
  { id: 'wolf', label: 'Lobo', desc: 'Em fúria, seus aliados têm vantagem em ataques corpo a corpo contra inimigos a 1,5 m de você.' },
];
export const TOTEM_ASPECT: ChoiceOption[] = [
  { id: 'bear', label: 'Urso', desc: 'Capacidade de carga dobrada e vantagem em testes de FOR para empurrar, puxar, erguer ou quebrar.' },
  { id: 'eagle', label: 'Águia', desc: 'Enxerga até 1,6 km com nitidez e a penumbra não prejudica sua Percepção.' },
  { id: 'wolf', label: 'Lobo', desc: 'Rastreia em ritmo acelerado e pode se mover furtivamente em ritmo normal.' },
];
export const TOTEM_ATTUNEMENT: ChoiceOption[] = [
  { id: 'bear', label: 'Urso', desc: 'Em fúria, inimigos a 1,5 m têm desvantagem para atacar outros alvos que não você (se puderem vê-lo e ouvi-lo e não resistirem a amedrontar).' },
  { id: 'eagle', label: 'Águia', desc: 'Em fúria, ganha deslocamento de voo igual ao seu deslocamento (cai se terminar o turno no ar).' },
  { id: 'wolf', label: 'Lobo', desc: 'Em fúria, ao acertar corpo a corpo uma criatura Grande ou menor, pode derrubá-la com uma ação bônus.' },
];

/* ---------- Bardo · Colégio do Conhecimento: perícias (3º) ---------- */
export const SKILL_OPTIONS: ChoiceOption[] = SKILLS.map((sk) => ({
  id: sk.key,
  label: sk.label,
  desc: `Proficiência em ${sk.label} (${sk.ability.toUpperCase()}).`,
}));

/* ---------- Druida · Círculo da Terra: terreno (3º) ---------- */
const LAND_LABELS: [string, string][] = [
  ['arctic', 'Ártico'], ['coast', 'Costa'], ['desert', 'Deserto'], ['forest', 'Floresta'],
  ['grassland', 'Pradaria'], ['mountain', 'Montanha'], ['swamp', 'Pântano'], ['underdark', 'Subterrâneo'],
];
export const DRUID_LANDS: ChoiceOption[] = LAND_LABELS.map(([id, label]) => ({
  id,
  label,
  desc:
    'Magias de círculo: ' +
    Object.entries(LAND_SPELLS[id])
      .map(([lv, ids]) => `${lv}º nível — ${ids.map((sid) => SPELL_BY_ID[sid]?.name.toLowerCase() ?? sid).join(', ')}`)
      .join(' · ') +
    '.',
}));

/* ---------- Monge · Quatro Elementos: disciplinas (3º, 6º, 11º, 17º) ---------- */
export const ELEMENTAL_DISCIPLINES: ChoiceOption[] = [
  { id: 'fangs', label: 'Presas da Serpente de Fogo', tag: '1 ki', desc: 'Na ação de Ataque, seus golpes desarmados ganham +3 m de alcance e causam fogo; gaste 1 ki num acerto para +1d10 de fogo.' },
  { id: 'fourThunders', label: 'Punho dos Quatro Trovões', tag: '2 ki', desc: 'Conjura onda trovejante.' },
  { id: 'unbrokenAir', label: 'Punho do Ar Inquebrável', tag: '2 ki', desc: 'Rajada de ar a 9 m: salvaguarda de FOR ou 3d10 de concussão (+1d10 por ki extra), empurrada 6 m e caída.' },
  { id: 'galeSpirits', label: 'Ímpeto dos Espíritos do Vendaval', tag: '2 ki', desc: 'Conjura lufada de vento.' },
  { id: 'flowingRiver', label: 'Moldar o Rio Corrente', tag: '1 ki', desc: 'Molda água ou gelo num cubo de 9 m a até 36 m: congela, derrete, abre valas ou ergue paredes.' },
  { id: 'cinderStrike', label: 'Golpe Ardente de Brasas', tag: '2 ki', desc: 'Conjura mãos flamejantes.' },
  { id: 'waterWhip', label: 'Chicote d’Água', tag: '2 ki', desc: 'Ação bônus: salvaguarda de DES ou 3d10 de concussão (+1d10 por ki extra), e você derruba ou puxa o alvo até 7,5 m.' },
  { id: 'northWind', label: 'Garra do Vento Norte', tag: '3 ki · 6º', desc: 'Conjura imobilizar pessoa.', prereq: { level: 6 } },
  { id: 'gong', label: 'Gongo do Cume', tag: '3 ki · 6º', desc: 'Conjura despedaçar.', prereq: { level: 6 } },
  { id: 'phoenix', label: 'Chamas da Fênix', tag: '4 ki · 11º', desc: 'Conjura bola de fogo.', prereq: { level: 11 } },
  { id: 'mistStance', label: 'Postura da Névoa', tag: '4 ki · 11º', desc: 'Conjura forma gasosa em si mesmo.', prereq: { level: 11 } },
  { id: 'rideWind', label: 'Cavalgar o Vento', tag: '4 ki · 11º', desc: 'Conjura voo em si mesmo.', prereq: { level: 11 } },
  { id: 'winter', label: 'Sopro do Inverno', tag: '6 ki · 17º', desc: 'Conjura cone de frio.', prereq: { level: 17 } },
  { id: 'mountain', label: 'Defesa da Montanha Eterna', tag: '5 ki · 17º', desc: 'Conjura pele de pedra em si mesmo.', prereq: { level: 17 } },
  { id: 'hungryFlame', label: 'Rio de Chamas Famintas', tag: '5 ki · 17º', desc: 'Conjura muralha de fogo.', prereq: { level: 17 } },
  { id: 'rollingEarth', label: 'Onda de Terra Rolante', tag: '6 ki · 17º', desc: 'Conjura muralha de pedra.', prereq: { level: 17 } },
];

/* ---------- Patrulheiro ---------- */
export const FAVORED_ENEMIES: ChoiceOption[] = [
  { id: 'aberrations', label: 'Aberrações', desc: 'Vantagem para rastrear e lembrar informações sobre elas; aprende um idioma que falem.' },
  { id: 'beasts', label: 'Bestas', desc: 'Vantagem para rastrear e lembrar informações sobre elas.' },
  { id: 'celestials', label: 'Celestiais', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende um idioma que falem.' },
  { id: 'constructs', label: 'Constructos', desc: 'Vantagem para rastrear e lembrar informações sobre eles.' },
  { id: 'dragons', label: 'Dragões', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende Dracônico ou outro idioma que falem.' },
  { id: 'elementals', label: 'Elementais', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende um idioma que falem.' },
  { id: 'fey', label: 'Fadas', desc: 'Vantagem para rastrear e lembrar informações sobre elas; aprende um idioma que falem.' },
  { id: 'fiends', label: 'Corruptores', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende um idioma que falem.' },
  { id: 'giants', label: 'Gigantes', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende Gigante.' },
  { id: 'monstrosities', label: 'Monstruosidades', desc: 'Vantagem para rastrear e lembrar informações sobre elas.' },
  { id: 'oozes', label: 'Limos', desc: 'Vantagem para rastrear e lembrar informações sobre eles.' },
  { id: 'plants', label: 'Plantas', desc: 'Vantagem para rastrear e lembrar informações sobre elas.' },
  { id: 'undead', label: 'Mortos-vivos', desc: 'Vantagem para rastrear e lembrar informações sobre eles; aprende um idioma que falem.' },
  { id: 'humanoids', label: 'Humanoides (duas raças)', desc: 'Escolha duas raças humanoides (ex.: gnolls e orcs). Vantagem para rastreá-las e lembrar informações; aprende um idioma delas.' },
];
export const FAVORED_TERRAINS: ChoiceOption[] = [
  { id: 'arctic', label: 'Ártico', desc: 'Benefícios de Explorador Nato no ártico.' },
  { id: 'coast', label: 'Costa', desc: 'Benefícios de Explorador Nato na costa.' },
  { id: 'desert', label: 'Deserto', desc: 'Benefícios de Explorador Nato no deserto.' },
  { id: 'forest', label: 'Floresta', desc: 'Benefícios de Explorador Nato na floresta.' },
  { id: 'grassland', label: 'Pradaria', desc: 'Benefícios de Explorador Nato na pradaria.' },
  { id: 'mountain', label: 'Montanha', desc: 'Benefícios de Explorador Nato na montanha.' },
  { id: 'swamp', label: 'Pântano', desc: 'Benefícios de Explorador Nato no pântano.' },
  { id: 'underdark', label: 'Subterrâneo', desc: 'Benefícios de Explorador Nato no Subterrâneo.' },
];
export const HUNTER_PREY: ChoiceOption[] = [
  { id: 'colossus', label: 'Matador de Colossos', desc: '+1d8 de dano, uma vez por turno, contra criatura que já está abaixo do PV máximo.' },
  { id: 'giantKiller', label: 'Matador de Gigantes', desc: 'Reação: quando uma criatura Grande ou maior a 1,5 m ataca você, ataca-a de volta logo depois.' },
  { id: 'hordeBreaker', label: 'Quebra-Hordas', desc: 'Uma vez por turno, ao atacar com arma, ataca outra criatura a 1,5 m do alvo e ao seu alcance.' },
];
export const HUNTER_TACTICS: ChoiceOption[] = [
  { id: 'escapeHorde', label: 'Escapar da Horda', desc: 'Ataques de oportunidade contra você têm desvantagem.' },
  { id: 'multiattackDefense', label: 'Defesa contra Ataques Múltiplos', desc: 'Depois que uma criatura acerta você, ganha +4 de CA contra os ataques seguintes dela neste turno.' },
  { id: 'steelWill', label: 'Vontade de Aço', desc: 'Vantagem em salvaguardas contra ficar amedrontado.' },
];
export const HUNTER_MULTIATTACK: ChoiceOption[] = [
  { id: 'volley', label: 'Rajada', desc: 'Ação: ataque à distância contra qualquer número de criaturas a até 3 m de um ponto que você vê (uma jogada por alvo, munição para cada).' },
  { id: 'whirlwind', label: 'Ataque Giratório', desc: 'Ação: ataque corpo a corpo contra cada criatura a 1,5 m de você (uma jogada por alvo).' },
];
export const HUNTER_DEFENSE: ChoiceOption[] = [
  { id: 'evasion', label: 'Evasão', desc: 'Salvaguarda de DES para meio dano: sucesso = nenhum dano; falha = metade.' },
  { id: 'standTide', label: 'Resistir à Maré', desc: 'Reação: quando uma criatura erra você corpo a corpo, força-a a repetir o ataque contra outra criatura (não ela mesma).' },
  { id: 'uncannyDodge', label: 'Esquiva Sobrenatural', desc: 'Reação: quando um atacante que você vê o acerta, reduz o dano pela metade.' },
];

/* ---------- Bruxo ---------- */
export const PACT_BOONS: ChoiceOption[] = [
  { id: 'chain', label: 'Pacto da Corrente', desc: 'Aprende convocar familiar (ritual) com formas especiais: diabrete, pseudodragão, quasit ou sprite. Ao atacar, pode abrir mão de um ataque para o familiar atacar com a reação dele.' },
  { id: 'blade', label: 'Pacto da Lâmina', desc: 'Ação: cria uma arma de pacto corpo a corpo na mão (proficiente, conta como mágica). Pode vincular uma arma mágica num ritual de 1 hora.' },
  { id: 'tome', label: 'Pacto do Tomo', desc: 'Recebe o Livro das Sombras: 3 truques de qualquer lista de classe, sempre preparados enquanto estiver com o livro.' },
];
export const INVOCATIONS: ChoiceOption[] = [
  { id: 'agonizingBlast', label: 'Explosão Agonizante', tag: 'rajada mística', desc: 'Soma CAR ao dano de cada raio da rajada mística.', prereq: { spell: 'sp-eldritch' } },
  { id: 'armorOfShadows', label: 'Armadura das Sombras', desc: 'Conjura armadura arcana em si mesmo à vontade, sem gastar espaço nem componentes materiais.' },
  { id: 'ascendantStep', label: 'Passo Ascendente', tag: '9º', desc: 'Conjura levitação em si mesmo à vontade.', prereq: { level: 9 } },
  { id: 'beastSpeech', label: 'Fala Bestial', desc: 'Conjura falar com animais à vontade.' },
  { id: 'beguilingInfluence', label: 'Influência Enganadora', desc: 'Proficiência em Enganação e Persuasão.' },
  { id: 'bewitchingWhispers', label: 'Sussurros Enfeitiçantes', tag: '7º', desc: 'Conjura compulsão uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 7 } },
  { id: 'bookOfSecrets', label: 'Livro dos Segredos Antigos', tag: 'Tomo', desc: 'Inscreve 2 rituais de 1º círculo de qualquer classe no Livro das Sombras e pode copiar mais rituais que encontrar.', prereq: { pact: 'tome' } },
  { id: 'chainsOfCarceri', label: 'Correntes de Carceri', tag: '15º · Corrente', desc: 'Conjura imobilizar monstro à vontade contra celestial, corruptor ou elemental (mesmo alvo só depois de um descanso longo).', prereq: { level: 15, pact: 'chain' } },
  { id: 'devilsSight', label: 'Visão do Diabo', desc: 'Enxerga normalmente em escuridão, mágica ou não, até 36 m.' },
  { id: 'dreadfulWord', label: 'Palavra Terrível', tag: '7º', desc: 'Conjura confusão uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 7 } },
  { id: 'eldritchSight', label: 'Visão Mística', desc: 'Conjura detectar magia à vontade.' },
  { id: 'eldritchSpear', label: 'Lança Mística', tag: 'rajada mística', desc: 'O alcance da rajada mística vira 90 m.', prereq: { spell: 'sp-eldritch' } },
  { id: 'runeKeeper', label: 'Olhos do Guardião das Runas', desc: 'Lê qualquer escrita.' },
  { id: 'fiendishVigor', label: 'Vigor Infernal', desc: 'Conjura vitalidade falsa em si mesmo à vontade, como magia de 1º círculo.' },
  { id: 'twoMinds', label: 'Olhar de Duas Mentes', desc: 'Toque um humanoide voluntário e perceba pelos sentidos dele até o fim do seu próximo turno (renovável com ação).' },
  { id: 'lifedrinker', label: 'Bebedor de Vida', tag: '12º · Lâmina', desc: 'Ao acertar com a arma de pacto, +CAR de dano necrótico (mín. 1).', prereq: { level: 12, pact: 'blade' } },
  { id: 'manyFaces', label: 'Máscara de Muitas Faces', desc: 'Conjura disfarçar-se à vontade.' },
  { id: 'myriadForms', label: 'Mestre das Formas Incontáveis', tag: '15º', desc: 'Conjura alterar-se à vontade.', prereq: { level: 15 } },
  { id: 'minionsOfChaos', label: 'Lacaios do Caos', tag: '9º', desc: 'Conjura conjurar elemental uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 9 } },
  { id: 'mireTheMind', label: 'Atolar a Mente', tag: '5º', desc: 'Conjura lentidão uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 5 } },
  { id: 'mistyVisions', label: 'Visões Nebulosas', desc: 'Conjura imagem silenciosa à vontade.' },
  { id: 'oneWithShadows', label: 'Um com as Sombras', tag: '5º', desc: 'Em penumbra ou escuridão, ação: fica invisível até se mover ou agir.', prereq: { level: 5 } },
  { id: 'otherworldlyLeap', label: 'Salto Transcendental', tag: '9º', desc: 'Conjura salto em si mesmo à vontade.', prereq: { level: 9 } },
  { id: 'repellingBlast', label: 'Explosão Repulsiva', tag: 'rajada mística', desc: 'Cada raio da rajada mística que acerta empurra o alvo até 3 m.', prereq: { spell: 'sp-eldritch' } },
  { id: 'sculptorOfFlesh', label: 'Escultor de Carne', tag: '7º', desc: 'Conjura metamorfose uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 7 } },
  { id: 'illOmen', label: 'Sinal de Mau Agouro', tag: '5º', desc: 'Conjura rogar maldição uma vez com um espaço de pacto (volta no descanso longo).', prereq: { level: 5 } },
  { id: 'fiveFates', label: 'Ladrão dos Cinco Destinos', desc: 'Conjura perdição uma vez com um espaço de pacto (volta no descanso longo).' },
  { id: 'thirstingBlade', label: 'Lâmina Sedenta', tag: '5º · Lâmina', desc: 'Ataca duas vezes com a arma de pacto na ação de Ataque.', prereq: { level: 5, pact: 'blade' } },
  { id: 'distantRealms', label: 'Visões de Reinos Distantes', tag: '15º', desc: 'Conjura olho arcano à vontade.', prereq: { level: 15 } },
  { id: 'chainMaster', label: 'Voz do Mestre das Correntes', tag: 'Corrente', desc: 'Telepatia com o familiar a qualquer distância no mesmo plano; pode ver/ouvir por ele e falar pela voz dele.', prereq: { pact: 'chain' } },
  { id: 'whispersOfGrave', label: 'Sussurros do Túmulo', tag: '9º', desc: 'Conjura falar com os mortos à vontade.', prereq: { level: 9 } },
  { id: 'witchSight', label: 'Visão da Bruxa', tag: '15º', desc: 'Vê a forma verdadeira de metamorfos e criaturas disfarçadas por ilusão ou transmutação a até 9 m.', prereq: { level: 15 } },
];

/* ---------- Lista do artífice (Tasha) dentro da biblioteca do app ---------- */
const byNames = (names: string[]) => Object.values(SPELL_BY_ID).filter((sp) => names.includes(sp.name)).map((sp) => sp.id);
export const ARTIFICER_CANTRIPS = byNames(['Respingo Ácido', 'Globos de Luz', 'Raio de Fogo', 'Orientação', 'Luz', 'Mãos Mágicas', 'Consertar', 'Mensagem', 'Rajada de Veneno', 'Prestidigitação', 'Raio de Gelo', 'Resistência', 'Toque Chocante', 'Estabilizar Criatura', 'Chicote de Espinhos']);
export const ARTIFICER_FIRST = byNames(['Alarme', 'Curar Ferimentos', 'Disfarçar-se', 'Recuo Acelerado', 'Fogo das Fadas', 'Vitalidade Falsa', 'Queda Suave', 'Área Escorregadia', 'Identificação', 'Saltar', 'Passos Longos', 'Purificar Alimentos e Bebidas', 'Santuário']);

/* ---------- Idiomas (Domínio do Conhecimento) ---------- */
export const LANGUAGE_OPTIONS: ChoiceOption[] = [
  ['Anão', 'padrão'], ['Élfico', 'padrão'], ['Gigante', 'padrão'], ['Gnômico', 'padrão'], ['Goblin', 'padrão'], ['Halfling', 'padrão'], ['Orc', 'padrão'],
  ['Abissal', 'exótico'], ['Celestial', 'exótico'], ['Dracônico', 'exótico'], ['Dialeto Subterrâneo', 'exótico'], ['Infernal', 'exótico'], ['Primordial', 'exótico'], ['Silvestre', 'exótico'], ['Subcomum', 'exótico'],
].map(([label, tag]) => ({ id: label, label, tag, desc: `Você fala, lê e escreve ${label}.` }));

/* ---------- Patrulheiro · Mestre das Feras: companheiro (3º) ---------- */
export const BEAST_OPTIONS: ChoiceOption[] = COMPANION_BEASTS.map((b) => ({
  id: b.id,
  label: b.label,
  tag: `ND ${b.cr}`,
  desc: `${b.size} · CA ${b.ac} · PV ${b.hp} · ${b.speed} · ${b.attacks.map((a) => `${a.name} ${a.dice}d${a.die}${a.bonus ? `+${a.bonus}` : ''}`).join(', ')}${b.traits.length ? ` · ${b.traits.map((t) => t.name).join(', ')}` : ''}`,
}));

export const ARTISAN_TOOLS: ChoiceOption[] = TOOLS.filter((tl) => tl.group === 'artesao').map((tl) => ({
  id: tl.id,
  label: tl.label,
  desc: 'Ganha proficiência com essa ferramenta (entra na lista de ferramentas da ficha).',
}));

export const INSTRUMENTS: ChoiceOption[] = TOOLS.filter((tl) => tl.group === 'instrumento').map((tl) => ({
  id: tl.id,
  label: tl.label,
  desc: 'Instrumento musical.',
}));

/** Monge (PHB 2014): uma ferramenta de artesão OU um instrumento musical. */
export const MONK_TOOLS: ChoiceOption[] = [
  ...ARTISAN_TOOLS.map((o) => ({ ...o, tag: 'artesão' })),
  ...INSTRUMENTS.map((o) => ({ ...o, tag: 'instrumento' })),
];

/** Armas do catálogo (Mestre em Armas, arma do Pacto da Lâmina). */
export const WEAPON_OPTIONS: ChoiceOption[] = WEAPONS.filter((w) => w.weapon && !/-plus\d$/.test(w.id)).map((w) => ({
  id: w.id,
  label: w.name,
  tag: w.weapon!.type === 'martial' ? 'marcial' : 'simples',
  desc: `${w.weapon!.damageDice}d${w.weapon!.damageDie} ${w.weapon!.damageType} · ${w.weapon!.range === 'ranged' ? 'à distância' : 'corpo a corpo'}${w.weapon!.properties.length ? ' · ' + w.weapon!.properties.join(', ') : ''}`,
}));
export const MELEE_WEAPON_IDS = WEAPONS.filter((w) => w.weapon?.range === 'melee' && !/-plus\d$/.test(w.id)).map((w) => w.id);

export const CATALOGS: Record<CatalogId, ChoiceOption[]> = {
  metamagic: METAMAGIC,
  dragonAncestor: DRAGON_ANCESTOR,
  fightingStyle: FIGHTING_STYLES,
  maneuver: MANEUVERS,
  artisanTool: ARTISAN_TOOLS,
  totemSpirit: TOTEM_SPIRIT,
  totemAspect: TOTEM_ASPECT,
  totemAttunement: TOTEM_ATTUNEMENT,
  skill: SKILL_OPTIONS,
  druidLand: DRUID_LANDS,
  discipline: ELEMENTAL_DISCIPLINES,
  favoredEnemy: FAVORED_ENEMIES,
  favoredTerrain: FAVORED_TERRAINS,
  hunterPrey: HUNTER_PREY,
  hunterTactics: HUNTER_TACTICS,
  hunterMultiattack: HUNTER_MULTIATTACK,
  hunterDefense: HUNTER_DEFENSE,
  pactBoon: PACT_BOONS,
  invocation: INVOCATIONS,
  language: LANGUAGE_OPTIONS,
  beast: BEAST_OPTIONS,
  instrument: INSTRUMENTS,
  monkTool: MONK_TOOLS,
  weapon: WEAPON_OPTIONS,
  spell: [],
};

/* ------------------------------------------------------------------ */
/* Escolhas por classe e nível de classe                              */
/* ------------------------------------------------------------------ */

const METAMAGIC_HINT = 'Formas de moldar suas magias gastando Pontos de Feitiçaria. Só se usa uma por magia (exceto Potencializada).';

const SECRETS_HINT = 'Duas magias de QUALQUER classe (ou truques), de um círculo que você já consegue conjurar. Contam como magias de bardo e entram no total de magias conhecidas.';
const INVOCATION_HINT = 'Fragmentos de saber proibido. Alguns pedem nível, pacto ou a rajada mística. Ao subir de nível no Bruxo você pode trocar uma invocação por outra.';
const ENEMY_HINT = 'Vantagem em testes de SAB (Sobrevivência) para rastreá-los e de INT para lembrar informações sobre eles. Também aprende um idioma que eles falem.';
/** Inimigos favoritos que falam algum idioma (o patrulheiro aprende um deles). */
const SPEAKING_ENEMIES = ['aberrations', 'celestials', 'dragons', 'elementals', 'fey', 'fiends', 'giants', 'undead', 'humanoids'];
const favoredLanguage: ChoiceSpec = {
  key: 'favoredLanguage',
  catalog: 'language',
  label: 'Idioma do inimigo favorito',
  count: 1,
  requires: { key: 'favoredEnemy', id: '', anyOf: SPEAKING_ENEMIES },
  hint: 'Um idioma falado pelo seu inimigo favorito (Dracônico para dragões, Gigante para gigantes, Abissal ou Infernal para corruptores…).',
};
const TERRAIN_HINT = 'O tipo de terreno em que você é guia e batedor nato: viagem, rastreio e sobrevivência ficam muito melhores ali.';
const invocationSwap: ChoiceSpec = { key: 'invocation', catalog: 'invocation', label: 'Invocações Místicas', count: 0, canReplace: true, hint: 'Neste nível você não ganha invocação nova, mas pode trocar uma que conhece por outra.' };
const invocationGain = (count: number): ChoiceSpec => ({ key: 'invocation', catalog: 'invocation', label: count > 1 ? 'Invocações Místicas' : 'Invocação Mística adicional', count, hint: INVOCATION_HINT, canReplace: count === 1 });
const arcanum = (circle: number): ChoiceSpec => ({
  key: `arcanum${circle}`,
  catalog: 'spell',
  label: `Arcano Místico (${circle}º círculo)`,
  count: 1,
  spell: { classes: ['warlock'], circle },
  bonusSpells: true,
  hint: `Uma magia de bruxo de ${circle}º círculo que você conjura uma vez por descanso longo sem gastar espaço.`,
});

export const CLASS_CHOICES: Record<string, Record<number, ChoiceSpec[]>> = {
  sorcerer: {
    3: [{ key: 'metamagic', catalog: 'metamagic', label: 'Metamagia', count: 2, hint: METAMAGIC_HINT }],
    10: [{ key: 'metamagic', catalog: 'metamagic', label: 'Metamagia adicional', count: 1, hint: METAMAGIC_HINT }],
    17: [{ key: 'metamagic', catalog: 'metamagic', label: 'Metamagia adicional', count: 1, hint: METAMAGIC_HINT }],
  },
  fighter: {
    1: [{ key: 'fightingStyle', catalog: 'fightingStyle', label: 'Estilo de Luta', count: 1, hint: 'Uma especialidade de combate. Não dá para escolher o mesmo estilo duas vezes.' }],
  },
  paladin: {
    2: [{ key: 'fightingStyle', catalog: 'fightingStyle', label: 'Estilo de Luta', count: 1, only: ['defense', 'dueling', 'gwf', 'protection'] }],
  },
  ranger: {
    1: [
      { key: 'favoredEnemy', catalog: 'favoredEnemy', label: 'Inimigo Favorito', count: 1, hint: ENEMY_HINT },
      { key: 'favoredTerrain', catalog: 'favoredTerrain', label: 'Explorador Nato (terreno)', count: 1, hint: TERRAIN_HINT },
      favoredLanguage,
    ],
    2: [{ key: 'fightingStyle', catalog: 'fightingStyle', label: 'Estilo de Luta', count: 1, only: ['archery', 'defense', 'dueling', 'twf'] }],
    6: [
      { key: 'favoredEnemy', catalog: 'favoredEnemy', label: 'Inimigo Favorito adicional', count: 1, hint: ENEMY_HINT },
      { key: 'favoredTerrain', catalog: 'favoredTerrain', label: 'Terreno favorito adicional', count: 1, hint: TERRAIN_HINT },
      favoredLanguage,
    ],
    10: [{ key: 'favoredTerrain', catalog: 'favoredTerrain', label: 'Terreno favorito adicional', count: 1, hint: TERRAIN_HINT }],
    14: [{ key: 'favoredEnemy', catalog: 'favoredEnemy', label: 'Inimigo Favorito adicional', count: 1, hint: ENEMY_HINT }, favoredLanguage],
  },
  bard: {
    // PHB 2014: três instrumentos musicais à escolha
    1: [{ key: 'bardInstruments', catalog: 'instrument', label: 'Instrumentos musicais', count: 3, hint: 'Proficiência com três instrumentos musicais à sua escolha.' }],
    10: [{ key: 'magicalSecrets', catalog: 'spell', label: 'Segredos Mágicos', count: 2, spell: { upToSlots: true }, hint: SECRETS_HINT }],
    14: [{ key: 'magicalSecrets', catalog: 'spell', label: 'Segredos Mágicos', count: 2, spell: { upToSlots: true }, hint: SECRETS_HINT }],
    18: [{ key: 'magicalSecrets', catalog: 'spell', label: 'Segredos Mágicos', count: 2, spell: { upToSlots: true }, hint: SECRETS_HINT }],
  },
  monk: {
    1: [{ key: 'monkTool', catalog: 'monkTool', label: 'Ferramenta ou instrumento', count: 1, hint: 'Proficiência com uma ferramenta de artesão ou um instrumento musical.' }],
  },
  warlock: {
    2: [invocationGain(2)],
    3: [
      { key: 'pact', catalog: 'pactBoon', label: 'Dádiva do Pacto', count: 1, hint: 'O presente do seu patrono. Algumas invocações exigem um pacto específico.' },
      {
        key: 'tomeCantrips',
        catalog: 'spell',
        label: 'Livro das Sombras (truques)',
        count: 3,
        spell: { circle: 0 },
        requires: { key: 'pact', id: 'tome' },
        bonusSpells: true,
        hint: 'Três truques de QUALQUER lista de classe. Contam como magias de bruxo e não entram no limite de truques.',
      },
      {
        key: 'pactWeapon',
        catalog: 'weapon',
        label: 'Arma do Pacto',
        count: 1,
        only: MELEE_WEAPON_IDS,
        requires: { key: 'pact', id: 'blade' },
        hint: 'A forma da sua arma de pacto (corpo a corpo). Você é proficiente com ela, e ela conta como mágica.',
      },
      invocationSwap,
    ],
    4: [invocationSwap],
    5: [invocationGain(1)],
    6: [invocationSwap],
    7: [invocationGain(1)],
    8: [invocationSwap],
    9: [invocationGain(1)],
    10: [invocationSwap],
    11: [arcanum(6), invocationSwap],
    12: [invocationGain(1)],
    13: [arcanum(7), invocationSwap],
    14: [invocationSwap],
    15: [arcanum(8), invocationGain(1)],
    16: [invocationSwap],
    17: [arcanum(9), invocationSwap],
    18: [invocationGain(1)],
    19: [invocationSwap],
    20: [invocationSwap],
  },
  wizard: {
    18: [
      { key: 'spellMastery1', catalog: 'spell', label: 'Domínio de Magia (1º círculo)', count: 1, spell: { classes: ['wizard'], circle: 1 }, hint: 'Uma magia de 1º círculo do seu grimório: você a conjura no nível mais baixo sem gastar espaço (se estiver preparada).' },
      { key: 'spellMastery2', catalog: 'spell', label: 'Domínio de Magia (2º círculo)', count: 1, spell: { classes: ['wizard'], circle: 2 }, hint: 'Uma magia de 2º círculo do seu grimório, conjurada à vontade no nível mais baixo.' },
    ],
    20: [{ key: 'signature', catalog: 'spell', label: 'Magias de Assinatura', count: 2, spell: { classes: ['wizard'], circle: 3 }, hint: 'Duas magias de 3º círculo do grimório: sempre preparadas, não contam no limite, e cada uma pode ser conjurada 1× por descanso curto sem espaço.' }],
  },
};

const MANEUVER_HINT = 'Técnicas alimentadas pelos Dados de Superioridade (um dado por manobra). CD = 8 + proficiência + mod. de FOR ou DES.';

export const SUBCLASS_CHOICES: Record<string, Record<number, ChoiceSpec[]>> = {
  draconic: {
    1: [{ key: 'dragonAncestor', catalog: 'dragonAncestor', label: 'Ancestral Dragão', count: 1, hint: 'Define o tipo de dano da Afinidade Elemental (6º) e dobra a proficiência em testes de Carisma com dragões. Você também fala Dracônico.' }],
  },
  champion: {
    10: [{ key: 'fightingStyle', catalog: 'fightingStyle', label: 'Estilo de Luta adicional', count: 1 }],
  },
  knowledge: {
    1: [
      { key: 'knowledgeLanguages', catalog: 'language', label: 'Bênçãos do Conhecimento (idiomas)', count: 2, hint: 'Aprende dois idiomas à sua escolha.' },
      { key: 'knowledgeSkills', catalog: 'skill', label: 'Bênçãos do Conhecimento (perícias)', count: 2, only: ['arcana', 'history', 'nature', 'religion'], hint: 'Proficiência em duas destas perícias — com o bônus de proficiência DOBRADO nelas.' },
    ],
  },
  nature: {
    1: [
      { key: 'natureCantrip', catalog: 'spell', label: 'Acólito da Natureza (truque)', count: 1, spell: { classes: ['druid'], circle: 0 }, bonusSpells: true, hint: 'Um truque de druida. Conta como magia de clérigo e não entra no limite de truques.' },
      { key: 'natureSkill', catalog: 'skill', label: 'Acólito da Natureza (perícia)', count: 1, only: ['animalHandling', 'nature', 'survival'], hint: 'Proficiência em Adestrar Animais, Natureza ou Sobrevivência.' },
    ],
  },
  totem: {
    3: [{ key: 'totemSpirit', catalog: 'totemSpirit', label: 'Espírito Totêmico', count: 1, hint: 'O animal que guia sua fúria. Você também pode conjurar sentido bestial e falar com animais como rituais (Buscador de Espíritos).' }],
    6: [{ key: 'totemAspect', catalog: 'totemAspect', label: 'Aspecto da Fera', count: 1, hint: 'Pode ser um animal diferente do Espírito Totêmico.' }],
    14: [{ key: 'totemAttunement', catalog: 'totemAttunement', label: 'Sintonia Totêmica', count: 1, hint: 'Pode ser um animal diferente dos anteriores.' }],
  },
  lore: {
    3: [{ key: 'loreSkills', catalog: 'skill', label: 'Proficiências Adicionais', count: 3, hint: 'Proficiência em três perícias à sua escolha.' }],
    6: [{ key: 'loreSecrets', catalog: 'spell', label: 'Segredos Mágicos Adicionais', count: 2, spell: { upToSlots: true }, bonusSpells: true, hint: 'Duas magias de qualquer classe, de um círculo que você consegue conjurar. NÃO contam no total de magias conhecidas.' }],
  },
  land: {
    3: [{ key: 'land', catalog: 'druidLand', label: 'Terreno do Círculo', count: 1, hint: 'A terra onde você se tornou druida. Define as Magias de Círculo (sempre preparadas, não contam no limite) ganhas nos níveis 3, 5, 7 e 9.' }],
  },
  elements: {
    3: [{ key: 'discipline', catalog: 'discipline', label: 'Disciplina Elemental', count: 1, hint: 'Você já tem Sintonia Elemental. Escolha mais uma disciplina (gasta ki; CD = 8 + proficiência + SAB). Máximo de ki por disciplina: 2 no 5º, 3 no 9º, 4 no 13º, 5 no 17º.' }],
    6: [{ key: 'discipline', catalog: 'discipline', label: 'Disciplina Elemental adicional', count: 1, canReplace: true }],
    11: [{ key: 'discipline', catalog: 'discipline', label: 'Disciplina Elemental adicional', count: 1, canReplace: true }],
    17: [{ key: 'discipline', catalog: 'discipline', label: 'Disciplina Elemental adicional', count: 1, canReplace: true }],
  },
  beastmaster: {
    3: [{ key: 'companion', catalog: 'beast', label: 'Companheiro de Patrulheiro', count: 1, hint: 'Uma fera Média ou menor de ND 1/4 ou menor. Soma sua proficiência na CA, ataques, dano e perícias dela; PV máximo = o dela ou 4 × seu nível de patrulheiro (o maior). Se morrer, você pode ligar-se a outra fera com 8 horas.' }],
  },
  hunter: {
    3: [{ key: 'hunterPrey', catalog: 'hunterPrey', label: 'Presa do Caçador', count: 1 }],
    7: [{ key: 'hunterTactics', catalog: 'hunterTactics', label: 'Táticas Defensivas', count: 1 }],
    11: [{ key: 'hunterMultiattack', catalog: 'hunterMultiattack', label: 'Ataque Múltiplo', count: 1 }],
    15: [{ key: 'hunterDefense', catalog: 'hunterDefense', label: 'Defesa Superior do Caçador', count: 1 }],
  },
  battlemaster: {
    3: [
      { key: 'maneuver', catalog: 'maneuver', label: 'Manobras', count: 3, hint: MANEUVER_HINT },
      { key: 'artisanTool', catalog: 'artisanTool', label: 'Estudioso da Guerra', count: 1, hint: 'Proficiência com um tipo de ferramenta de artesão.' },
    ],
    7: [{ key: 'maneuver', catalog: 'maneuver', label: 'Manobras', count: 2, hint: MANEUVER_HINT, canReplace: true }],
    10: [{ key: 'maneuver', catalog: 'maneuver', label: 'Manobras', count: 2, hint: MANEUVER_HINT, canReplace: true }],
    15: [{ key: 'maneuver', catalog: 'maneuver', label: 'Manobras', count: 2, hint: MANEUVER_HINT, canReplace: true }],
  },
};

/**
 * Escolhas de talentos (Xanathar): guardadas em `choices['feat.<chave>']`
 * e resolvidas em "Escolhas pendentes" depois de pegar o talento.
 */
export const FEAT_CHOICES: Record<string, ChoiceSpec[]> = {
  // ---- Caldeirão de Tasha ----
  'artificer-initiate': [
    { key: 'artificerCantrip', catalog: 'spell', label: 'Iniciado Artífice (truque)', count: 1, spell: { circle: 0 }, only: ARTIFICER_CANTRIPS, bonusSpells: true, hint: 'Um truque da lista do artífice, conjurado com Inteligência.' },
    { key: 'artificerSpell', catalog: 'spell', label: 'Iniciado Artífice (1º círculo)', count: 1, spell: { circle: 1 }, only: ARTIFICER_FIRST, bonusSpells: true, hint: 'Uma magia de 1º círculo do artífice: 1× por descanso longo sem espaço (ou com seus espaços).' },
    { key: 'artificerTool', catalog: 'artisanTool', label: 'Iniciado Artífice (ferramenta)', count: 1, hint: 'Proficiência com um tipo de ferramenta de artesão.' },
  ],
  'eldritch-adept': [
    { key: 'invocation', catalog: 'invocation', label: 'Adepto Místico (invocação)', count: 1, only: INVOCATIONS.filter((i) => !i.prereq).map((i) => i.id), hint: 'Uma invocação mística sem pré-requisito. Ao subir de nível, pode trocá-la por outra.' },
  ],
  'fey-touched': [
    { key: 'feyTouchedSpell', catalog: 'spell', label: 'Tocado pelas Fadas (magia)', count: 1, spell: { circle: 1, schools: ['Adivinhação', 'Encantamento'] }, bonusSpells: true, hint: 'Uma magia de 1º círculo de adivinhação ou encantamento: 1× por descanso longo sem espaço.' },
  ],
  'fighting-initiate': [
    { key: 'fightingStyle', catalog: 'fightingStyle', label: 'Iniciado em Combate (estilo)', count: 1, hint: 'Um Estilo de Luta do guerreiro que você ainda não tenha.' },
  ],
  'metamagic-adept': [
    { key: 'metamagic', catalog: 'metamagic', label: 'Adepto Metamágico', count: 2, hint: 'Duas opções de Metamagia. Ganha 2 pontos de feitiçaria só para usá-las.' },
  ],
  'shadow-touched': [
    { key: 'shadowTouchedSpell', catalog: 'spell', label: 'Tocado pelas Sombras (magia)', count: 1, spell: { circle: 1, schools: ['Ilusão', 'Necromancia'] }, bonusSpells: true, hint: 'Uma magia de 1º círculo de ilusão ou necromancia: 1× por descanso longo sem espaço.' },
  ],
  'skill-expert': [
    { key: 'skillExpertSkill', catalog: 'skill', label: 'Especialista em Perícia', count: 1, hint: 'Proficiência numa perícia. Depois escolha uma perícia proficiente para a especialização (aba de Perícias).' },
  ],
  'weapon-master': [
    { key: 'weaponMasterWeapons', catalog: 'weapon', label: 'Mestre em Armas (armas)', count: 4, hint: 'Proficiência com quatro armas simples ou marciais à sua escolha.' },
  ],
  'wood-elf-magic': [
    { key: 'woodElfCantrip', catalog: 'spell', label: 'Magia do Elfo da Floresta (truque)', count: 1, spell: { classes: ['druid'], circle: 0 }, bonusSpells: true, hint: 'Um truque de druida, conjurado com Sabedoria. Não conta no limite de truques da sua classe.' },
  ],
  'squat-nimbleness': [
    { key: 'squatSkill', catalog: 'skill', label: 'Agilidade Atarracada (perícia)', count: 1, only: ['acrobatics', 'athletics'], hint: 'Proficiência em Acrobacia ou Atletismo.' },
  ],
  prodigy: [
    { key: 'prodigySkill', catalog: 'skill', label: 'Prodígio (perícia)', count: 1, hint: 'Proficiência numa perícia à sua escolha.' },
    { key: 'prodigyLanguage', catalog: 'language', label: 'Prodígio (idioma)', count: 1, hint: 'Fluência num idioma à sua escolha.' },
  ],
};

/** Escolhas raciais (PHB 2014): guardadas em `choices['race.<chave>']`. */
export const RACE_CHOICES: Record<string, ChoiceSpec[]> = {
  dwarf: [
    {
      key: 'dwarfTool',
      catalog: 'artisanTool',
      label: 'Proficiência com Ferramentas (Anão)',
      count: 1,
      only: ['smiths-tools', 'brewers-supplies', 'masons-tools'],
      hint: 'Ferramentas de ferreiro, suprimentos de cervejeiro ou ferramentas de pedreiro.',
    },
  ],
};

/** Escolhas de sub-raça (PHB 2014): também em `choices['race.<chave>']`. */
export const SUBRACE_CHOICES: Record<string, ChoiceSpec[]> = {
  'high-elf': [
    {
      key: 'highElfCantrip',
      catalog: 'spell',
      label: 'Truque de mago (Alto Elfo)',
      count: 1,
      spell: { classes: ['wizard'], circle: 0 },
      hint: 'Um truque da lista do mago, conjurado com Inteligência e à vontade.',
    },
  ],
};
