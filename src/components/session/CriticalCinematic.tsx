import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { tableHero } from '@/lib/tableHeroes';
import { heroAvatar, heroPortraitPosition } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';
import { playFlatline, playHeartbeat } from '@/lib/sfx';
import type { DeathOutcome } from '@/engine/deathSave';
import '@/styles/cinematic.css';

/** Frases do tropeço (1 natural) — sorteadas a cada vez. */
export const FUMBLE_LINES = [
  'Escorregou numa casca de banana arcana.',
  'Os deuses viraram o rosto por um segundo.',
  'O dado rolou para debaixo da mesa… e lá ficou.',
  'Até o goblin riu.',
  'A arma decidiu tirar o dia de folga.',
  'Tropeçou no próprio manto. De novo.',
  'O bardo já está compondo uma música sobre isso.',
  'Mirou no inimigo, acertou a dignidade.',
  'Um pombo assistiu tudo. E julgou.',
  'Foi tão ruim que o mestre ficou com pena.',
];

const DURATION = { crit: 3200, fumble: 3000, death: 4400 };

/** Teste contra a morte: título e frase de cada desfecho. */
const DEATH_TEXT: Record<DeathOutcome, { title: string; line: string }> = {
  revive: { title: 'De volta!', line: '20 natural — levanta com 1 PV.' },
  stable: { title: 'Estabilizado', line: 'Três sucessos: inconsciente, mas vivo.' },
  success: { title: 'Resiste…', line: 'Sucesso no teste contra a morte.' },
  fail: { title: 'Escorrega…', line: 'Falha no teste contra a morte.' },
  double: { title: 'A morte se aproxima', line: '1 natural — duas falhas de uma vez.' },
  dead: { title: 'Tombou.', line: 'Três falhas. O herói se foi.' },
};

/** Traçado do monitor: três batidas atravessando a tela (a do meio passa ao lado da arte). */
const ECG = 'M0 60' + [40, 240, 440].map((x) => ` H${x} l12 -8 l10 8 h18 l10 -46 l14 92 l12 -58 l8 12 h26 l14 -14 l14 14`).join('') + ' H600';

/** Batimento mais rápido a cada falha (s por batida); null = linha reta. */
const beatOf = (fail: number, outcome: DeathOutcome) => (outcome === 'dead' ? null : outcome === 'revive' || outcome === 'stable' ? 0.9 : [1.1, 0.75, 0.5][Math.min(2, fail)]);

/**
 * Crítico cinematográfico: num 20 natural, um breve momento em tela cheia
 * com a arte do herói (raios dourados, "20!" gigante); num 1 natural, um
 * tropeço com humor. Aparece para quem rolou e — na mesa ao vivo — para a
 * mesa toda. Toque, Esc ou o tempo fecham. Desligável em Configurações.
 */
export function CriticalCinematic() {
  const c = useUiStore((s) => s.cinematic);
  const clear = useUiStore((s) => s.clearCinematic);
  const local = useCharacterStore((s) => (c?.sheetId ? s.characters.find((x) => x.id === c.sheetId) : undefined));
  const hero = local ?? tableHero(c?.sheetId);
  // a frase muda a cada tropeço (chave: o instante do evento)
  const line = useMemo(() => FUMBLE_LINES[Math.floor(Math.random() * FUMBLE_LINES.length)], [c?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  // som do monitor no teste contra a morte (com os efeitos sonoros ligados)
  useEffect(() => {
    if (c?.kind !== 'death' || !c.death) return;
    const beat = beatOf(c.death.fail, c.death.outcome);
    if (beat === null) playFlatline();
    else playHeartbeat(Math.floor(3.6 / beat), beat);
  }, [c]);

  useEffect(() => {
    if (!c) return;
    const t = setTimeout(clear, DURATION[c.kind]);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clear();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [c, clear]);

  if (!c) return null;
  const name = hero?.name?.trim() || c.name || 'Herói';
  const art = hero ? heroAvatar(hero) : null;
  if (c.kind === 'death' && c.death) {
    const d = c.death;
    const txt = DEATH_TEXT[d.outcome];
    const beat = beatOf(d.fail, d.outcome);
    return createPortal(
      <div key={c.at} className={`fv-cine is-death is-${d.outcome}`} style={{ '--beat': `${beat ?? 1}s` } as CSSProperties} onClick={clear} role="status" aria-live="assertive">
        <span className="fv-cine-vignette" aria-hidden />
        <svg className="fv-cine-ecg" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
          <path d={beat === null ? 'M0 60 H600' : ECG} />
        </svg>
        <div className="fv-cine-art" aria-hidden>
          {art ? <img src={art} alt="" style={{ objectPosition: hero ? heroPortraitPosition(hero) : undefined }} /> : <Icon name="d20" size={120} />}
        </div>
        <div className="fv-cine-text">
          <span className="fv-cine-num" aria-hidden>
            {d.nat}
          </span>
          <b className="fv-cine-title">{txt.title}</b>
          <span className="fv-cine-who">
            {name}
            <small> · Teste contra a Morte</small>
          </span>
          <span className="fv-cine-line">{txt.line}</span>
          {d.outcome !== 'revive' && (
            <span className="fv-cine-pips" aria-hidden>
              <span className="is-ok">
                {[0, 1, 2].map((i) => (
                  <i key={i} className={i < d.success ? 'is-on' : ''} />
                ))}
              </span>
              <span className="is-bad">
                {[0, 1, 2].map((i) => (
                  <i key={i} className={i < d.fail ? 'is-on' : ''} />
                ))}
              </span>
            </span>
          )}
          <span className="fv-sr-only">{`Teste contra a morte de ${name}: ${d.nat} natural. ${txt.title} ${txt.line} Sucessos ${d.success} de 3, falhas ${d.fail} de 3.`}</span>
        </div>
      </div>,
      document.body,
    );
  }
  const crit = c.kind === 'crit';
  return createPortal(
    <div key={c.at} className={'fv-cine ' + (crit ? 'is-crit' : 'is-fumble')} onClick={clear} role="status" aria-live="assertive">
      <span className="fv-cine-rays" aria-hidden />
      <div className="fv-cine-art" aria-hidden>
        {art ? <img src={art} alt="" style={{ objectPosition: hero ? heroPortraitPosition(hero) : undefined }} /> : <Icon name="d20" size={120} />}
      </div>
      <div className="fv-cine-text">
        <span className="fv-cine-num" aria-hidden>
          {crit ? '20' : '1'}
        </span>
        <b className="fv-cine-title">{crit ? 'Crítico!' : 'Tropeço!'}</b>
        <span className="fv-cine-who">
          {name}
          {c.label ? <small> · {c.label}</small> : null}
        </span>
        {!crit && <span className="fv-cine-line">{line}</span>}
        <span className="fv-sr-only">{crit ? `20 natural de ${name}!` : `1 natural de ${name}. ${line}`}</span>
      </div>
    </div>,
    document.body,
  );
}
