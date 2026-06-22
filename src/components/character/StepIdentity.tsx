import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { BACKGROUNDS } from '@/data/backgrounds';
import { useTheme } from '@/lib/useTheme';

const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
];

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 7,
};

export function StepIdentity({ char, update }: StepProps) {
  const t = useTheme();

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
    background: char.gender === g ? 'rgba(255,224,138,.12)' : 'rgba(0,0,0,.28)',
    boxShadow: char.gender === g ? '0 0 16px var(--bloom)' : 'none',
    transition: '.25s',
  });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo I"
        title="Identidade"
        subtitle="Quem é o herói por trás dos números? Dê um nome e um rosto à lenda."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <label style={{ display: 'block' }}>
          <span style={fieldLabel}>Nome do personagem</span>
          <input
            className="fv-input"
            style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}
            value={char.name}
            placeholder="Ex.: Thorgrim Pé-de-Ferro"
            onChange={(e) => update((c) => { c.name = e.target.value; })}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={fieldLabel}>Antecedente</span>
          <select
            className="fv-input"
            value={char.backgroundId}
            onChange={(e) => update((c) => { c.backgroundId = e.target.value; })}
          >
            {BACKGROUNDS.map((b) => (
              <option key={b.id} value={b.id} style={{ color: '#111' }}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span style={fieldLabel}>Alinhamento</span>
          <select
            className="fv-input"
            value={char.alignment}
            onChange={(e) => update((c) => { c.alignment = e.target.value; })}
          >
            {ALIGNMENTS.map((a) => (
              <option key={a} value={a} style={{ color: '#111' }}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span style={fieldLabel}>Idade</span>
          <input
            className="fv-input"
            value={char.age}
            placeholder="Ex.: 142 anos"
            onChange={(e) => update((c) => { c.age = e.target.value; })}
          />
        </label>
        <div style={{ display: 'block' }}>
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
      </div>
      <label style={{ display: 'block', marginTop: 14 }}>
        <span style={fieldLabel}>Conceito</span>
        <textarea
          className="fv-input"
          rows={3}
          style={{ resize: 'none', lineHeight: 1.55 }}
          value={char.concept}
          placeholder="Em poucas linhas, quem é seu herói e o que o move?"
          onChange={(e) => update((c) => { c.concept = e.target.value; })}
        />
      </label>
    </div>
  );
}
