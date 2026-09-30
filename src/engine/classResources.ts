import type { Character } from '@/types/character';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { abilityModifier } from './modifiers';
import { effectiveAbilities } from './levelUp';

/**
 * Recursos de classe de um personagem — PHB 2014, calculados a partir do
 * nível de cada classe, dos atributos e da subclasse. É a fonte da verdade
 * para a tela (máximo), para os descansos (o que recarrega) e para a subida
 * de nível. Antes o máximo vinha fixo do cadastro (ex.: 2 Pontos de
 * Feitiçaria em qualquer nível).
 */
export interface ResourceState {
  id: string;
  label: string;
  desc: string;
  recharge: 'short' | 'long';
  /** Usos máximos (0 com `unlimited`). */
  max: number;
  /** Sem limite de usos (ex.: Fúria no 20º nível do Bárbaro). */
  unlimited?: boolean;
  /** Dado associado, quando houver (Inspiração de Bardo, Superioridade…). */
  die?: string;
}

type Mods = Record<AbilityKey, number>;

function mods(char: Character): Mods {
  const totals = effectiveAbilities(char);
  const out = {} as Mods;
  for (const k of ABILITY_KEYS) out[k] = abilityModifier(totals[k]);
  return out;
}

/** Recursos de UMA classe no nível dado (subclasse só vale para a classe dela). */
function classResources(classId: string, lv: number, m: Mods, subclassId: string | null, choices: Record<string, string[]> = {}): ResourceState[] {
  const out: ResourceState[] = [];
  const add = (r: ResourceState) => out.push(r);

  switch (classId) {
    case 'barbarian': {
      const uses = lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2;
      const dmg = lv >= 16 ? 4 : lv >= 9 ? 3 : 2;
      add({ id: 'rage', label: 'Fúria', desc: `Vantagem em FOR, +${dmg} de dano corpo a corpo com FOR, resistência a concussão/cortante/perfurante`, recharge: 'long', max: lv >= 20 ? 0 : uses, unlimited: lv >= 20 });
      break;
    }
    case 'bard': {
      const die = lv >= 15 ? 'd12' : lv >= 10 ? 'd10' : lv >= 5 ? 'd8' : 'd6';
      // usos = modificador de Carisma (mín. 1); Fonte de Inspiração (5º) recupera no descanso curto
      add({ id: 'inspiration', label: 'Inspiração de Bardo', desc: `Um aliado soma 1${die} a um teste, ataque ou salvaguarda`, recharge: lv >= 5 ? 'short' : 'long', max: Math.max(1, m.cha), die });
      break;
    }
    case 'cleric': {
      if (lv >= 2) add({ id: 'channel', label: 'Canalizar Divindade', desc: 'Expulsar Mortos-Vivos ou o poder do seu domínio', recharge: 'short', max: lv >= 18 ? 3 : lv >= 6 ? 2 : 1 });
      if (subclassId === 'light') add({ id: 'wardingFlare', label: 'Labareda Protetora', desc: 'Reação: impõe desvantagem no ataque de quem você vê a 9 m (não funciona em quem não pode ser cegado)', recharge: 'long', max: Math.max(1, m.wis) });
      if (subclassId === 'tempest') add({ id: 'wrathStorm', label: 'Ira da Tempestade', desc: 'Reação ao ser atingido por criatura a 1,5 m: 2d8 elétrico ou trovejante (salvaguarda de DES para metade)', recharge: 'long', max: Math.max(1, m.wis) });
      if (subclassId === 'war') add({ id: 'warPriest', label: 'Sacerdote da Guerra', desc: 'Ao usar a ação de Ataque, faz um ataque com arma como ação bônus', recharge: 'long', max: Math.max(1, m.wis) });
      if (lv >= 10) add({ id: 'intervention', label: 'Intervenção Divina', desc: `Chance de ${lv >= 20 ? '100%' : `${lv}%`} (d100 ≤ nível); se funcionar, 7 dias até poder de novo`, recharge: 'long', max: 1 });
      break;
    }
    case 'druid': {
      if (lv >= 2) add({ id: 'wildshape', label: 'Forma Selvagem', desc: `Vira uma fera de ND até ${lv >= 8 ? '1' : lv >= 4 ? '1/2 (sem voo)' : '1/4 (sem voo nem natação)'}`, recharge: 'short', max: lv >= 20 ? 0 : 2, unlimited: lv >= 20 });
      if (lv >= 2 && subclassId === 'land') add({ id: 'naturalRecovery', label: 'Recuperação Natural', desc: `Recupera espaços somando até ${Math.ceil(lv / 2)} níveis (nenhum de 6º+) num descanso curto`, recharge: 'long', max: 1 });
      break;
    }
    case 'fighter': {
      add({ id: 'secondWind', label: 'Fôlego', desc: `Ação bônus: recupera 1d10 + ${lv} PV`, recharge: 'short', max: 1 });
      if (lv >= 2) add({ id: 'surge', label: 'Surto de Ação', desc: 'Uma ação adicional no seu turno', recharge: 'short', max: lv >= 17 ? 2 : 1 });
      if (lv >= 9) add({ id: 'indomitable', label: 'Indomável', desc: 'Rola de novo uma salvaguarda que falhou', recharge: 'long', max: lv >= 17 ? 3 : lv >= 13 ? 2 : 1 });
      if (subclassId === 'battlemaster' && lv >= 3) {
        const die = lv >= 18 ? 'd12' : lv >= 10 ? 'd10' : 'd8';
        add({ id: 'superiority', label: 'Dados de Superioridade', desc: `Alimentam as manobras (${die})`, recharge: 'short', max: lv >= 15 ? 6 : lv >= 7 ? 5 : 4, die });
      }
      break;
    }
    case 'monk': {
      if (lv >= 2) add({ id: 'ki', label: 'Pontos de Ki', desc: "Rajada de Golpes, Defesa Paciente, Passo do Vento… (CD = 8 + prof. + SAB)", recharge: 'short', max: lv });
      if (subclassId === 'openhand' && lv >= 6) add({ id: 'wholeness', label: 'Integridade do Corpo', desc: `Ação: recupera ${lv * 3} PV (3 × nível de monge)`, recharge: 'long', max: 1 });
      break;
    }
    case 'paladin': {
      add({ id: 'divineSense', label: 'Sentido Divino', desc: 'Detecta celestiais, corruptores e mortos-vivos a 18 m', recharge: 'long', max: 1 + Math.max(0, m.cha) });
      add({ id: 'layhands', label: 'Cura pelas Mãos', desc: 'Reserva de PV para curar pelo toque (5 pontos curam uma doença/veneno)', recharge: 'long', max: 5 * lv });
      if (lv >= 3) add({ id: 'channel', label: 'Canalizar Divindade', desc: 'Poder do seu juramento', recharge: 'short', max: 1 });
      if (subclassId === 'ancients' && lv >= 15) add({ id: 'undyingSentinel', label: 'Sentinela Imortal', desc: 'Ao cair a 0 PV sem morrer, fica com 1 PV', recharge: 'long', max: 1 });
      if (lv >= 20 && subclassId) {
        const avatar: Record<string, [string, string]> = {
          devotion: ['Nimbo Sagrado', 'Aura de luz solar por 1 min: 10 de dano radiante em inimigos que começam o turno a 9 m; vantagem contra magias de corruptores e mortos-vivos'],
          ancients: ['Campeão Ancião', 'Forma ancestral por 1 min: regenera 10 PV/turno, conjura magias de paladino de 1 ação como ação bônus, inimigos a 3 m têm desvantagem contra suas magias'],
          vengeance: ['Anjo Vingador', 'Forma angelical por 1 h: voo de 18 m e aura de terror de 9 m'],
        };
        const a = avatar[subclassId];
        if (a) add({ id: 'oathAvatar', label: a[0], desc: a[1], recharge: 'long', max: 1 });
      }
      if (lv >= 14) add({ id: 'cleansing', label: 'Toque Purificador', desc: 'Encerra uma magia em você ou numa criatura voluntária', recharge: 'long', max: Math.max(1, m.cha) });
      break;
    }
    case 'rogue': {
      if (lv >= 20) add({ id: 'strokeOfLuck', label: 'Golpe de Sorte', desc: 'Transforma um erro em acerto ou um teste em 20', recharge: 'short', max: 1 });
      break;
    }
    case 'sorcerer': {
      if (lv >= 2) add({ id: 'sorcery', label: 'Pontos de Feitiçaria', desc: 'Alimentam a Metamagia e viram espaços de magia (Fonte de Magia)', recharge: 'long', max: lv });
      if (subclassId === 'wild') add({ id: 'tides', label: 'Marés do Caos', desc: 'Vantagem num ataque, teste ou salvaguarda', recharge: 'long', max: 1 });
      break;
    }
    case 'warlock': {
      // Arcano Místico: uma magia de cada círculo 1×/descanso longo
      for (const [need, circle] of [[11, 6], [13, 7], [15, 8], [17, 9]] as const) {
        if (lv >= need) add({ id: `arcanum${circle}`, label: `Arcano Místico (${circle}º)`, desc: `Conjura sua magia de ${circle}º círculo sem gastar espaço`, recharge: 'long', max: 1 });
      }
      if (subclassId === 'archfey') {
        add({ id: 'feyPresence', label: 'Presença Feérica', desc: 'Ação: cubo de 3 m — salvaguarda de SAB ou encantado/amedrontado até o fim do seu próximo turno', recharge: 'short', max: 1 });
        if (lv >= 6) add({ id: 'mistyEscape', label: 'Fuga Enevoada', desc: 'Reação ao sofrer dano: fica invisível e teleporta até 18 m', recharge: 'short', max: 1 });
        if (lv >= 14) add({ id: 'darkDelirium', label: 'Delírio Sombrio', desc: 'Ação: criatura a 18 m faz salvaguarda de SAB ou fica encantada/amedrontada num reino ilusório por 1 min', recharge: 'short', max: 1 });
      }
      if (subclassId === 'fiend') {
        if (lv >= 6) add({ id: 'darkLuck', label: 'Sorte do Tinhoso', desc: 'Soma 1d10 a um teste de atributo ou salvaguarda (depois de rolar, antes do resultado)', recharge: 'short', max: 1 });
        if (lv >= 14) add({ id: 'hurlHell', label: 'Arremesso pelo Inferno', desc: 'Ao acertar, envia o alvo ao inferno até o fim do seu próximo turno: 10d10 psíquico se não for corruptor', recharge: 'long', max: 1 });
      }
      if (subclassId === 'oldone' && lv >= 6) add({ id: 'entropicWard', label: 'Escudo Entrópico', desc: 'Reação: desvantagem num ataque contra você; se errar, vantagem no seu próximo ataque contra ele', recharge: 'short', max: 1 });
      // invocações que conjuram uma magia 1× por descanso longo (com espaço de pacto)
      const onceInv: Record<string, string> = {
        bewitchingWhispers: 'Sussurros Enfeitiçantes (compulsão)',
        dreadfulWord: 'Palavra Terrível (confusão)',
        minionsOfChaos: 'Lacaios do Caos (conjurar elemental)',
        mireTheMind: 'Atolar a Mente (lentidão)',
        sculptorOfFlesh: 'Escultor de Carne (metamorfose)',
        illOmen: 'Sinal de Mau Agouro (rogar maldição)',
        fiveFates: 'Ladrão dos Cinco Destinos (perdição)',
      };
      for (const id of choices['warlock.invocation'] ?? []) {
        if (onceInv[id]) add({ id: `inv-${id}`, label: onceInv[id], desc: 'Invocação: conjura com um espaço de Magia de Pacto, uma vez por descanso longo', recharge: 'long', max: 1 });
      }
      if (lv >= 20) add({ id: 'eldritchMaster', label: 'Mestre Místico', desc: 'Recupera todos os espaços de Magia de Pacto (1 minuto)', recharge: 'long', max: 1 });
      break;
    }
    case 'wizard': {
      if (subclassId === 'abjuration' && lv >= 2) add({ id: 'arcaneWard', label: 'Barreira Arcana (PV)', desc: `Absorve dano por você; recupera 2 × círculo ao conjurar abjuração${lv >= 6 ? ' · Barreira Projetada: reação para proteger aliado a 9 m' : ''}`, recharge: 'long', max: 2 * lv + Math.max(0, m.int) });
      if (subclassId === 'conjuration' && lv >= 6) add({ id: 'benignTransposition', label: 'Transposição Benigna', desc: 'Ação: teleporta até 9 m ou troca de lugar com criatura voluntária Pequena/Média. Volta também ao conjurar magia de conjuração de 1º+', recharge: 'long', max: 1 });
      if (subclassId === 'illusion' && lv >= 10) add({ id: 'illusorySelf', label: 'Eu Ilusório', desc: 'Reação: um ataque contra você erra automaticamente', recharge: 'short', max: 1 });
      if (subclassId === 'divination' && lv >= 2) add({ id: 'portent', label: 'Portento', desc: 'Role os d20 após o descanso longo e anote; troque qualquer jogada que você vê por um deles', recharge: 'long', max: lv >= 14 ? 3 : 2, die: 'd20' });
      add({ id: 'recovery', label: 'Recuperação Arcana', desc: `Recupera espaços somando até ${Math.ceil(lv / 2)} níveis (nenhum de 6º+) num descanso curto`, recharge: 'long', max: 1 });
      break;
    }
  }
  return out;
}

/** Recursos do personagem inteiro (todas as classes que ele tem). */
export function characterResources(char: Character): ResourceState[] {
  const m = mods(char);
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const out: ResourceState[] = [];
  for (const cl of levels) {
    // a subclasse registrada é a da classe principal
    const sub = cl.classId === char.classId ? char.subclassId ?? null : null;
    out.push(...classResources(cl.classId, Math.max(1, cl.level), m, sub, char.choices ?? {}));
  }
  return out;
}

/** Máximo de cada recurso (ilimitados ficam fora — não há o que gastar). */
export function resourceMaxMap(char: Character): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of characterResources(char)) if (!r.unlimited) out[r.id] = r.max;
  return out;
}

/**
 * Ajusta o estado atual dos recursos ao que o personagem tem agora:
 * novos recursos chegam cheios, os que sumiram saem e nenhum passa do máximo.
 * `refill` enche todos (subida de nível / descanso longo).
 */
export function syncResources(char: Character, current: Record<string, number>, refill = false): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, max] of Object.entries(resourceMaxMap(char))) {
    out[id] = refill || current[id] === undefined ? max : Math.min(Math.max(0, current[id]), max);
  }
  return out;
}
