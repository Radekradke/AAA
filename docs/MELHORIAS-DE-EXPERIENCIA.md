# Melhorias de experiência — Ficha Viva

Implementadas em 12/10/2026.

## Criação e retratos

- Uma ficha nova começa com três conceitos: proteger/resistir, usar magia ou explorar em silêncio. As sugestões usam Guerreiro, Mago e Ladino, com atributos, perícias, especializações, idiomas, equipamento e magias válidos pelo motor existente. O nome continua sendo uma escolha do jogador.
- O jogador pode revisar todas as escolhas ou iniciar diretamente pelas regras completas. Rascunhos existentes são retomados sem substituir escolhas por um conceito.
- “Duas primeiras ações” explica o uso básico da classe. No Despertar, as pendências aparecem como links para a etapa que precisa ser corrigida.
- O Palco das Origens e sua opção experimental foram removidos. A criação continua com raça, sublinhagem, classe, aparência e retrato.
- Os retratos oficiais já eram WebP. A troca anterior reutilizava a imagem sem explicar seu carregamento; retratos personalizados também prevalecem sobre classe/gênero. Agora a imagem muda com a fonte escolhida, informa carregamento/falha, recebe prioridade e antecipa os dois retratos da classe. Passar o mouse ou focar uma classe também antecipa sua arte.
- Retratos próprios são preservados. “Usar retrato da classe” volta às imagens que acompanham a aparência escolhida.

## Durante a sessão

- Equipar, vestir, arrastar para Equipado, usar a segunda mão ou alterar sintonia abre uma comparação. Ela mostra CA, ataque, dano, deslocamento, proficiência, sintonia, itens que saem e consequências para habilidades. A confirmação aplica a mesma regra usada na simulação.
- A comparação é calculada para a troca escolhida; o inventário deixou de simular todas as trocas a cada atualização da ficha.
- Descanso curto/longo tem prévia nas abas Jogar e Descanso. Mostra recursos, reservas comuns/de pacto, Dados de Vida, PV, exaustão e o que será removido. Cargas variáveis são roladas somente após confirmar. Descanso curto não gasta Dados de Vida automaticamente.
- Efeitos ativos separam concentração, duração, marcas de classe e ajustes do mestre. Os detalhes registram aplicador, duração e término; efeitos antigos sem aplicador mostram “não informado”. CA e deslocamento de ajustes do mestre podem ser somados automaticamente; outros benefícios são lembretes.
- Remover um efeito explica as consequências e oferece Desfazer. A restauração é recusada se o estado relevante da ficha mudou, preservando dano, recursos, turnos e equipamento posteriores. Minutos/horas são conferidos na sessão; não foi introduzido um relógio automático.
- Conjuração sem espaços/cargas ou durante Fúria tem um motivo visível junto do botão bloqueado.

## Busca e história

- A busca geral aceita intenções como “curar”, “reação” e “fogo sem concentração”. Os filtros interpretados aparecem na tela. A busca por nomes continua disponível.
- “Quem sou eu?” fica a um toque nas abas Jogar, Combate e Diário. Guarda objetivo atual, vínculo, medo, traço e frase de interpretação.
- ☆ no histórico guarda uma rolagem como momento memorável, com uma frase do jogador e vínculo opcional a uma sessão. A Crônica também permite registrar cenas manualmente e editar os momentos.
- Cada sessão tem um resumo editável. Ele pode ser preenchido com seus momentos; substituir um resumo existente pede confirmação. Textos legados são preservados.
- O cartão e os momentos pertencem ao diário privado: não entram no snapshot compartilhável. A sincronização reconhece um diário que contenha somente esses novos campos; a importação verifica seus tipos.

## Validação

878 testes passaram, incluindo regressões de criação, comparação, descanso, Desfazer, busca, privacidade, importação e estrutura renderizada dos componentes. O build de produção passou e a revisão de diferenças não apontou problemas de whitespace.

A revisão visual e os testes de ponta a ponta no navegador ficaram pendentes: a ferramenta de navegador bloqueou `http://127.0.0.1:5173/` por política de URL. Os testes de ponta a ponta foram adaptados ao novo início da criação e à confirmação de equipamento, mas não foram executados nesta entrega. Não foi medido o tempo dos retratos em rede lenta.

Para revisão manual: criar uma ficha por cada conceito; trocar classe/gênero; testar um retrato próprio e voltar à arte oficial; equipar/arrastar itens e alterar sintonia; conferir e cancelar descansos; remover/desfazer um efeito antes e depois de sofrer dano; salvar o cartão; marcar uma rolagem e gerar/editar o resumo da sessão. Repetir em celular e nos temas usados na mesa.
