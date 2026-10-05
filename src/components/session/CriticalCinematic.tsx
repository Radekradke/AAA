import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { tableHero } from '@/lib/tableHeroes';
import { heroAvatar, heroPortraitPosition } from '@/lib/summary';
import { Icon } from '@/components/ui/Icon';
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

const DURATION = { crit: 3200, fumble: 3000 };

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
