import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';

/**
 * Ações de herói com retorno visível: excluir na hora com "Desfazer" (em vez
 * de pedir confirmação duas vezes) e avisar ao duplicar.
 */
export function deleteHeroWithUndo(id: string): void {
  const st = useCharacterStore.getState();
  const char = st.getCharacter(id);
  if (!char) return;
  const wasCurrent = st.currentId === id;
  st.deleteCharacter(id);
  toast(`${char.name} foi excluído.`, {
    tone: 'danger',
    action: {
      label: 'Desfazer',
      run: () => {
        useCharacterStore.getState().restoreCharacter(char);
        if (wasCurrent) useCharacterStore.getState().setCurrent(char.id);
        toast(`${char.name} está de volta.`);
      },
    },
  });
}

export function duplicateHero(id: string): void {
  const char = useCharacterStore.getState().getCharacter(id);
  if (!char) return;
  useCharacterStore.getState().duplicateCharacter(id);
  toast(`Cópia de ${char.name} criada.`);
}
