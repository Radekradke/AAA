# Desempenho

Quanto o app demora para mostrar a tela num celular comum, e como medir de novo.

## Como medir

```
npm run build && npm run vitals
```

O script (`scripts/web-vitals.mjs`) sobe o `vite preview`, simula um **celular médio** do jeito do Lighthouse (tela 390×844 em 3×, CPU 4× mais lenta, 4G lenta: 150 ms de latência e 1,6 Mbit/s) e mede cada tela 3 vezes (fica a mediana):

- **frio** — primeira visita: sem cache e sem service worker.
- **quente** — app já aberto antes: o service worker serve o código do aparelho (é o caso de quem joga toda semana ou instalou o app).

Métricas (Core Web Vitals):

- **LCP**: quando aparece o maior elemento da tela. Bom: < 2,5 s.
- **FCP**: primeira pintura (a tela de abertura).
- **CLS**: quanto a tela pula enquanto carrega. Bom: < 0,1.

Os números de um computador para outro mudam um pouco; compare sempre antes e depois na mesma máquina.

## Resultado (23/11, etapa 4.3)

| Situação | Tela | LCP | FCP | CLS | Maior elemento | < 2,5 s |
|---|---|---|---|---|---|---|
| frio | Tela inicial | 2,22 s | 1,42 s | 0,001 | título "Ficha Viva" | sim |
| frio | Entrar | 2,81 s | 1,38 s | 0,001 | texto do cartão | não (ver abaixo) |
| frio | Seus heróis | 6,38 s | 1,36 s | 0 | arte do herói | não — B-013 |
| frio | Ficha | 6,04 s | 1,36 s | 0 | arte do herói | não — B-013 |
| quente | Tela inicial | 0,74 s | 0,16 s | 0 | título | sim |
| quente | Entrar | 1,23 s | 0,19 s | 0 | texto do cartão | sim |
| quente | Seus heróis | 1,00 s | 0,24 s | 0 | arte do herói | sim |
| quente | Ficha | 1,42 s | 0,18 s | 0 | arte do herói | sim |

Antes da 4.3, a tela inicial (frio) ficava em **2,76 s**.

### O que a 4.3 mudou

1. **Tema e fonte do título já saem baixando junto com o JS.** O CSS do tema só era pedido depois que o JS rodava, e a fonte do título só depois do tema. A tela de abertura (`index.html`) já sabe o tema salvo; agora ela pede os dois com `<link rel="preload">`. O build grava no HTML o nome com hash de cada arquivo (plugin `themePreload` no `vite.config.ts`; mapa em `src/lib/themePreload.ts`, conferido em `themePreload.test.ts`). Preload não muda a ordem da cascata: `themeCss.ts` continua pondo a folha no mesmo lugar.
2. **A primeira tela depois de abrir o app entra sem a animação de opacidade.** O conteúdo começava invisível e levava ~0,5 s para aparecer num celular lento: um vazio entre a abertura e o menu. A abertura já faz o papel de entrada; trocar de tela continua animado.

### O que ficou de fora, e por quê

- **Entrar (frio, 2,8 s):** o cartão sobe com uma animação de 0,4 s (design). Sem ela daria ~2,4 s. Pôr a tela no pacote de entrada não ajudou (testado: mesmo LCP, +5 KB), então ficou como estava.
- **Ficha e Seus heróis na primeira visita (B-013):** a tela só desenha depois de baixar o código dela (~600 KB: ficha, regras, magias, ícones), e a arte do herói (70–150 KB) disputa a mesma rede. A arte já é pedida cedo (`useHeroArtPreload`). Diminuir isso é um trabalho do tamanho da 4.1; candidatos em `docs/BUGS.md` › B-013.
- **Arte do herói:** 768×1024 continua. A mesma imagem aparece grande no Retrato e na carta; reduzir a do card prejudicaria essas telas.

## Pacotes e imagens

- `npm run budget` — limites do JS/CSS inicial (entrada < 300 KB; ver `bundle-budget.json`).
- Arte de magias e itens no tamanho que o app mostra (4.2): `npm run art`, ver `src/assets/magias/LEIA-ME.md`.
