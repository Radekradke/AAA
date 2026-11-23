# Arte das magias

Esta pasta guarda a carta de cada magia **no tamanho que o app mostra** (560×700, ~75 KB), com o **id** como nome:
`sp-bolafogo.webp`, `phb-guiding-bolt.webp`, `xge-toll-the-dead.webp`…

Arte nova: solte o original em `arte-original/magias/` (mesmo nome) e rode `npm run art -- magias`. O script gera a versão daqui só do que falta ou mudou (`--all` refaz tudo).

- Formato retrato **4:5**, original a partir de 560×700.
- WebP de preferência (PNG/JPG também funcionam; a saída é sempre WebP).
- A lista completa de ids, por círculo, com o prompt de cada magia, está em `docs/ARTE-MAGIAS.md`.

O app usa a arte sozinho: a carta aparece ao lado dos detalhes da magia (passar o mouse ou segurar no celular), na aba Magias, no Jogar e nas magias dos itens. A moldura segue o círculo: truque comum, 1º–2º incomum, 3º–5º raro, 6º–8º muito raro, 9º lendário.
