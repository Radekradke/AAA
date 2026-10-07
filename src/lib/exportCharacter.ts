import type { Character } from '@/types/character';

/** Nome do arquivo: "Lyra Sombraluz" → "lyra-sombraluz.json" (sem acento nem símbolo). */
export function characterFileName(char: Pick<Character, 'name'>): string {
  const slug = char.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'ficha'}.json`;
}

/**
 * Baixa a ficha inteira como .json — o mesmo formato que "Importar personagem
 * (JSON)" lê de volta (backup, levar para outra conta, mandar para o mestre).
 */
export function downloadCharacterJson(char: Character): void {
  const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = characterFileName(char);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
