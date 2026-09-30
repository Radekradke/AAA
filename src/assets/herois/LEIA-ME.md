# Retratos oficiais por classe

> **Arte pesada demais para o GitHub?** Abra o app em **⋯ → Oficina de retratos** (`/retratos`),
> solte as imagens originais e baixe o `.zip`: sai tudo em WebP 768×1024 (~100–300 KB) com o nome
> certo e o `rostos.json` (ponto do rosto de cada retrato). Depois é só subir os arquivos desta pasta
> pelo site do GitHub (**Add file → Upload files**).

O retrato do herói muda conforme a **classe** e a **aparência** (masculina/feminina) escolhidas. Solte o arquivo nesta pasta e o app encontra sozinho, sem mexer em código.

**Nome do arquivo:** pode ser em português, do jeito natural, ou no padrão do código.

| Classe | Masculino | Feminino | Situação |
| --- | --- | --- | --- |
| Bárbaro | `Bárbaro masculino` ou `barbarian-masc` | `Bárbara feminina` ou `barbarian-fem` | ✔ |
| Bardo | `Bardo masculino` ou `bard-masc` | `Barda feminina` ou `bard-fem` | ✔ |
| Clérigo | `Clérigo masculino` ou `cleric-masc` | `Clériga feminina` ou `cleric-fem` | ✔ |
| Druida | `Druida masculino` ou `druid-masc` | `Druida feminina` ou `druid-fem` | ✔ |
| Guerreiro | `Guerreiro masculino` ou `fighter-masc` | `Guerreira feminina` ou `fighter-fem` | ✔ |
| Monge | `Monge masculino` | `Monja feminina` | falta |
| Paladino | `Paladino masculino` | `Paladina feminina` | falta |
| Patrulheiro | `Patrulheiro masculino` | `Patrulheira feminina` | falta |
| Ladino | `Ladino masculino` | `Ladina feminina` | falta |
| Feiticeiro | `Feiticeiro masculino` | `Feiticeira feminina` | falta |
| Bruxo | `Bruxo masculino` | `Bruxa feminina` | falta |
| Mago | `Mago masculino` | `Maga feminina` | falta |

- **Formatos:** `.webp` (recomendado), `.png` ou `.jpg`. Retrato **3:4**, idealmente 768×1024 e até ~150 KB. O fundo cinza-escuro liso das artes atuais combina com o app e não precisa recortar.
- **Sem arquivo:** a classe usa a arte padrão (`public/assets/heroi-recorte.webp` / `heroi-fem-recorte.webp`).
- **Enquadramento:** o avatar redondo da ficha mira o rosto. Os pontos de cada retrato ficam em `rostos.json` (nesta pasta); retrato novo sem ponto usa um padrão (rosto um pouco à esquerda, no terço de cima).
- **Foto do jogador** (botão **Sua arte**) sempre tem prioridade.
- **Prompt para gerar no mesmo estilo:** `docs/ARTE-PERSONAGENS.md`.
