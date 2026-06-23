interface ChapterTitleProps {
  chapter: string;
  title: string;
  subtitle: string;
}

/** Título de capítulo padronizado (Capítulo · Título · descrição). */
export function ChapterTitle({ chapter, title, subtitle }: ChapterTitleProps) {
  return (
    <div style={{ marginBottom: 'clamp(10px, 1.4vw, 14px)' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {chapter}
      </div>
      <h2
        style={{
          margin: '2px 0 3px',
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 'clamp(22px,2.8vw,30px)',
          lineHeight: 1.02,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.45, fontSize: 'clamp(12px, 1.5vw, 13.5px)' }}>{subtitle}</p>
    </div>
  );
}
