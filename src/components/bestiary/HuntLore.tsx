import type { CSSProperties } from 'react';
import type { Monster, MonsterAction } from '@/data/bestiary';
import { HUNT_TIERS, huntKnowledge, huntTier, nextHuntTier } from '@/engine/hunts';
import type { HuntStage } from '@/engine/hunts';
import { abilityMod } from '@/engine/monsters';
import { ABILITY_SHORT } from '@/data/skills';
import type { AbilityKey } from '@/types/dnd';
import '@/styles/bestiary.css';

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const minOf = (id: HuntStage) => HUNT_TIERS.find((t) => t.id === id)!.min;

/** "Mordida: +4 para acertar, 2d4+2 perfurante" */
function actionText(a: MonsterAction): string {
  const bits = [
    a.toHit !== undefined ? `${sign(a.toHit)} para acertar` : null,
    a.reach ? a.reach : null,
    a.damage ? `${a.damage}${a.type ? ` ${a.type}` : ''}` : null,
    a.extra ? `+ ${a.extra.damage} ${a.extra.type}` : null,
    a.save ? `salvaguarda de ${ABILITY_SHORT[a.save.ability]} CD ${a.save.dc}${a.save.half ? ' (metade)' : ''}` : null,
    a.recharge ? `recarga ${a.recharge}` : null,
  ].filter(Boolean);
  return bits.join(' · ') || a.note || '';
}

interface Group {
  id: HuntStage;
  title: string;
  rows: [string, string][];
}

function groupsFor(m: Monster): Group[] {
  return [
    {
      id: 'rastro',
      title: 'Básico',
      rows: [
        ['Tipo', `${m.size} · ${m.type}`],
        ['ND', `${m.cr} (${m.xp.toLocaleString('pt-BR')} XP)`],
        ['Deslocamento', m.speed],
        ['Idiomas', m.languages || '—'],
      ],
    },
    {
      id: 'presa',
      title: 'Defesa',
      rows: [
        ['CA', `${m.ac}${m.acNote ? ` (${m.acNote})` : ''}`],
        ['Pontos de vida', `${m.hp} (${m.hpDice})`],
      ],
    },
    {
      id: 'estudada',
      title: 'Pontos fracos',
      rows: [
        ['Vulnerável a', m.vuln || 'nada'],
        ['Resiste a', m.resist || 'nada'],
        ['Imune a', m.immune || 'nada'],
        ['Sentidos', m.senses || '—'],
      ],
    },
    {
      id: 'especialidade',
      title: 'Como luta',
      rows: [
        ...(m.multiattack ? ([['Multiataque', m.multiattack]] as [string, string][]) : []),
        ...m.actions.map((a) => [a.name, actionText(a)] as [string, string]),
        ...(m.saves ? ([['Salvaguardas', m.saves]] as [string, string][]) : []),
        ...(m.traits ?? []).map((t) => [t.name, t.desc] as [string, string]),
      ],
    },
    {
      id: 'nemesis',
      title: 'Ficha inteira',
      rows: [
        ['Atributos', KEYS.map((k) => `${ABILITY_SHORT[k]} ${m.abilities[k]} (${sign(abilityMod(m.abilities[k]))})`).join(' · ')],
        ...(m.skills ? ([['Perícias', m.skills]] as [string, string][]) : []),
        ...(m.reactions ?? []).map((r) => [`Reação: ${r.name}`, r.desc] as [string, string]),
      ],
    },
  ];
}

/**
 * O que o herói sabe da criatura pelo bestiário de caçadas: cada nível
 * (1, 3, 5, 10 e 25 abates) destrava um bloco; os outros ficam com cadeado
 * dizendo quantos abates faltam.
 */
export function HuntLore({ m, n, name, compact }: { m: Monster; n: number; name?: string; compact?: boolean }) {
  const tier = huntTier(n);
  const next = nextHuntTier(n);
  const know = huntKnowledge(n);
  const open: Record<HuntStage, boolean> = { rastro: know.basics, presa: know.defense, estudada: know.resist, especialidade: know.attacks, nemesis: know.full };
  const prevMin = tier?.min ?? 0;
  const pct = next ? Math.round(((n - prevMin) / (next.min - prevMin)) * 100) : 100;
  return (
    <section className={'fv-hunt' + (compact ? ' is-compact' : '')} aria-label={`Bestiário de caçadas: ${name ?? m.name}`}>
      <header className="fv-hunt-head">
        <span>
          <b>{tier ? tier.label : 'Nunca abatida'}</b>
          <small>
            {n} {n === 1 ? 'abate' : 'abates'}
          </small>
        </span>
        <span
          className="fv-hunt-bar"
          role="progressbar"
          aria-label={next ? `Até ${next.label}` : 'Conhecimento completo'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{ '--p': `${pct}%` } as CSSProperties}
        />
        <small className="fv-hunt-next">
          {next ? `Mais ${next.min - n} ${next.min - n === 1 ? 'abate' : 'abates'} para ${next.label}: ${next.reveals}.` : 'Você conhece esta criatura como ninguém.'}
        </small>
      </header>
      {groupsFor(m).map((g) =>
        open[g.id] ? (
          <div key={g.id} className="fv-hunt-group">
            <h4 className="fv-hunt-title">{g.title}</h4>
            <dl>
              {g.rows.map(([k, v], i) => (
                <div key={`${k}-${i}`} className="fv-hunt-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p key={g.id} className="fv-hunt-lock">
            <span aria-hidden>🔒</span> {g.title} — com {minOf(g.id)} abates
          </p>
        ),
      )}
    </section>
  );
}
