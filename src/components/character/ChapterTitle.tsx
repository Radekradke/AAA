interface ChapterTitleProps {
  chapter: string;
  title: string;
  subtitle: string;
}

/** Título de capítulo padronizado (Capítulo · Título · descrição). */
export function ChapterTitle({ chapter, title, subtitle }: ChapterTitleProps) {
  return (
    <div style={{ marginBottom: 'clamp(14px, 2vw, 18px)' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {chapter}
      </div>
      <h2
        style={{
          margin: '4px 0 4px',
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 'clamp(26px,3.4vw,38px)',
          lineHeight: 1.02,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.55, fontSize: 'clamp(13px, 1.7vw, 15px)' }}>{subtitle}</p>
    </div>
  );
}
