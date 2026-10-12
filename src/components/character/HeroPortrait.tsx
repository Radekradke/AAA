import { useEffect, useState } from 'react';
import type { Character } from '@/types/character';
import { heroAvatar, heroArtKeys, heroPortraitPosition } from '@/lib/summary';

const warmed = new Set<string>();
export function warmHeroPortraits(classId: string) {
  if (typeof Image === 'undefined') return;
  for (const gender of ['masc', 'fem']) {
    const url = heroArtKeys()[`${classId}-${gender}`];
    if (!url || warmed.has(url)) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.onerror = () => warmed.delete(url);
    img.src = url;
  }
}

/** A chave da imagem impede que um carregamento antigo mantenha o gênero anterior. */
export function HeroPortrait({ char }: { char: Character }) {
  const src = heroAvatar(char);
  useEffect(() => warmHeroPortraits(char.classId), [char.classId]);
  return <PortraitImage key={src} src={src} position={heroPortraitPosition(char)} />;
}

function PortraitImage({ src, position }: { src: string; position: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return <>
    <img src={src} alt="Retrato do herói" decoding="async" loading="eager" {...{ fetchpriority: 'high' }} onLoad={() => setStatus('ready')} onError={() => setStatus('error')} style={{ objectPosition: position, opacity: status === 'ready' ? 1 : 0 }} />
    {status !== 'ready' && <span role="status" style={{ position: 'absolute', inset: '35% 12% auto', textAlign: 'center', color: 'var(--muted)' }}>{status === 'error' ? 'Retrato indisponível. Você pode escolher outra imagem.' : 'Carregando retrato…'}</span>}
  </>;
}
