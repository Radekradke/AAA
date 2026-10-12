# Marca Ficha Viva

Monograma F dentro de um dado estilizado de RPG, em uma única cor. A geometria é a mesma na abertura, no menu, na barra e na navegação da Guilda.

- `ficha-viva.svg`: vetor transparente com `currentColor`, para incorporar inline e herdar a cor.
- `ficha-viva-{preta,dourada,branca}.svg`: vetores com cor fixa para editores e publicações.
- `ficha-viva-{preta,dourada,branca}.png`: exportações transparentes de 512 × 512.

No site, `FichaVivaMark` usa a variável `--gold`, que representa a cor de destaque da marca em cada tema. A troca de tema também recolore o favicon. Um SVG usado via `<img>` não herda a cor do elemento pai; para isso, use o componente inline ou uma máscara CSS.

Os ícones instaláveis em `public/icons` usam a versão dourada sobre fundo escuro. Ícones do sistema operacional permanecem estáticos; a recoloração acontece na interface e no favicon. O ícone maskable deixa margem para o recorte do aparelho.

Use a marca em 24 px ou mais no site. Para impressão e divulgação, preserve proporções e uma margem livre de pelo menos um quarto da largura do símbolo. O favicon simplifica a leitura em tamanhos menores, mantendo a geometria.
