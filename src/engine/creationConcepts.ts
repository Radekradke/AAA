import type { Character } from '@/types/character';
import { createDraftCharacter } from './characterBuilder';
import { getClass } from '@/data/classes';
import { creationChoices } from './classChoices';
import { languagePicks, skillBudget } from './originChoices';
import { expertiseSlots } from './levelUp';
import { applySelection, defaultSelection } from './loadout';
import { suggestCreationSpells } from './creationSpells';

export const CREATION_CONCEPTS = [
  { id: 'guardian', classId: 'fighter', backgroundId: 'soldier', title: 'Quero resistir e proteger', description: 'Guerreiro com armadura, escudo e força para enfrentar o perigo.' },
  { id: 'mage', classId: 'wizard', backgroundId: 'sage', title: 'Quero usar magia', description: 'Mago com conhecimento, truques e um primeiro grimório sugerido.' },
  { id: 'explorer', classId: 'rogue', backgroundId: 'outlander', title: 'Quero explorar e agir em silêncio', description: 'Ladino ágil, com perícias para descobrir caminhos e oportunidades.' },
] as const;

/** Somente para um rascunho novo: todas as sugestões usam as regras da criação. */
export function applyCreationConcept(char: Character, id: string): void {
  const concept = CREATION_CONCEPTS.find((c) => c.id === id);
  if (!concept) return;
  const next = createDraftCharacter({ ownerId: char.ownerId, name: char.name, gender: char.gender, classId: concept.classId, backgroundId: concept.backgroundId });
  next.id = char.id;
  next.createdAt = char.createdAt;
  next.portrait = char.portrait;
  next.concept = concept.title.replace('Quero ', '');
  next.choices = {};
  for (const group of creationChoices(next)) {
    const preferred = group.options.find((o) => o.id === 'defense');
    next.choices[group.spec.storeKey] = (preferred ? [preferred, ...group.options.filter((o) => o !== preferred)] : group.options).slice(0, group.total).map((o) => o.id);
  }
  for (const skill of getClass(next.classId).skillChoices) {
    if (skillBudget(next).canPick(skill)) next.skillProfs.push(skill);
  }
  next.skillExpertise = next.skillProfs.slice(0, expertiseSlots(next));
  const langs = languagePicks(next);
  next.extraLanguages = ['Élfico', 'Anão', 'Goblin', 'Dracônico', 'Halfling', 'Orc'].filter((l) => !langs.fixed.includes(l)).slice(0, langs.total);
  suggestCreationSpells(next);
  applySelection(next, defaultSelection(next.classId, next));
  Object.assign(char, next);
}

export function firstActions(classId: string): Array<{ title: string; text: string }> {
  if (classId === 'fighter') return [
    { title: 'Atacar', text: 'Na aba Combate, escolha sua arma. Role o acerto; se atingir a CA do alvo, role o dano. Isso usa sua ação.' },
    { title: 'Retomar o Fôlego', text: 'Use a ação bônus para recuperar PV pelo painel de Guerreiro. O recurso volta no descanso curto ou longo.' },
  ];
  if (classId === 'wizard') return [
    { title: 'Conjurar um truque', text: 'Na aba Magias, escolha um truque ofensivo. Ele não gasta espaço; siga o ataque ou a salvaguarda indicada no cartão.' },
    { title: 'Conjurar uma magia preparada', text: 'Escolha uma magia preparada e um espaço disponível. Leia seu tempo de conjuração e mantenha concentração quando exigida.' },
  ];
  if (classId === 'rogue') return [
    { title: 'Atacar com oportunidade', text: 'Use uma arma de acuidade ou à distância. Ataque Furtivo exige vantagem, ou um aliado junto do alvo sem desvantagem; vale uma vez por turno.' },
    { title: 'Explorar', text: 'Na aba Perícias, role Furtividade para passar despercebido ou Investigação para buscar pistas, quando o mestre pedir.' },
  ];
  return [{ title: 'Sua ação', text: 'Abra Combate para atacar ou Magias para conjurar. Leia o custo e o alvo antes de usar.' }, { title: 'Fora de combate', text: 'Abra Perícias e escolha o teste adequado à situação, combinando a intenção com o mestre.' }];
}
