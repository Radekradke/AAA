import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { passiveLore } from '@/lib/lore';
import { randomName, randomAge } from '@/data/names';
import { getRace } from '@/data/races';

/** Grade de alinhamento 3×3 (eixos Lei↔Caos e Bem↔Mal). */
const ALIGN_GRID: { full: string; abbr: string }[] = [
  { full: 'Leal e Bom', abbr: 'LB' },
  { full: 'Neutro e Bom', abbr: 'NB' },
  { full: 'Caótico e Bom', abbr: 'CB' },
  { full: 'Leal e Neutro', abbr: 'LN' },
  { full: 'Neutro', abbr: 'N' },
  { full: 'Caótico e Neutro', abbr: 'CN' },
  { full: 'Leal e Mau', abbr: 'LM' },
  { full: 'Neutro e Mau', abbr: 'NM' },
  { full: 'Caótico e Mau', abbr: 'CM' },
];

/** Sementes de inspiração para o conceito. */
const CONCEPT_SEEDS = [
  'Vingança', 'Redenção', 'Glória', 'Proteger os inocentes',
  'Conhecimento proibido', 'Riqueza', 'Liberdade', 'Honra do clã', 'Fé inabalável',
];

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 7,
};

const ALIGN_LORE = passiveLore(
  'Alinhamento',
  'Bússola moral',
  'Resume a ética (Leal ↔ Caótico) e a moral (Bom ↔ Mau) do herói. É um guia de interpretação, não uma camisa de força — bons personagens têm contradições.',
  ['Lei ↔ Caos', 'Bem ↔ Mal'],
);

export function StepIdentity({ char, update }: StepProps) {
  const t = useTheme();
  const race = getRace(char.raceId);

  const genderBtn = (g: 'masc' | 'fem'): React.CSSProperties => ({
    cursor: 'pointer',
    flex: 1,
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '.03em',
    padding: '11px 0',
    borderRadius: 10,
    border: '1px solid ' + (char.gender === g ? t.gold : t.line),
    color: char.gender === g ? t.gold : t.muted,
    background: char.gender === g ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.28)',
    boxShadow: char.gender === g ? '0 0 16px var(--bloom)' : 'none',
    transition: '.25s',
  });

  const rollName = () => update((c) => { c.name = randomName(c.raceId, c.gender); });
  const rollAge = () => update((c) => { c.age = randomAge(c.raceId); });

  const addSeed = (seed: string) =>
    update((c) => {
      const cur = c.concept.trim();
      c.concept = cur ? `${cur} · ${seed}` : seed;
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo I"
        title="Identidade"
        subtitle={`Quem é o herói por trás dos números? Dê nome, rosto e intenção a este ${race.label.toLowerCase()}.`}
      />

      {/* Nome + dado de nomes */}
      <label style={{ display: 'block' }}>
        <span style={fieldLabel}>Nome do personagem</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="fv-input"
            style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}
            value={char.name}
            placeholder="Ex.: Thorgrim Pé-de-Ferro"
            onChange={(e) => update((c) => { c.name = e.target.value; })}
          />
          <button
            type="button"
            onClick={rollName}
            title="Gerar nome aleatório"
            aria-label="Gerar nome aleatório"
            style={diceBtn(t)}
          >
            🎲
          </button>
        </div>
      </label>

      {/* Sexo + Idade */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginTop: 14 }}>
        <div>
          <span style={fieldLabel}>Sexo</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => update((c) => { c.gender = 'masc'; })} style={genderBtn('masc')}>
              Masculino
            </button>
            <button type="button" onClick={() => update((c) => { c.gender = 'fem'; })} style={genderBtn('fem')}>
              Feminino
            </button>
          </div>
        </div>
        <label style={{ display: 'block' }}>
          <span style={fieldLabel}>Idade</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="fv-input"
              value={char.age}
              placeholder="Ex.: 142 anos"
              onChange={(e) => update((c) => { c.age = e.target.value; })}
            />
            <button type="button" onClick={rollAge} title="Idade aleatória" aria-label="Idade aleatória" style={diceBtn(t)}>
              🎲
            </button>
          </div>
        </label>
      </div>

      {/* Alinhamento em grade 3×3 */}
      <div style={{ marginTop: 16 }}>
        <LoreTooltip info={ALIGN_LORE}>
          <span style={{ ...fieldLabel, marginBottom: 9, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'help' }}>
            Alinhamento
            <span style={{ width: 14, height: 14, borderRadius: 999, border: '1px solid var(--line)', display: 'inline-grid', placeItems: 'center', fontSize: 9, color: 'var(--muted)' }}>?</span>
          </span>
        </LoreTooltip>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 360 }}>
          {ALIGN_GRID.map((a) => {
            const active = char.alignment === a.full;
            return (
              <button
                key={a.full}
                type="button"
                onClick={() => update((c) => { c.alignment = a.full; })}
                title={a.full}
                style={{
                  cursor: 'pointer',
                  padding: '12px 6px 10px',
                  borderRadius: 12,
                  textAlign: 'center',
                  border: '1px solid ' + (active ? t.gold : t.line),
                  background: active ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.26)',
                  boxShadow: active ? '0 0 18px ' + hexA(t.gold, 0.3) : 'none',
                  transition: '.2s',
                }}
              >
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 17, color: active ? t.gold : 'var(--ink)' }}>
                  {a.abbr}
                </div>
                <div style={{ marginTop: 3, fontSize: 9.5, color: 'var(--muted)', lineHeight: 1.15 }}>{a.full}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conceito + sementes de inspiração */}
      <div style={{ marginTop: 16 }}>
        <span style={fieldLabel}>Conceito</span>
        <textarea
          className="fv-input"
          rows={3}
          style={{ resize: 'none', lineHeight: 1.55 }}
          value={char.concept}
          placeholder="Em poucas linhas, quem é seu herói e o que o move?"
          onChange={(e) => update((c) => { c.concept = e.target.value; })}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>Inspiração:</span>
          {CONCEPT_SEEDS.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => addSeed(seed)}
              style={{
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid ' + t.line,
                color: 'var(--muted)',
                background: 'rgba(0,0,0,.22)',
                transition: '.2s',
              }}
            >
              + {seed}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function diceBtn(t: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    cursor: 'pointer',
    flex: 'none',
    width: 48,
    borderRadius: 11,
    border: '1px solid ' + hexA(t.gold, 0.5),
    background: hexA(t.gold, 0.1),
    color: t.gold,
    fontSize: 18,
    transition: '.2s',
  };
}
