import { useCharacterStore } from '@/store/characterStore';
import { fromSimpleSheet, isSimpleSheet } from '@/engine/simpleSheet';

export interface HeroImportResult {
  ok: boolean;
  error?: string;
  /** O que a ficha simples trouxe fora da regra (o herói é criado mesmo assim). */
  warnings?: string[];
  id?: string;
}

/**
 * Importa um herói a partir de texto: o JSON exportado de uma ficha ou a
 * "ficha simples" do guia docs/CRIAR-COM-CHATGPT.md. Aceita a resposta
 * inteira do ChatGPT (```json e frases em volta): pega o objeto do meio.
 * Fica fora do store para o conversor não pesar a primeira tela.
 */
export function importHeroText(text: string, ownerId: string): HeroImportResult {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  const { importCharacter } = useCharacterStore.getState();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Não consegui ler: confira se é o JSON da ficha (o texto entre { e }).' };
  }
  if (!isSimpleSheet(raw)) return importCharacter(json, ownerId);
  // ficha simples: monta com as regras da criação e entra como ficha completa
  const { char, warnings } = fromSimpleSheet(raw, ownerId);
  return { ...importCharacter(JSON.stringify(char), ownerId), warnings };
}
