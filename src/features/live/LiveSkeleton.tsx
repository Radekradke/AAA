/**
 * Mesa carregando: o desenho da tela (título, palco, turno e herói) em
 * blocos apagados, em vez de uma tela vazia — e sem mostrar a mesa do
 * jogador ao mestre antes de saber quem é quem.
 */
export function LiveSkeleton() {
  return (
    <div className="fv-live fv-live-skel" aria-busy="true" aria-live="polite">
      <span className="fv-sr-only">Carregando a mesa…</span>
      <div className="fv-skel-line is-kicker" aria-hidden />
      <div className="fv-skel-line is-title" aria-hidden />
      <div className="fv-skel-block is-stage" aria-hidden />
      <div className="fv-skel-row" aria-hidden>
        <div className="fv-skel-block is-card" />
        <div className="fv-skel-block is-card is-narrow" />
      </div>
    </div>
  );
}
