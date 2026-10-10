import type { ItemTag } from '@/engine/itemTags';

/** Texto de um item do catálogo: o que ele é e para que serve na mesa. */
export interface ItemDescription {
  /** Descrição imersiva (2–3 frases), escrita para o app — não copiada dos livros. */
  desc: string;
  /** Uma linha prática: para que serve, em termos de jogo. */
  use: string;
  /** Etiquetas escritas à mão (as automáticas saem dos dados do item). */
  tags?: ItemTag[];
  /**
   * Itens mágicos: a nota do catálogo já traz a regra exata (CD, cargas,
   * recarga) e `use` é uma dica que a complementa. Nos outros, `use`
   * substitui a nota.
   */
  complementsNote?: boolean;
}
