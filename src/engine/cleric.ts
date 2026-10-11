import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import type { CastRoll } from './spellCast';

/**
 * Clérigo (PHB 2014) na mesa: Canalizar Divindade (Expulsar/Destruir
 * Mortos-Vivos e o poder de cada domínio), Intervenção Divina, as reações
 * do domínio e o que soma sozinho no dano e na cura (Golpe Divino,
 * Conjuração Potente, Discípulo da Vida, Curandeiro Abençoado, Cura Suprema).
 */
export interface ClericChannel {
  id: string;
  label: string;
  desc: string;
  /** Quanto do turno gasta ('free' = parte de outra rolagem). */
  cost: 'action' | 'bonus' | 'reaction' | 'free';
  save?: string;
  /** Dano rolado na hora (Radiância da Alvorada). */
  roll?: { count: number; die: number; bonus: number; type: string };
}

export interface ClericState {
  level: number;
  /** CD das magias e do Canalizar: 8 + prof + SAB. */
  dc: number;
  domain: string | null;
  channelLeft: number;
  channelMax: number;
  channels: ClericChannel[];
  /** Destruir Mortos-Vivos: ND máximo destruído pela expulsão (null antes do 5º). */
  destroyCr: string | null;
  /** Intervenção Divina: chance (d100 ≤ nível; 20º sempre funciona). */
  intervention: { left: number; chance: number } | null;
  /** Preservar a Vida (Vida 2º): reserva de PV = 5 × nível. */
  preserveLife: number | null;
  /** Reações e ações de domínio com usos (SAB por descanso longo). */
  left: Record<'wardingFlare' | 'wrathStorm' | 'warPriest', number>;
  max: Record<'wardingFlare' | 'wrathStorm' | 'warPriest', number>;
}

/** ND destruído por Expulsar Mortos-Vivos (Destruir Mortos-Vivos 5º/8º/11º/14º/17º). */
export function destroyUndeadCr(level: number): string | null {
  return level >= 17 ? '4' : level >= 14 ? '3' : level >= 11 ? '2' : level >= 8 ? '1' : level >= 5 ? '1/2' : null;
}

/** Conjuração Potente (Luz e Conhecimento 8º): + SAB no dano dos truques de clérigo. */
export function potentSpellcasting(char: Character, sp: Spell, wisMod: number): number {
  if (sp.level !== 0 || !sp.damage) return 0;
  if (levelIn(char, 'cleric') < 8 || (char.subclassId !== 'light' && char.subclassId !== 'knowledge')) return 0;
  if (sp.classes && !sp.classes.includes('cleric')) return 0;
  return Math.max(0, wisMod);
}

/**
 * Cura do Domínio da Vida numa magia de 1º círculo ou maior:
 * Discípulo da Vida (+2 + círculo), Curandeiro Abençoado (6º: você também
 * recupera 2 + círculo quando cura outra criatura) e Cura Suprema (17º:
 * os dados de cura dão o máximo).
 */
export function lifeHealing(char: Character, slotLevel: number): { disciple: number; blessed: number; supreme: boolean } | null {
  const lv = levelIn(char, 'cleric');
  if (!lv || char.subclassId !== 'life' || slotLevel < 1) return null;
  return { disciple: 2 + slotLevel, blessed: lv >= 6 ? 2 + slotLevel : 0, supreme: lv >= 17 };
}

