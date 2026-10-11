import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import { DRAGON_ANCESTOR, METAMAGIC } from '@/data/classChoices';

/**
 * Feiticeiro (PHB 2014) na mesa: Pontos de Feitiçaria, Fonte de Magia
 * (espaço ↔ pontos), Metamagia que gasta de verdade, Restauração
 * Feiticeira e o que cada origem liga (Dracônica e Magia Selvagem).
 */
export interface MetamagicOption {
  id: string;
  label: string;
  desc: string;
  /** Custo fixo em pontos; Magia Gêmea custa o círculo (1 para truque). */
  cost: number | 'circle';
}

export interface SorcererState {
  level: number;
  /** CD das magias: 8 + prof + CAR. */
  dc: number;
  origin: 'draconic' | 'wild' | null;
  points: number;
  pointsMax: number;
  metamagic: MetamagicOption[];
  /** Linhagem Dracônica: tipo de dano do ancestral. */
  dragonType: string | null;
  dragonLabel: string | null;
  /** Afinidade Elemental (6º): + CAR no dano do tipo do ancestral; 1 ponto = resistência por 1 hora. */
  affinity: boolean;
  /** Asas Dracônicas (14º) e Presença Dracônica (18º, 5 pontos). */
  wings: boolean;
  presence: boolean;
  /** Magia Selvagem: Marés do Caos, Distorcer o Destino (6º), Caos Controlado (14º), Bombardeio (18º). */
  tidesLeft: number;
  bendLuck: boolean;
  controlledChaos: boolean;
  bombardment: boolean;
  /** Restauração Feiticeira (20º): +4 pontos no descanso curto. */
  restoration: boolean;
}

/** Custo para criar um espaço com a Fonte de Magia (PHB 2014): até o 5º círculo. */
export const SLOT_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

const META_COST: Record<string, number | 'circle'> = { careful: 1, distant: 1, empowered: 1, extended: 1, heightened: 3, quickened: 2, subtle: 1, twinned: 'circle' };

export function dragonAncestry(char: Character): { type: string; label: string } | null {
  const id = char.choices?.['sorcerer.dragonAncestor']?.[0];
  const opt = DRAGON_ANCESTOR.find((d) => d.id === id);
  return opt?.tag ? { type: opt.tag, label: opt.label } : null;
}

export function sorcererState(char: Character, prof: number, chaMod: number): SorcererState | null {
  const level = levelIn(char, 'sorcerer');
  if (!level) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const origin = char.subclassId === 'draconic' || char.subclassId === 'wild' ? char.subclassId : null;
  const dragon = origin === 'draconic' ? dragonAncestry(char) : null;
  const known = char.choices?.['sorcerer.metamagic'] ?? [];
  return {
    level,
    dc: 8 + prof + chaMod,
    origin,
    points: left('sorcery'),
    pointsMax: res.sorcery?.max ?? 0,
    metamagic: level >= 3
      ? METAMAGIC.filter((m) => known.includes(m.id)).map((m) => ({ id: m.id, label: m.label, desc: m.desc, cost: META_COST[m.id] ?? 1 }))
      : [],
    dragonType: dragon?.type ?? null,
    dragonLabel: dragon?.label ?? null,
    affinity: origin === 'draconic' && level >= 6 && !!dragon,
    wings: origin === 'draconic' && level >= 14,
    presence: origin === 'draconic' && level >= 18,
    tidesLeft: origin === 'wild' ? left('tides') : 0,
    bendLuck: origin === 'wild' && level >= 6,
    controlledChaos: origin === 'wild' && level >= 14,
    bombardment: origin === 'wild' && level >= 18,
    restoration: level >= 20,
  };
}

/** Afinidade Elemental: + CAR no dano de magia do tipo do ancestral (Dracônica 6º). */
export function elementalAffinity(char: Character, sp: Spell, chosenType: string | null | undefined, chaMod: number): number {
  if (char.subclassId !== 'draconic' || levelIn(char, 'sorcerer') < 6 || !sp.damage) return 0;
  const type = dragonAncestry(char)?.type;
  const dealt = (chosenType ?? sp.damage.type ?? '').toLowerCase();
  return type && dealt.includes(type) ? Math.max(0, chaMod) : 0;
}

/**
 * Tabela de Surto de Magia Selvagem (PHB 2014), resumida: d100 → efeito.
 * Cada faixa cobre dois números (01–02, 03–04…).
 */
