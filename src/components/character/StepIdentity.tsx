import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { BACKGROUNDS } from '@/data/backgrounds';

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
