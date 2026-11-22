/**
 * Para quem vai um handout: `null` = todos; lista = só esses jogadores;
 * lista vazia = ninguém (ainda). Desmarcar o último jogador NUNCA vira
 * "todos" — antes virava, e uma pista secreta podia ir para a mesa inteira
 * num toque.
 */
export function toggleRecipient(cur: readonly string[] | null, uid: string): string[] {
  const base = cur ?? [];
  return base.includes(uid) ? base.filter((x) => x !== uid) : [...base, uid];
}

/** Dá para entregar? (lista vazia = ninguém escolhido) */
export const canDeliver = (to: readonly string[] | null): boolean => to === null || to.length > 0;

/** "todos", "ninguém", "Bruno", "Bruno e Carla". */
export function recipientsText(to: readonly string[] | null, nameOf: (uid: string) => string): string {
  if (to === null) return 'todos';
  const names = to.map(nameOf);
  if (!names.length) return 'ninguém';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
