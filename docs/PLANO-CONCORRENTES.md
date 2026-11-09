# Plano dos concorrentes: o que a Ficha Viva já tem

Conferido no código em 09/11/2026, item por item do documento "Ficha Viva — Concorrentes e plano de melhorias".

| # | Item do plano | Situação | Onde está |
|---|---|---|---|
| 1 | Zero atrito de entrada (jogar sem conta; exportar/importar JSON) | Feito | Login → "Continuar offline"; Home mostra "Jogando offline (sem conta)". Exportar/importar JSON da ficha (`src/lib/exportCharacter.ts`, `src/lib/heroImport.ts`), que também aceita a "ficha simples" do ChatGPT. |
| 2 | Rolagem integrada (ataque e dano juntos, com modificadores) | Feito | Ataques nas abas Jogar e Combate: acerto, dano, críticos, dano extra (Furtivo, Destruição, Bruxaria, Marca) e talentos de arma (−5/+10). |
| 3 | Automação de features | Feito | Auditoria das 12 classes do 1 ao 20 (`docs/auditoria/`), com Fúria, Ataque Furtivo, Inspiração de Bardo, Forma Selvagem e o restante mexendo nos números. |
| 4 | Homebrew sem dor | Feito nesta entrega | Raças, sub-raças e itens mágicos com bônus já existiam. **Novo:** magias e talentos homebrew com editor, aviso pelo padrão do livro, automação de conjuração e bônus na ficha (TESTES-MANUAIS §86). |
| 5 | Combat log + HP + death saves numa tela | Feito | Registro de combate com contexto e exportação. Salvaguarda contra a morte em tela cheia. Aba Jogar reúne PV, ataques, magias e efeitos. |
| 6 | Compartilhar com o mestre | Feito | Código curto + QR code para entrar na mesa; link de ficha só leitura e revogável (`/f/:token`). |
| 7 | PDF com layouts, economia de tinta e prévia | Feito | Estúdio de impressão com ficha clássica ou ilustrada, fundo claro ("gasta bem menos tinta") ou escuro, e prévia na tela antes de imprimir. |
| 8 | Regras 2024 | Não feito | A ficha é 2014 (com Xanathar e Tasha). Suportar 2024 é um projeto grande: classes, espécies, antecedentes com talento de origem, maestria em armas e magias revisadas. Precisa de decisão de produto antes de começar. |

## Diferenciais citados no plano

- **PT-BR nativo:** toda a interface, as magias e as características estão em português.
- **Identidade visual:** 8 temas com claro e escuro, cartas de herói, crítico cinematográfico.
- **Offline com sync, sem limite de fichas:** funciona sem conta e sem internet (PWA); com conta, sincroniza no Supabase. Não há limite de personagens.

## Fora do plano, mas vale avaliar

- **Importar do D&D Beyond por link** (o Shard faz). Exigiria um servidor intermediário, porque o navegador não lê a API do D&D Beyond direto.
