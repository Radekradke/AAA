# Tokens do design system

Arquivo: `src/styles/tokens.css`. Teste: `src/styles/__tests__/tokens.test.ts`.

Os tokens são os nomes que componentes novos e telas migradas (etapa 3) usam. A paleta de cada tema continua em `src/styles/themes/*.css`, com as variáveis cruas `--bg`, `--panel`, `--ink`, `--acc`, `--gold`. Os tokens de cor apontam para elas, então trocar de tema ou de modo claro/escuro muda tudo junto.

## Regras
- **Cor:** sempre pelo papel (`--color-*`), nunca `#hex` nem a variável crua. A cor fixa no meio de um componente quebra os 8 temas e o modo claro.
- **Espaço, texto, canto e movimento:** sempre pela escala. Um valor fora da escala precisa de motivo escrito no código.
- **`style={{…}}`:** só para valor que muda em tempo de execução (largura de uma barra de PV, posição no mapa). Visual fixo vai para CSS com tokens.

## Cor por papel
| Token | Para quê | Vem de |
|---|---|---|
| `--color-bg` | fundo da página | `--bg` |
| `--color-surface` / `--color-surface-2` | cartões e painéis / painel dentro de painel | `--panel` / `--panel2` |
| `--color-sunken` | campos, poços, chips afundados | `--well` |
| `--color-text` / `--color-text-muted` | texto principal / de apoio | `--ink` / `--muted` |
| `--color-border` / `--color-border-strong` | fios e contornos | `--line` / `--line-strong` |
| `--color-accent` / `--color-accent-2` | o que é vivo e clicável | `--acc` / `--acc2` |
| `--color-on-accent` | texto sobre a cor de ação | `--on-acc` (ou o fundo) |
| `--color-metal` / `--color-metal-strong` | seleção, ornamento, botão principal | `--gold` / `--goldB` |
| `--color-on-metal` | texto sobre o metal | `--on-gold` (ou o fundo) |
| `--color-danger` | dano, apagar, erro | `--danger` |
| `--shadow-1` / `--shadow-2` | sombra leve / de painel | `--shadow-soft` / `--shadow-panel` |
| `--focus-ring` | contorno de foco do teclado | fundo + ação |

**Contraste conferido no teste, nos 8 temas × claro/escuro:**
- texto principal e de apoio sobre fundo e superfícies: pelo menos 4,5:1;
- texto sobre os botões de ação e de metal: pelo menos 4,5:1;
- ação, metal e perigo sobre superfície: pelo menos 3:1.

## Escalas
| Escala | Tokens |
|---|---|
| Espaço (4 px) | `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48 · `-8` 64 |
| Texto (7) | `--text-2xs` 11 · `-xs` 12 · `-sm` 13 · `-md` 14 · `-lg` 16 · `-xl` 20 · `-2xl` 28 |
| Entrelinha | `--leading-tight` 1,2 · `--leading-normal` 1,45 |
| Canto | `--radius-sm` · `-md` · `-lg` (cada tema define os seus) · `--radius-pill` 999 |
| Movimento | `--dur-press` 90 ms · `--dur-fast` 160 ms · `--dur` 240 ms · `--dur-slow` 450 ms · `--ease-out` · `--ease-in-out` · `--ease-spring` (durações zeradas com "reduzir movimento") |
| Camadas | `--z-sticky` 20 · `--z-popover` 60 · `--z-modal` 100 · `--z-toast` 200 |

## Migração dos tamanhos de texto (etapa 3)
Hoje há 32 tamanhos. Na migração, cada valor vai para o token mais próximo:

| Hoje | Token |
|---|---|
| 7,5–11,5 | `--text-2xs` (11) |
| 12–12,5 | `--text-xs` (12) |
| 13–13,5 | `--text-sm` (13) |
| 14–15 | `--text-md` (14) |
| 16–18 | `--text-lg` (16) |
| 20–22 | `--text-xl` (20) |
| 24 ou mais | `--text-2xl` (28) ou título do tema (`--font-display`) |

## Primitivos (etapa 2.2)
Componentes em `src/components/ui/`, estilos em `src/styles/ui.css` (só tokens). Testes em `src/components/ui/__tests__/primitives.test.ts`.

| Componente | Arquivo | O que garante |
|---|---|---|
| `Button` | `Button.tsx` | `variant` gold/ghost/accent/danger, `size` sm/md/lg, `loading` (desliga e marca `aria-busy`), `icon`/`iconEnd`, `block`. `type="button"` por padrão |
| `IconButton` | `Button.tsx` | `label` obrigatório (nome acessível e dica), alvo de 44 px no md, `pressed` vira `aria-pressed` |
| `Field` + `Input`/`Select`/`Textarea` | `Field.tsx` | rótulo ligado ao controle, `hint` e `error` em `aria-describedby`, erro com `aria-invalid` e `role="alert"` |
| `Segmented` | `Choice.tsx` | grupo de rádio (2–5 opções): Tab entra uma vez, setas trocam, pula as desligadas |
| `Chip` | `Choice.tsx` | liga/desliga com `aria-pressed`; sem `onClick` vira etiqueta |
| `Badge` | `Choice.tsx` | selo por tom: neutral/accent/metal/danger/ok |
| `Tabs` | `Choice.tsx` | tablist/tab/tabpanel ligados por id, setas e Home/End, só a aba ativa no Tab |
| `Panel` | `Panel.tsx` | painel de sempre (fica como está até a etapa 3) |

Foco de teclado: todos os primitivos usam `--focus-ring` no `:focus-visible`.
