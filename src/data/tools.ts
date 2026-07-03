/**
 * Ferramentas de D&D 5e 2014 — catálogo para proficiências e expertise.
 * Agrupadas por tipo (kits, instrumentos, ferramentas de artesão, jogos,
 * veículos). A ficha aceita também ferramentas fora do catálogo (homebrew).
 */
export interface ToolDef {
  id: string;
  label: string;
  group: 'kit' | 'artesao' | 'instrumento' | 'jogo' | 'veiculo';
}

export const TOOLS: ToolDef[] = [
  // kits e ferramentas especiais
  { id: 'thieves-tools', label: 'Ferramentas de Ladrão', group: 'kit' },
  { id: 'disguise-kit', label: 'Kit de Disfarce', group: 'kit' },
  { id: 'forgery-kit', label: 'Kit de Falsificação', group: 'kit' },
  { id: 'herbalism-kit', label: 'Kit de Herbalismo', group: 'kit' },
  { id: 'poisoners-kit', label: 'Kit de Envenenador', group: 'kit' },
  { id: 'navigators-tools', label: 'Ferramentas de Navegador', group: 'kit' },
  // ferramentas de artesão
  { id: 'smiths-tools', label: 'Ferramentas de Ferreiro', group: 'artesao' },
  { id: 'alchemists-supplies', label: 'Suprimentos de Alquimista', group: 'artesao' },
  { id: 'brewers-supplies', label: 'Suprimentos de Cervejeiro', group: 'artesao' },
  { id: 'carpenters-tools', label: 'Ferramentas de Carpinteiro', group: 'artesao' },
  { id: 'cooks-utensils', label: 'Utensílios de Cozinheiro', group: 'artesao' },
  { id: 'leatherworkers-tools', label: 'Ferramentas de Curtidor', group: 'artesao' },
  { id: 'masons-tools', label: 'Ferramentas de Pedreiro', group: 'artesao' },
  { id: 'painters-supplies', label: 'Suprimentos de Pintor', group: 'artesao' },
  { id: 'jewelers-tools', label: 'Ferramentas de Joalheiro', group: 'artesao' },
  { id: 'tinkers-tools', label: 'Ferramentas de Funileiro', group: 'artesao' },
  { id: 'weavers-tools', label: 'Ferramentas de Tecelão', group: 'artesao' },
  { id: 'woodcarvers-tools', label: 'Ferramentas de Entalhador', group: 'artesao' },
  { id: 'cartographers-tools', label: 'Ferramentas de Cartógrafo', group: 'artesao' },
  { id: 'cobblers-tools', label: 'Ferramentas de Sapateiro', group: 'artesao' },
  { id: 'glassblowers-tools', label: 'Ferramentas de Vidreiro', group: 'artesao' },
  { id: 'potters-tools', label: 'Ferramentas de Oleiro', group: 'artesao' },
  { id: 'calligraphers-supplies', label: 'Suprimentos de Calígrafo', group: 'artesao' },
  // instrumentos musicais
  { id: 'lute', label: 'Alaúde', group: 'instrumento' },
  { id: 'flute', label: 'Flauta', group: 'instrumento' },
  { id: 'drum', label: 'Tambor', group: 'instrumento' },
  { id: 'lyre', label: 'Lira', group: 'instrumento' },
  { id: 'horn', label: 'Berrante', group: 'instrumento' },
  { id: 'viol', label: 'Viola', group: 'instrumento' },
  { id: 'bagpipes', label: 'Gaita de Foles', group: 'instrumento' },
  { id: 'pan-flute', label: 'Flauta de Pã', group: 'instrumento' },
  { id: 'shawm', label: 'Charamela', group: 'instrumento' },
  { id: 'dulcimer', label: 'Saltério', group: 'instrumento' },
  // jogos
  { id: 'dice-set', label: 'Jogo de Dados', group: 'jogo' },
  { id: 'card-set', label: 'Baralho', group: 'jogo' },
  { id: 'dragonchess', label: 'Xadrez do Dragão', group: 'jogo' },
  { id: 'three-dragon-ante', label: 'Aposta dos Três Dragões', group: 'jogo' },
  // veículos
  { id: 'vehicles-land', label: 'Veículos (terrestres)', group: 'veiculo' },
  { id: 'vehicles-water', label: 'Veículos (aquáticos)', group: 'veiculo' },
];

export const TOOL_GROUP_LABELS: Record<ToolDef['group'], string> = {
  kit: 'Kits e ferramentas especiais',
  artesao: 'Ferramentas de artesão',
  instrumento: 'Instrumentos musicais',
  jogo: 'Jogos',
  veiculo: 'Veículos',
};

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export function toolLabel(id: string): string {
  return TOOL_BY_ID[id]?.label ?? id;
}
