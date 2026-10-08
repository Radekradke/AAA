/**
 * Trilha sonora: músicas medievais e de fantasia publicadas no OpenGameArt
 * sob CC0 (domínio público — uso livre, inclusive comercial, sem exigir
 * crédito; damos o crédito mesmo assim). Arquivos em public/music,
 * recomprimidos em MP3 (80/64 kbps, volume igualado) para ficarem leves;
 * só baixam quando tocam. Lista e links em public/music/CREDITOS.txt.
 */
export type MusicMood = 'taverna' | 'aventura' | 'combate' | 'masmorra' | 'drama';

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
  // taverna e cidade
  { id: 'festa', title: 'Festa na Vila', mood: 'taverna', file: '/music/festa-na-vila.mp3', author: 'RandomMind', source: OGA + 'medieval-rejoicing' },
  { id: 'colheita', title: 'Época da Colheita', mood: 'taverna', file: '/music/epoca-da-colheita.mp3', author: 'RandomMind', source: OGA + 'medieval-harvest-season' },
  { id: 'praca', title: 'Praça da Cidade', mood: 'taverna', file: '/music/praca-da-cidade.mp3', author: 'cynicmusic', source: OGA + 'town-theme-rpg' },
  { id: 'cidade-magica', title: 'Cidade Mágica', mood: 'taverna', file: '/music/cidade-magica.mp3', author: 'controllerhead', source: OGA + 'magic-town' },
  { id: 'historia', title: 'Hora da História', mood: 'taverna', file: '/music/hora-da-historia.mp3', author: 'HaelDB', source: OGA + 'story-time' },
  // aventura
  { id: 'orquestral', title: 'Tema Orquestral de Fantasia', mood: 'aventura', file: '/music/tema-orquestral.mp3', author: 'Joth', source: OGA + 'fantasy-orchestral-theme' },
  { id: 'lago', title: 'Lago Espelhado', mood: 'aventura', file: '/music/lago-espelhado.mp3', author: 'Joth', source: OGA + 'mirror-lake' },
  { id: 'campos', title: 'Perdido nos Campos', mood: 'aventura', file: '/music/perdido-nos-campos.mp3', author: 'HaelDB', source: OGA + 'lost-in-the-meadows' },
  { id: 'sonhos', title: 'Campo dos Sonhos', mood: 'aventura', file: '/music/campo-dos-sonhos.mp3', author: 'pauliuw', source: OGA + 'the-field-of-dreams' },
  // combate
  { id: 'espadas', title: 'Preparem as Espadas', mood: 'combate', file: '/music/preparem-as-espadas.mp3', author: 'bojidar-bg', source: OGA + 'prepare-your-swords' },
  { id: 'batalha-a', title: 'Tema de Batalha', mood: 'combate', file: '/music/tema-de-batalha.mp3', author: 'cynicmusic', source: OGA + 'battle-theme-a' },
  { id: 'determinacao', title: 'Determinação', mood: 'combate', file: '/music/determinacao.mp3', author: 'artisticdude', source: OGA + 'determination' },
  // masmorra
  { id: 'ruinas-vila', title: 'Ruínas da Vila', mood: 'masmorra', file: '/music/ruinas-da-vila.mp3', author: 'isaiah658', source: OGA + 'village-ruins' },
  { id: 'caverna', title: 'Caverna', mood: 'masmorra', file: '/music/caverna.mp3', author: 'HaelDB', source: OGA + 'cave-theme' },
  { id: 'cidade-ruinas', title: 'Cidade em Ruínas', mood: 'masmorra', file: '/music/cidade-em-ruinas.mp3', author: 'HaelDB', source: OGA + 'town-in-ruins-loop' },
  { id: 'espreita', title: 'Espreita Noturna', mood: 'masmorra', file: '/music/espreita-noturna.mp3', author: 'section31', source: OGA + 'night-prowler' },
  { id: 'floresta', title: 'Floresta Sombria', mood: 'masmorra', file: '/music/floresta-sombria.mp3', author: 'HaelDB', source: OGA + 'creepy-forest-f' },
  // drama
  { id: 'lua', title: 'Lua Nascente', mood: 'drama', file: '/music/lua-nascente.mp3', author: 'RandomMind', source: OGA + 'fantasy-rising-moon' },
  { id: 'tragico', title: 'Ambiente Trágico', mood: 'drama', file: '/music/ambiente-tragico.mp3', author: 'HaelDB', source: OGA + 'tragic-ambient-main-menu' },
  { id: 'silencio', title: 'Silêncio Frio', mood: 'drama', file: '/music/silencio-frio.mp3', author: 'Eponasoft', source: OGA + 'cold-silence' },
];

export const MOODS: { id: MusicMood; label: string; icon: string; hint: string }[] = [
  { id: 'taverna', label: 'Taverna', icon: '🍺', hint: 'Cidade, descanso, conversa' },
  { id: 'aventura', label: 'Aventura', icon: '🧭', hint: 'Viagem e exploração' },
  { id: 'combate', label: 'Combate', icon: '⚔️', hint: 'Toca sozinho ao rolar iniciativa' },
  { id: 'masmorra', label: 'Masmorra', icon: '🗝️', hint: 'Cavernas, ruínas e suspense' },
  { id: 'drama', label: 'Drama', icon: '🕯️', hint: 'Perdas e momentos solenes' },
];