function channelsFor(domain: string | null, level: number, dc: number): ClericChannel[] {
  const out: ClericChannel[] = [
    {
      id: 'turnUndead',
      label: 'Expulsar Mortos-Vivos',
      cost: 'action',
      save: 'SAB',
      desc: `Mortos-vivos a 9 m que vejam ou ouçam você fazem salvaguarda de SAB (CD ${dc}) ou ficam expulsos por 1 minuto (ou até sofrerem dano).${destroyUndeadCr(level) ? ` Os de ND ${destroyUndeadCr(level)} ou menos que falharem são destruídos.` : ''}`,
    },
  ];
  const add = (c: ClericChannel, min = 2) => level >= min && out.push(c);
  switch (domain) {
    case 'life':
      add({ id: 'preserveLife', label: 'Preservar a Vida', cost: 'action', desc: `Divide ${5 * level} PV entre criaturas a 9 m; cada uma vai no máximo até a metade dos PV máximos (não funciona em mortos-vivos e constructos).` });
      break;
    case 'light':
      add({ id: 'radiance', label: 'Radiância da Alvorada', cost: 'action', save: 'CON', roll: { count: 2, die: 10, bonus: level, type: 'radiante' }, desc: `Dissipa escuridão mágica a 9 m; hostis a 9 m fazem salvaguarda de CON (CD ${dc}): 2d10 + ${level} radiante, metade se passarem.` });
      break;
    case 'tempest':
      add({ id: 'destructiveWrath', label: 'Ira Destrutiva', cost: 'free', desc: 'Ao rolar dano elétrico ou trovejante: use o dano MÁXIMO em vez de rolar.' });
      break;
    case 'war':
      add({ id: 'guidedStrike', label: 'Golpe Dirigido', cost: 'free', desc: '+10 numa jogada de ataque sua, depois de ver o d20 e antes de saber se acertou.' });
      add({ id: 'warGodBlessing', label: 'Bênção do Deus da Guerra', cost: 'reaction', desc: 'Reação: +10 na jogada de ataque de uma criatura a 9 m (depois do d20, antes do resultado).' }, 6);
      break;
    case 'knowledge':
      add({ id: 'knowledgeAges', label: 'Conhecimento das Eras', cost: 'action', desc: 'Por 10 minutos, você é proficiente numa perícia ou ferramenta à sua escolha.' });
      add({ id: 'readThoughts', label: 'Ler Pensamentos', cost: 'action', save: 'SAB', desc: `Uma criatura a 18 m faz salvaguarda de SAB (CD ${dc}); falhando, você lê os pensamentos superficiais dela por 1 minuto e pode conjurar sugestão nela sem espaço.` }, 6);
      break;
    case 'nature':
      add({ id: 'charmAnimals', label: 'Encantar Animais e Plantas', cost: 'action', save: 'SAB', desc: `Feras e criaturas-planta a 9 m fazem salvaguarda de SAB (CD ${dc}) ou ficam enfeitiçadas por você por 1 minuto (ou até sofrerem dano).` });
      break;
    case 'trickery':
      add({ id: 'duplicity', label: 'Invocar Duplicidade', cost: 'action', desc: 'Cria uma ilusão perfeita de você a 9 m por 1 minuto (concentração). Você conjura como se estivesse no lugar dela e tem vantagem contra criaturas a 1,5 m dela.' });
      add({ id: 'cloakShadows', label: 'Manto de Sombras', cost: 'action', desc: 'Você fica invisível até o fim do seu próximo turno (ou até atacar ou conjurar).' }, 6);
      break;
  }
  return out;
}

export function clericState(char: Character, prof: number, wisMod: number): ClericState | null {
  const level = levelIn(char, 'cleric');
  if (!level) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const dc = 8 + prof + wisMod;
  const domain = char.subclassId;
  return {
    level,
    dc,
    domain,
    channelLeft: left('channel'),
    channelMax: res.channel?.max ?? 0,
    channels: level >= 2 ? channelsFor(domain, level, dc) : [],
    destroyCr: destroyUndeadCr(level),
    intervention: res.intervention ? { left: left('intervention'), chance: level >= 20 ? 100 : level } : null,
    preserveLife: domain === 'life' && level >= 2 ? 5 * level : null,
    left: { wardingFlare: left('wardingFlare'), wrathStorm: left('wrathStorm'), warPriest: left('warPriest') },
    max: { wardingFlare: res.wardingFlare?.max ?? 0, wrathStorm: res.wrathStorm?.max ?? 0, warPriest: res.warPriest?.max ?? 0 },
  };
}

/** Aplica a cura do Domínio da Vida numa rolagem de cura (Discípulo + Cura Suprema). */
export function withLifeHealing(r: CastRoll, life: ReturnType<typeof lifeHealing>): CastRoll {
  if (!life) return r;
  const bonus = r.bonus + life.disciple;
  // Cura Suprema: os dados dão o máximo (vira um valor fixo)
  if (life.supreme && r.count > 0) return { count: 0, sides: 1, bonus: r.count * r.sides + bonus, label: `${r.label} · Discípulo da Vida +${life.disciple} · Cura Suprema` };
  return { ...r, bonus, label: `${r.label} · Discípulo da Vida +${life.disciple}` };
}
