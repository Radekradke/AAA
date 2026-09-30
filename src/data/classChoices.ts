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

export interface ChoiceOption {
  id: string;
  label: string;
  desc: string;
  /** Rótulo curto extra (custo, dano, pré-requisito…). */
  tag?: string;
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
}

export type CatalogId = 'metamagic' | 'dragonAncestor' | 'fightingStyle' | 'maneuver' | 'artisanTool';

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
export const ARTISAN_TOOLS: ChoiceOption[] = TOOLS.filter((tl) => tl.group === 'artesao').map((tl) => ({
  id: tl.id,
  label: tl.label,
  desc: 'Ganha proficiência com essa ferramenta (entra na lista de ferramentas da ficha).',
}));

export const CATALOGS: Record<CatalogId, ChoiceOption[]> = {
  metamagic: METAMAGIC,
  dragonAncestor: DRAGON_ANCESTOR,
  fightingStyle: FIGHTING_STYLES,
  maneuver: MANEUVERS,
  artisanTool: ARTISAN_TOOLS,
};

/* ------------------------------------------------------------------ */
/* Escolhas por classe e nível de classe                              */
/* ------------------------------------------------------------------ */

const METAMAGIC_HINT = 'Formas de moldar suas magias gastando Pontos de Feitiçaria. Só se usa uma por magia (exceto Potencializada).';

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
    2: [{ key: 'fightingStyle', catalog: 'fightingStyle', label: 'Estilo de Luta', count: 1, only: ['archery', 'defense', 'dueling', 'twf'] }],
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
