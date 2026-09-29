# Artes oficiais por raça

Solte aqui a arte de cada raça/aparência. O app encontra os arquivos sozinho: não precisa mexer em código.

**Nome do arquivo:** `<raça>-<masc|fem>.webp`

| Raça | Masculina | Feminina |
| --- | --- | --- |
| Humano | `human-masc.webp` | `human-fem.webp` |
| Elfo | `elf-masc.webp` | `elf-fem.webp` |
| Anão | `dwarf-masc.webp` | `dwarf-fem.webp` |
| Halfling | `halfling-masc.webp` | `halfling-fem.webp` |
| Meio-Elfo | `half-elf-masc.webp` | `half-elf-fem.webp` |
| Meio-Orc | `half-orc-masc.webp` | `half-orc-fem.webp` |
| Gnomo | `gnome-masc.webp` | `gnome-fem.webp` |
| Tiefling | `tiefling-masc.webp` | `tiefling-fem.webp` |
| Draconato | `dragonborn-masc.webp` | `dragonborn-fem.webp` |

- **Sub-raça (opcional, tem prioridade):** `elf-drow-fem.webp`, `dwarf-hill-dwarf-masc.webp`, `elf-wood-elf-masc.webp`… O id da sub-raça fica em `src/data/races.ts`.
- **Formatos:** `.webp` (recomendado), `.png` ou `.jpg`.
- **Tamanho:** 1024×1280 (4:5), com fundo transparente ou já recortado, e até ~200 KB.
- **Fundo branco:** retire o fundo antes de salvar aqui, com qualquer removedor de fundo. O recorte automático só acontece quando o jogador envia a própria arte pelo botão **Sua arte**.
- **Sem arquivo:** a raça usa a arte padrão (`public/assets/heroi-recorte.webp` / `heroi-fem-recorte.webp`).
- **Prompt para gerar no mesmo estilo:** `docs/ARTE-PERSONAGENS.md`.
