import type { Subclass } from '@/types/dnd';

/**
 * Subclasses do PHB 2014 (nomes e resumos em português, sem texto oficial).
 * `features`: nível de classe → características daquela subclasse.
 */
export const SUBCLASSES: Subclass[] = [
  // Bárbaro
  { id: 'berserker', classId: 'barbarian', label: 'Caminho do Furioso', desc: 'Fúria destilada em violência pura.', features: { 3: ['Frenesi'], 6: ['Fúria Inconsciente'], 10: ['Presença Intimidadora'], 14: ['Retaliação'] } },
  { id: 'totem', classId: 'barbarian', label: 'Caminho do Guerreiro Totêmico', desc: 'Espíritos animais guiam sua fúria.', features: { 3: ['Buscador de Espíritos', 'Espírito Totêmico'], 6: ['Aspecto da Fera'], 10: ['Andarilho Espiritual'], 14: ['Sintonia Totêmica'] } },
  // Bardo
  { id: 'lore', classId: 'bard', label: 'Colégio do Conhecimento', desc: 'Segredos e verdades cortantes.', features: { 3: ['Proficiências Adicionais', 'Palavras Cortantes'], 6: ['Segredos Mágicos Adicionais'], 14: ['Habilidade Incomparável'] } },
  { id: 'valor', classId: 'bard', label: 'Colégio da Bravura', desc: 'Cantos que inspiram heróis em batalha.', features: { 3: ['Proficiências Marciais', 'Inspiração de Combate'], 6: ['Ataque Extra'], 14: ['Magia de Batalha'] } },
  // Clérigo
  { id: 'life', classId: 'cleric', label: 'Domínio da Vida', desc: 'Curandeiro supremo da fé.', features: { 1: ['Discípulo da Vida', 'Proficiência com armadura pesada'], 2: ['Canalizar: Preservar a Vida'], 6: ['Curandeiro Abençoado'], 8: ['Golpe Divino'], 17: ['Cura Suprema'] } },
  { id: 'light', classId: 'cleric', label: 'Domínio da Luz', desc: 'Chama sagrada que queima a escuridão.', features: { 1: ['Labareda Protetora', 'Truque Luz'], 2: ['Canalizar: Radiância da Alvorada'], 6: ['Labareda Aprimorada'], 8: ['Conjuração Potente'], 17: ['Coroa de Luz'] } },
  { id: 'war', classId: 'cleric', label: 'Domínio da Guerra', desc: 'Braço armado da divindade.', features: { 1: ['Sacerdote da Guerra', 'Proficiências marciais'], 2: ['Canalizar: Golpe Dirigido'], 6: ['Canalizar: Bênção do Deus da Guerra'], 8: ['Golpe Divino'], 17: ['Avatar da Batalha'] } },
  // Druida
  { id: 'land', classId: 'druid', label: 'Círculo da Terra', desc: 'Guardião de um bioma sagrado.', features: { 2: ['Truque Adicional', 'Recuperação Natural'], 3: ['Magias de Círculo'], 6: ['Passo da Terra'], 10: ['Guarda da Natureza'], 14: ['Santuário da Natureza'] } },
  { id: 'moon', classId: 'druid', label: 'Círculo da Lua', desc: 'Metamorfo de formas ferozes.', features: { 2: ['Forma Selvagem de Combate', 'Formas de Círculo'], 6: ['Golpes Primais'], 10: ['Forma Selvagem Elemental'], 14: ['Mil Formas'] } },
  // Guerreiro
  { id: 'champion', classId: 'fighter', label: 'Campeão', desc: 'Perfeição física e golpes letais.', features: { 3: ['Crítico Aprimorado (19-20)'], 7: ['Atleta Notável'], 10: ['Estilo de Luta Adicional'], 15: ['Crítico Superior (18-20)'], 18: ['Sobrevivente'] } },
  { id: 'battlemaster', classId: 'fighter', label: 'Mestre de Batalha', desc: 'Tática e manobras superiores.', features: { 3: ['Superioridade de Combate (manobras)', 'Estudioso da Guerra'], 7: ['Conhecer o Inimigo'], 10: ['Superioridade Aprimorada (d10)'], 15: ['Implacável'], 18: ['Superioridade Aprimorada (d12)'] } },
  { id: 'eldritch', classId: 'fighter', label: 'Cavaleiro Arcano', desc: 'Aço e magia entrelaçados.', features: { 3: ['Conjuração (Mago)', 'Vínculo com Arma'], 7: ['Magia de Guerra'], 10: ['Golpe Arcano'], 15: ['Investida Arcana'], 18: ['Magia de Guerra Aprimorada'] } },
  // Monge
  { id: 'openhand', classId: 'monk', label: 'Caminho da Mão Aberta', desc: 'Mestre do combate desarmado.', features: { 3: ['Técnica da Mão Aberta'], 6: ['Integridade do Corpo'], 11: ['Tranquilidade'], 17: ['Palma Trêmula'] } },
  { id: 'shadow', classId: 'monk', label: 'Caminho da Sombra', desc: 'Ninja das artes sombrias.', features: { 3: ['Artes das Sombras'], 6: ['Passo das Sombras'], 11: ['Manto de Sombras'], 17: ['Oportunista'] } },
  { id: 'elements', classId: 'monk', label: 'Caminho dos Quatro Elementos', desc: 'Ki moldado em elementos.', features: { 3: ['Discípulo dos Elementos'], 6: ['Disciplina Elemental adicional'], 11: ['Disciplina Elemental adicional'], 17: ['Disciplina Elemental adicional'] } },
  // Paladino
  { id: 'devotion', classId: 'paladin', label: 'Juramento de Devoção', desc: 'O ideal do cavaleiro sagrado.', features: { 3: ['Canalizar: Arma Sagrada', 'Canalizar: Expulsar o Profano'], 7: ['Aura de Devoção'], 15: ['Pureza de Espírito'], 20: ['Nimbo Sagrado'] } },
  { id: 'ancients', classId: 'paladin', label: 'Juramento dos Anciões', desc: 'Guardião da luz e da vida.', features: { 3: ['Canalizar: Ira da Natureza', 'Canalizar: Expulsar os Infiéis'], 7: ['Aura de Proteção (dano de magia)'], 15: ['Sentinela Imortal'], 20: ['Campeão Ancião'] } },
  { id: 'vengeance', classId: 'paladin', label: 'Juramento de Vingança', desc: 'Punição implacável aos culpados.', features: { 3: ['Canalizar: Repreender Inimigos', 'Canalizar: Voto de Inimizade'], 7: ['Vingador Implacável'], 15: ['Alma da Vingança'], 20: ['Anjo Vingador'] } },
  // Patrulheiro
  { id: 'hunter', classId: 'ranger', label: 'Caçador', desc: 'Predador de presas colossais.', features: { 3: ['Presa do Caçador'], 7: ['Táticas Defensivas'], 11: ['Ataque Múltiplo'], 15: ['Defesa Superior do Caçador'] } },
  { id: 'beastmaster', classId: 'ranger', label: 'Mestre das Feras', desc: 'Vínculo com um companheiro animal.', features: { 3: ['Companheiro de Patrulheiro'], 7: ['Treinamento Excepcional'], 11: ['Fúria Bestial'], 15: ['Compartilhar Magias'] } },
  // Ladino
  { id: 'thief', classId: 'rogue', label: 'Ladrão', desc: 'Mãos rápidas e escaladas impossíveis.', features: { 3: ['Mãos Rápidas', 'Trabalho de Segundo Andar'], 9: ['Furtividade Suprema'], 13: ['Usar Dispositivo Mágico'], 17: ['Reflexos do Ladrão'] } },
  { id: 'assassin', classId: 'rogue', label: 'Assassino', desc: 'Morte silenciosa e disfarces.', features: { 3: ['Proficiências de Assassino', 'Assassinar'], 9: ['Perícia em Infiltração'], 13: ['Impostor'], 17: ['Golpe Mortal'] } },
  { id: 'trickster', classId: 'rogue', label: 'Trapaceiro Arcano', desc: 'Ilusão e travessura mágica.', features: { 3: ['Conjuração (Mago)', 'Prestidigitação Aprimorada'], 9: ['Emboscada Mágica'], 13: ['Trapaceiro Versátil'], 17: ['Ladrão de Magias'] } },
  // Feiticeiro
  { id: 'draconic', classId: 'sorcerer', label: 'Linhagem Dracônica', desc: 'Sangue de dragão nas veias.', features: { 1: ['Resiliência Dracônica', 'Ancestral Dragão'], 6: ['Afinidade Elemental'], 14: ['Asas Dracônicas'], 18: ['Presença Dracônica'] } },
  { id: 'wild', classId: 'sorcerer', label: 'Magia Selvagem', desc: 'Caos arcano imprevisível.', features: { 1: ['Surto de Magia Selvagem', 'Marés do Caos'], 6: ['Distorcer o Destino'], 14: ['Caos Controlado'], 18: ['Bombardeio de Magia'] } },
  // Bruxo
  { id: 'archfey', classId: 'warlock', label: 'A Arquifada', desc: 'Pacto com a nobreza feérica.', features: { 1: ['Presença Feérica'], 6: ['Fuga Enevoada'], 10: ['Defesas Encantadoras'], 14: ['Delírio Sombrio'] } },
  { id: 'fiend', classId: 'warlock', label: 'O Corruptor', desc: 'Pacto com poderes infernais.', features: { 1: ['Bênção do Tinhoso'], 6: ['Sorte do Tinhoso'], 10: ['Resiliência Infernal'], 14: ['Arremesso pelo Inferno'] } },
  { id: 'oldone', classId: 'warlock', label: 'O Grande Antigo', desc: 'Sussurros de entidades insondáveis.', features: { 1: ['Mente Desperta'], 6: ['Escudo Entrópico'], 10: ['Escudo Mental'], 14: ['Criar Servo'] } },
  // Mago
  { id: 'evocation', classId: 'wizard', label: 'Escola de Evocação', desc: 'Poder destrutivo canalizado.', features: { 2: ['Estudioso de Evocação', 'Esculpir Magias'], 6: ['Truque Potente'], 10: ['Evocação Poderosa'], 14: ['Sobrecarga'] } },
  { id: 'abjuration', classId: 'wizard', label: 'Escola de Abjuração', desc: 'Barreiras e proteção arcana.', features: { 2: ['Estudioso de Abjuração', 'Barreira Arcana'], 6: ['Barreira Projetada'], 10: ['Abjuração Aprimorada'], 14: ['Resistência a Magia'] } },
  { id: 'divination', classId: 'wizard', label: 'Escola de Adivinhação', desc: 'Ver o destino antes que aconteça.', features: { 2: ['Estudioso de Adivinhação', 'Portento'], 6: ['Adivinhação Especialista'], 10: ['O Terceiro Olho'], 14: ['Portento Maior'] } },
];

export function subclassesFor(classId: string): Subclass[] {
  return SUBCLASSES.filter((s) => s.classId === classId);
}

export function getSubclass(id: string | null | undefined): Subclass | undefined {
  if (!id) return undefined;
  return SUBCLASSES.find((s) => s.id === id);
}
