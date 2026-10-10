import { voices } from '@/lib/voices';
import type { StepProps } from './stepTypes';
import { STEP_IDENTITY } from '@/engine/creationSummary';
import { StepHeader, SectionTitle, FactList } from './creatorUi';
import { HeroPanel } from './HeroPanel';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { passiveLore } from '@/lib/lore';
import { randomName, randomAge } from '@/data/names';
import { raceLine } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import { deriveCharacter } from '@/engine/dndRules';
import { finalizeCharacter } from '@/engine/characterBuilder';
import { getSubclass } from '@/data/subclasses';
import { getSpell } from '@/data/spells';
import { creationChoices } from '@/engine/classChoices';
import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';

const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
];

const CONCEPT_SEEDS = ['Vingança', 'Redenção', 'Glória', 'Proteger os inocentes', 'Conhecimento proibido', 'Liberdade', 'Honra do clã', 'Fé inabalável'];

const ALIGN_LORE = passiveLore(
  'Alinhamento',
  'Bússola moral',
  'Resume a ética (Leal ↔ Caótico) e a moral (Bom ↔ Mau) do herói. É um guia de interpretação, não uma camisa de força.',
  ['Lei ↔ Caos', 'Bem ↔ Mal'],
);

/** Capítulo VII — Despertar: nome e alma do herói + a lenda revisada. */
export function StepAwaken({ char, update, onGoStep }: StepProps & { onGoStep?: (step: number) => void }) {
  // a ficha como vai nascer: ferramentas, idiomas e magias exatamente como entram
  const born = useMemo(() => finalizeCharacter(structuredClone(char)), [char]);
  const d = deriveCharacter(born);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const sub = getSubclass(char.subclassId);
  const skills = d.skills.filter((s) => s.proficient).map((s) => SKILL_BY_KEY[s.key].label + (s.expertise ? ' ★' : ''));
  const gifts = creationChoices(char).flatMap((c) => c.options.filter((o) => c.chosen.includes(o.id)).map((o) => o.label));
  const spellNames = [...new Set([...born.preparedSpells, ...(born.knownSpells ?? [])])].map((id) => getSpell(id)?.name).filter(Boolean);

  const addSeed = (seed: string) =>
    update((c) => {
      const cur = c.concept.trim();
      c.concept = cur ? `${cur} · ${seed}` : seed;
    });

  return (
    <div className="fv-step">
      <StepHeader step={STEP_IDENTITY} char={char} />

      <div className="fv-awaken">
        <label className="fv-field fv-field-name">
          <span>Nome</span>
          <div className="fv-field-row">
            <input
              className="fv-input"
              value={char.name}
              placeholder="Como a lenda vai chamá-lo?"
              autoComplete="off"
              onChange={(e) => update((c) => { c.name = e.target.value; })}
            />
            <button type="button" className="fv-dice-btn" aria-label="Sortear nome" title="Sortear nome" onClick={() => update((c) => { c.name = randomName(c.raceId, c.gender); })}>
              <Icon name="d20" size={20} />
            </button>
          </div>
        </label>

        <div className="fv-field-grid">
          <div className="fv-field">
            <span>Aparência</span>
            <div className="fv-seg" role="radiogroup" aria-label="Aparência">
              {(['masc', 'fem'] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={char.gender === g} className={char.gender === g ? 'is-on' : ''} onClick={() => { update((c) => { c.gender = g; }); voices.play(char.classId, g); }}>
                  {g === 'masc' ? 'Masculina' : 'Feminina'}
                </button>
              ))}
            </div>
          </div>
          <label className="fv-field">
            <span>Idade</span>
            <div className="fv-field-row">
              <input className="fv-input" value={char.age} placeholder="Ex.: 142 anos" onChange={(e) => update((c) => { c.age = e.target.value; })} />
              <button type="button" className="fv-dice-btn" aria-label="Sortear idade" title="Sortear idade" onClick={() => update((c) => { c.age = randomAge(c.raceId); })}>
                <Icon name="d20" size={20} />
              </button>
            </div>
          </label>
          <label className="fv-field">
            <LoreTooltip info={ALIGN_LORE}>
              <span style={{ cursor: 'help' }}>Alinhamento ⓘ</span>
            </LoreTooltip>
            <select className="fv-input" value={char.alignment} onChange={(e) => update((c) => { c.alignment = e.target.value; })}>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="fv-awaken-split">
          <div className="fv-form">
            <label className="fv-field">
              <span>Conceito <small>(opcional)</small></span>
              <textarea
                className="fv-input"
                rows={2}
                style={{ resize: 'none', lineHeight: 1.5 }}
                value={char.concept}
                placeholder="Em uma frase: quem é seu herói e o que o move?"
                onChange={(e) => update((c) => { c.concept = e.target.value; })}
              />
            </label>
            <div className="fv-pills">
              {CONCEPT_SEEDS.map((seed) => (
                <button key={seed} type="button" className="fv-pill is-ghost" onClick={() => addSeed(seed)}>
                  + {seed}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>A lenda até aqui</SectionTitle>
            <FactList
              title=""
              facts={[
                { label: 'Origem', value: raceLine(char) },
                { label: 'Caminho', value: `${cls.label}${sub ? ` (${sub.label})` : ''} · nível ${char.level}` },
                ...(gifts.length ? [{ label: 'Dons', value: gifts.join(', ') }] : []),
                { label: 'Passado', value: bg.label },
                { label: 'Atributos', value: ABILITY_KEYS.map((k) => `${ABILITY_SHORT[k]} ${d.abilities[k].total}`).join(' · ') },
                { label: 'Perícias', value: skills.join(', ') || '—' },
                ...((born.toolProfs ?? []).length ? [{ label: 'Ferramentas', value: born.toolProfs.map((t) => t.label + (t.expertise ? ' ★' : '')).join(', ') }] : []),
                { label: 'Idiomas', value: d.languages.join(', ') || '—' },
                ...(spellNames.length ? [{ label: 'Magias', value: spellNames.join(', ') }] : []),
              ]}
            />
          </div>
        </div>
      </div>

      {/* no celular/tablet o retrato fecha a página, depois do nome (no desktop ele vive na coluna à direita) */}
      <div className="fv-awaken-hero">
        <HeroPanel char={char} onGoStep={onGoStep} onPortrait={(url) => update((c) => { c.portrait = url; })} />
      </div>
    </div>
  );
}
