# Arte padrão dos itens

Esta pasta guarda a carta de cada item do catálogo **no tamanho que o app mostra** (560×700, ~35 KB), com o **id** como nome:
`w-longsword.webp`, `a-chain-mail.webp`, `g-backpack.webp`…

Arte nova: solte o original em `arte-original/itens/` (mesmo nome) e rode `npm run art -- itens`. O script gera a versão daqui só do que falta ou mudou (`--all` refaz tudo).

- Formato retrato **4:5**, original a partir de 560×700.
- WebP de preferência (PNG/JPG também funcionam; a saída é sempre WebP).
- A lista completa de ids, por grupo, está em `docs/ARTE-ITENS.md`.

O app usa a arte sozinho (inventário, detalhes do item, relíquias e Suas cartas). A foto que o jogador enviar para o item continua tendo prioridade.
