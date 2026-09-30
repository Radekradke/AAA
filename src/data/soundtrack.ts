/**
 * Trilha sonora: músicas medievais de RandomMind, publicadas no OpenGameArt
 * sob CC0 (domínio público — uso livre, inclusive comercial, sem exigir
 * crédito; damos o crédito mesmo assim). Arquivos em public/music,
 * recomprimidos em MP3 80 kbps para ficarem leves.
 */
export type MusicMood = 'taverna' | 'aventura' | 'combate' | 'drama';

export interface Track {
  id: string;
  title: string;
  mood: MusicMood;
  file: string;
  author: string;
  source: string;
}

const OGA = 'https://opengameart.org/content/';

export const TRACKS: Track[] = [
  { id: 'torre', title: 'A Taverna da Velha Torre', mood: 'taverna', file: '/music/taverna-velha-torre.mp3', author: 'RandomMind', source: OGA + 'medieval-the-old-tower-inn' },
  { id: 'menestrel', title: 'Dança do Menestrel', mood: 'taverna', file: '/music/danca-do-menestrel.mp3', author: 'RandomMind', source: OGA + 'medieval-minstrel-dance' },
  { id: 'banquete', title: 'Banquete do Rei', mood: 'taverna', file: '/music/banquete-do-rei.mp3', author: 'RandomMind', source: OGA + 'medieval-kings-feast' },
  { id: 'feira', title: 'Dia de Feira', mood: 'taverna', file: '/music/dia-de-feira.mp3', author: 'RandomMind', source: OGA + 'medieval-market-day' },
  { id: 'exploracao', title: 'Exploração', mood: 'aventura', file: '/music/exploracao.mp3', author: 'RandomMind', source: OGA + 'medieval-exploration' },
  { id: 'bardo', title: 'O Conto do Bardo', mood: 'aventura', file: '/music/conto-do-bardo.mp3', author: 'RandomMind', source: OGA + 'medieval-the-bards-tale' },
  { id: 'batalha', title: 'Batalha', mood: 'combate', file: '/music/batalha.mp3', author: 'RandomMind', source: OGA + 'medieval-battle' },
  { id: 'lamento', title: 'Lamento pela Alma do Guerreiro', mood: 'drama', file: '/music/lamento-do-guerreiro.mp3', author: 'RandomMind', source: OGA + 'fantasy-lament-for-a-warriors-soul' },
];

export const MOODS: { id: MusicMood; label: string; icon: string; hint: string }[] = [
  { id: 'taverna', label: 'Taverna', icon: '🍺', hint: 'Cidade, descanso, conversa' },
  { id: 'aventura', label: 'Aventura', icon: '🧭', hint: 'Viagem e exploração' },
  { id: 'combate', label: 'Combate', icon: '⚔️', hint: 'Toca sozinho ao rolar iniciativa' },
  { id: 'drama', label: 'Drama', icon: '🕯️', hint: 'Perdas e momentos solenes' },
];