export const WILD_SURGE: string[] = [
  'Por 1 minuto, role nesta tabela no início de cada um dos seus turnos (ignore este resultado depois).',
  'Por 1 minuto você vê criaturas invisíveis que estejam na sua linha de visão.',
  'Um modrono aparece a 1,5 m de você e some 1 minuto depois.',
  'Você conjura bola de fogo (3º círculo) centrada em você.',
  'Você conjura míssil mágico (5º círculo).',
  'Role 1d10: sua altura muda em tantos centímetros × 2,5 (par cresce, ímpar encolhe).',
  'Você conjura confusão centrada em você.',
  'Por 1 minuto, recupera 5 PV no início de cada um dos seus turnos.',
  'Cresce uma barba de penas no seu rosto até você espirrar.',
  'Você conjura área escorregadia centrada em você.',
  'Criaturas têm desvantagem na próxima salvaguarda contra a próxima magia que você conjurar no próximo minuto.',
  'Sua pele fica azul vibrante (remover maldição desfaz).',
  'Um olho aparece na sua testa por 1 minuto: vantagem em testes de Sabedoria (Percepção) que usam a visão.',
  'Por 1 minuto, suas magias de 1 ação podem ser conjuradas com uma ação bônus.',
  'Você se teleporta até 18 m para um espaço desocupado que veja.',
  'Você vai ao Plano Astral até o fim do seu próximo turno e volta ao mesmo lugar (ou o mais perto).',
  'Maximize o dano da próxima magia de dano que você conjurar no próximo minuto.',
  'Role 1d10: sua idade muda em tantos anos (ímpar rejuvenesce, par envelhece; nunca abaixo de 1).',
  '1d6 flumphs aparecem a 18 m, amedrontados por você, e somem em 1 minuto.',
  'Você recupera 2d10 PV.',
  'Você vira um vaso de planta até o início do seu próximo turno (caído; sofrer dano te faz voltar).',
  'Por 1 minuto, pode se teleportar 6 m como ação bônus em cada turno.',
  'Você conjura levitação em si mesmo.',
  'Um unicórnio controlado pelo mestre aparece a 1,5 m e some em 1 minuto.',
  'Você não consegue falar por 1 minuto; quando tenta, saem bolhas cor-de-rosa.',
  'Um escudo espectral flutua ao seu lado por 1 minuto: +2 de CA e imune a míssil mágico.',
  'Você fica imune a intoxicação por álcool pelos próximos 5d6 dias.',
  'Seu cabelo cai, mas cresce de volta em 24 horas.',
  'Por 1 minuto, objetos inflamáveis que você toca e ninguém está segurando pegam fogo.',
  'Você recupera seu espaço de magia gasto de menor círculo.',
  'Por 1 minuto, você precisa gritar quando fala.',
  'Você conjura névoa obscurecente centrada em você.',
  'Até três criaturas à sua escolha a 9 m sofrem 4d10 de dano elétrico.',
  'Você fica amedrontado pela criatura mais próxima até o fim do seu próximo turno.',
  'Cada criatura a 9 m de você fica invisível por 1 minuto (atacar ou conjurar desfaz).',
  'Você ganha resistência a todo dano por 1 minuto.',
  'Uma criatura aleatória a 18 m fica envenenada por 1d4 horas.',
  'Você brilha com luz intensa num raio de 9 m por 1 minuto; quem acaba o turno a 1,5 m fica cego até o fim do turno dele.',
  'Você conjura metamorfose em si mesmo; falhando a salvaguarda, vira uma ovelha.',
  'Borboletas e pétalas ilusórias flutuam a 3 m de você por 1 minuto.',
  'Você pode fazer uma ação extra imediatamente.',
  'Cada criatura a 9 m sofre 1d10 de dano necrótico; você recupera PV igual à soma.',
  'Você conjura reflexos.',
  'Você conjura voo numa criatura aleatória a 18 m.',
  'Você fica invisível por 1 minuto; criaturas não ouvem você (atacar ou conjurar desfaz).',
  'Se morrer no próximo minuto, volta à vida como se por reencarnação.',
  'Seu tamanho aumenta uma categoria por 1 minuto.',
  'Você e criaturas a 9 m ficam vulneráveis a dano perfurante por 1 minuto.',
  'Uma música etérea e suave te cerca por 1 minuto.',
  'Você recupera todos os pontos de feitiçaria gastos.',
];

/** Efeito do Surto para um d100 (1–100). */
export function wildSurgeEffect(d100: number): string {
  const i = Math.min(49, Math.max(0, Math.ceil(d100 / 2) - 1));
  return WILD_SURGE[i];
}
