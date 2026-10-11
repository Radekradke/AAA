/**
 * Vídeo e imagem parada de cada raça para o Palco das Origens. Os arquivos
 * ficam em src/assets/racas/<id-da-raça>.mp4 (e .webp); colocar o arquivo
 * basta para a raça ganhar a cena. Ver o LEIA-ME de lá.
 */
const FILES = import.meta.glob('../assets/racas/*.{mp4,webm,webp,jpg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface RaceStageMedia {
  video?: string;
  poster?: string;
}

const MEDIA: Record<string, RaceStageMedia> = {};
for (const [path, url] of Object.entries(FILES)) {
  const file = path.split('/').pop()!;
  const dot = file.lastIndexOf('.');
  const id = file.slice(0, dot);
  const ext = file.slice(dot + 1);
  const m = (MEDIA[id] ??= {});
  if (ext === 'mp4' || ext === 'webm') m.video = url;
  else m.poster = url;
}

export function raceStageMedia(raceId: string): RaceStageMedia {
  return MEDIA[raceId] ?? {};
}
