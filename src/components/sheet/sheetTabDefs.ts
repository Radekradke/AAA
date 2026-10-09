import type { IconName } from '@/components/ui/Icon';

export interface SheetTabDef {
  id: string;
  label: string;
  /** Rótulo curto para a barra do celular. */
  short?: string;
  icon: IconName;
  /** Para que serve a aba (dica ao passar o mouse e no "Mais" do celular). */
  hint: string;
  /** Visível apenas para conjuradores. */
  caster?: boolean;
  /**
   * `play`: o que se consulta toda hora no jogo. `occasional`: o que se usa
   * de vez em quando (subir de nível, descansar, a carta, dados avulsos) —
   * fica depois, com menos peso.
   */
  group: 'play' | 'occasional';
}

/**
 * Abas da ficha. "Jogar" é a porta de entrada (o que se faz no turno, com
 * atalhos para o detalhe); as outras aprofundam um assunto. O id `mesa`
 * continua o mesmo (links e estado salvos).
 */
export const SHEET_TABS: SheetTabDef[] = [
  { id: 'mesa', label: 'Jogar', icon: 'banner', group: 'play', hint: 'O turno à mão: vida, inspiração, ataques, testes, magias e condições' },
  { id: 'ficha', label: 'Ficha', icon: 'crest', group: 'play', hint: 'Atributos, perícias, salvaguardas, proficiências e idiomas' },
  { id: 'combate', label: 'Combate', icon: 'swords', group: 'play', hint: 'Ataques em detalhe, economia de turno e recursos de classe' },
  { id: 'inventario', label: 'Inventário', short: 'Itens', icon: 'satchel', group: 'play', hint: 'Equipamento, mochila, baú, moedas e sintonia' },
  { id: 'magias', label: 'Magias', icon: 'spark', caster: true, group: 'play', hint: 'Espaços, magias conhecidas ou preparadas e o que cada uma faz' },
  { id: 'diario', label: 'Diário', icon: 'quill', group: 'play', hint: 'Anotações, crônica, missões, pistas e pessoas (só seu)' },
  { id: 'evoluir', label: 'Evoluir', icon: 'levelup', group: 'occasional', hint: 'Subir de nível, XP e as regras desta ficha' },
  { id: 'descanso', label: 'Descanso', icon: 'moon', group: 'occasional', hint: 'Descanso curto (dados de vida) e longo' },
  { id: 'retrato', label: 'Retrato', icon: 'image', group: 'occasional', hint: 'Arte, carta do herói, feitos e jornada' },
  { id: 'dados', label: 'Dados', icon: 'd20', group: 'occasional', hint: 'Rolar dados avulsos, fora de um teste da ficha' },
];
