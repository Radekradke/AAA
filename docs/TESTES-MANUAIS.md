# Ficha Viva AAA — Cenários de Teste Manual

Base de regras: **D&D 5e 2014 (PHB)** + talentos raciais de **Xanathar's Guide**.
Testes automatizados da engine: `npm test` (29 casos em
`src/engine/__tests__/rules.test.ts`). Os cenários abaixo cobrem o fluxo
completo na interface.

## 1. Personagem nível 1
1. Crie um Guerreiro Humano pelo fluxo de criação.
2. Na aba **Ficha**: FOR 16 (15 base +1 humano), PV máx 12 (10 do d10 + 2 CON),
   Proficiência +2, CA 18 (Cota de Malha 16 + Escudo 2).
3. Passe o mouse (ou toque) em CA/Iniciativa/Desloc./Perc. Passiva no cabeçalho:
   o tooltip deve listar **cada origem** do valor.

## 2. Subir para o nível 2 (aba Evoluir)
1. Abra **Evoluir** → "Subir para o Nível 2".
2. Escolha PV por **Média (6)** → ganho total 6 + CON.
3. Confirme. Verifique: nível 2, PV máx +8 (guerreiro CON +2), Dados de Vida 2/2,
   característica "Surto de Ação" na linha do tempo.

## 3. Nível 3 — subclasse obrigatória
1. Evolua para o nível 3 SEM escolher subclasse → o botão fica bloqueado e o
   erro "Escolha a subclasse deste nível" aparece.
2. Escolha **Campeão** → confirma. A linha do tempo registra a subclasse.

## 4. Nível 4 — ASI ou talento
1. Evolua para o nível 4. A seção "Aumento de Atributo ou Talento" aparece.
2. Teste **+2 em um atributo**: atributos que passariam de 20 ficam bloqueados.
3. Teste **+1 em dois atributos** e **Talento** (com talentos ligados na campanha).
4. Confirme com +2 FOR → modificador, ataques e CA recalculam na hora.

## 5. CON altera PV retroativamente
1. No nível 4, escolha ASI **+2 CON**.
2. PV máximo deve subir **+1 por nível já ganho** (mod 2→3 · 4 níveis = +4).
3. Tooltip do PV máximo (aba Mesa/Combate) mostra "Constituição ×N níveis".

## 6. Talento com efeito mecânico
- **Durão**: +2 PV/nível — aparece no cálculo do PV com origem "talento".
- **Alerta**: +5 iniciativa — tooltip da Iniciativa mostra a origem.
- **Móbil**: +3 m — tooltip do Deslocamento mostra a origem.

## 7. Deslocamento rastreável
1. Crie um **Elfo da Floresta**: Desloc. 10,5 m.
2. Tooltip: `+9 m Elfo (raça)` e `+1,5 m Pés Ligeiros — Elfo da Floresta (sub-raça)`.
3. Humano padrão: 9 m com **uma única origem** (sem bônus inventado).

## 8. Item mágico +1
1. No Inventário, adicione **Machado de Batalha +1** e equipe.
2. Ataque +6 (3 FOR + 2 prof + 1 mágico) e dano +4; tooltips de acerto/dano
   listam o item como origem do +1.

## 9. Armadura e CA
1. Equipe **Meia-Armadura** num Ladino DES 16: CA 17 (15 + DES lim. a +2);
   tooltip mostra a nota "armadura média limita DES a +2".
2. Troque para **Couro Batido**: CA 15 (12 + 3).

## 10. Conjurador
1. Crie um Mago: CD de magia 13 (8 + 2 + 3 INT), ataque mágico +5.
2. Tooltips de CD/ataque na aba Mesa mostram as três parcelas.

## 11. Descansos
- **Curto**: restaura recursos de recarga curta (Surto de Ação, Fôlego, Ki…).
- **Longo**: PV no máximo, metade dos Dados de Vida, condições limpas,
  espaços de magia e todos os recursos restaurados.

## 12. Modo Mesa
1. Abra a aba **Mesa** (padrão ao abrir a ficha).
2. Confira: nome/raça/classe/subclasse/nível, PV gigante com barra, CA,
   iniciativa (rolável), deslocamento, proficiência, percepção passiva,
   inspiração, salvaguardas, perícias treinadas, ataques, CD/ataque mágico,
   espaços de magia, recursos, dados de vida, condições e anotações.
3. Botões: −5/−1/+1/+5, +5 Temp/Zerar, Usar/repor recurso, descansos,
   gastar dado de vida, rolar iniciativa/ataque/dano/perícia/salvaguarda.

## 13. Teste contra a morte
1. Reduza o PV a 0 → painel vermelho "CAINDO" aparece na Mesa.
2. **Rolar teste**: ≥10 marca sucesso, <10 falha, 1 natural = 2 falhas,
   20 natural = volta com 1 PV (pinos zeram ao curar).

## 14. Condições
- Marque **Envenenado** na Mesa/Descanso → chip acende em vermelho.
- Descanso longo limpa todas as condições.

## 15. Migração de personagens antigos
1. Personagens salvos antes desta versão abrem normalmente.
2. A linha do tempo aparece com registros "migrado (média)" e o PV máximo
   bate com a fórmula da média usada até então.

## 16. Homebrew
- Itens criados/editados na Forja exibem o selo **HOMEBREW** no inventário
  e aparecem como origem "homebrew" nos cálculos de CA/ataque.

## 17. Modais (desktop e mobile)
1. Abra Forja, Adicionar item, Moedas, Preparar magias, Editar herói e
   Perícias. Nenhum modal pode vazar da tela.
2. Conteúdo grande rola **dentro** do modal; o cabeçalho com ✕ fica fixo.
3. No celular, o modal vira folha inferior (bottom sheet) com altura segura.

## 18. Modal de moedas
1. Inventário → Moedas → **Gerenciar**: os 5 tipos (PL/PO/PE/PP/PC) com
   entrada direta, −10/−1/+1/+10 e **total aproximado em po** no rodapé.
2. Nada vaza no PC nem no celular.

## 19. Modal de perícias + expertise
1. Ficha → **Ver todas as 18 perícias** (ou Mesa → "Ver todas →").
2. Grade compacta com nome, atributo, bônus total, Proficiente/Expertise.
3. Num Ladino, marque ★ em 2 perícias proficientes (vagas 2/2 no nível 1);
   o bônus dobra a proficiência e a Percepção Passiva acompanha.

## 20. Ferramentas de Ladrão e ferramentas em geral
1. Crie um Ladino: **Ferramentas de Ladrão** aparecem em Ficha →
   Proficiências (origem: Ladino).
2. Botão **Expertise** na ferramenta dobra a proficiência (consome vaga).
3. Adicione outra ferramenta pelo select (kits, artesão, instrumentos,
   jogos, veículos) e remova com ✕.

## 21. Antecedente completo (PHB 2014)
1. Crie um personagem **Criminoso**: além de Enganação/Furtividade, ganha
   Ferramentas de Ladrão + um jogo, e o equipamento inicial entra na mochila.
2. **Acólito**: 2 idiomas à escolha (registre em Ficha → Idiomas), itens de
   templo na mochila e 15 po.
3. Perícia repetida entre classe e antecedente aparece **bloqueada** na
   etapa de perícias — escolha outra (regra 5e).

## 22. Arma +1/+2/+3 estruturada e escolhas livres do Meio-Elfo
1. Forje/edite uma arma e escolha **Bônus mágico +2**.
2. Ataque e dano sobem +2 com a origem "Mágica +2" no tooltip.
3. Meio-Elfo na criação: 2 **escolhas livres** de perícia além das da classe.

## 23. Talentos com fonte e pré-requisito
1. Evoluir → nível de ASI → **Talento**: lista separada em "Livro do
   Jogador 2014" e "Xanathar's (raciais)".
2. Talentos com pré-requisito não atendido ficam bloqueados com o motivo
   no tooltip (ex.: Duelista Defensivo sem DES 13; Fúria Orc sem ser Meio-Orc).

## 24. Mesa: atributos, condições e turno
1. A Mesa mostra os 6 atributos com modificador (roláveis) e sem anotações.
2. Condições: use o **select** para ativar; só as ativas aparecem, com
   resumo e ✕ para remover. Descanso longo limpa todas.
3. Ação / Bônus / Reação marcam-se com ✓ riscado; "Novo turno" restaura
   junto com o movimento.

## 25. Console do mestre (precisa de `supabase/mestre_console.sql`)
Use duas contas: o **mestre** num navegador e um **jogador** em outro (ou janela anônima).
1. Mestre abre a mesa → **Jogar**: aparecem Bastidores (esquerda), Palco (centro) e Inspetor (direita); sem sessão, Bastidores → Sessão mostra **Começar agora** e **Preparar para depois**.
2. **Preparar para depois** com o nome "A traição de Roland": a sessão aparece em "Em preparação". No jogador, a mesa **não** mostra esse nome.
3. Com a sessão preparada selecionada, marque ☆ em um NPC, uma cena e uma criatura: eles aparecem na **Bandeja da sessão**. Recarregue a página: a bandeja continua.
4. **Começar** a sessão preparada: o jogador vê a sessão ao vivo; a bandeja do mestre continua igual.
5. Barra de improviso → **+ NPC** (Alt+N), nome "Ferreiro Maluco": aparece em NPCs com a marca "improviso". Na sala da mesa ele fica em "Improvisados nas sessões"; **Guardar na campanha** tira a marca.
6. **+ Criatura**: "Lobo", PV 11, Qtd 3, Oculta. Sem encontro aberto, abre um "Encontro improvisado". O jogador **não** vê os lobos ocultos.
7. Toque num lobo na faixa de iniciativa → Inspetor → **−5**: aparece "5 de dano em Lobo… Desfazer"; Desfazer devolve o PV. Faça o mesmo com **Ocultar** e **Remover**.
8. **+ Pista** com destinatário só para um jogador: chega só nele. **+ Item** para um herói: o item entra na mochila da ficha do jogador (uma vez só, mesmo recarregando).
9. **+ Nota** "Varek vai trair na ponte": aparece em Notas. No jogador, o Diário/Notas da mesa **não** mostram essa nota (nem pela rede: a consulta não devolve).
10. Celular (390 px): ☰ Bastidores e ◧ Inspetor abrem gavetas com **Fechar**; tocar em alguém na iniciativa abre o Inspetor; o mapa continua no centro.
11. **Arrastar para o mapa (mouse):** com um mapa aberto no palco, arraste um NPC (Bastidores → NPCs), uma criatura (Criaturas), um combatente (Encontro ou a faixa de iniciativa) ou um chip de "Pôr no mapa" para uma casa: o peão nasce ali (se já estava no mapa, só muda de casa). A criatura também entra no encontro — sem encontro aberto, abre um "Encontro improvisado".
12. **Mapa em branco:** Cenas → "Mapa em branco" → Pequeno/Médio/Grande → "Criar e ver" (ou "Criar e pôr no ar"): abre um tabuleiro neutro só com a grade.
13. **Tela baixa** (notebook ou zoom do navegador, ~550 px de altura): as ferramentas do mapa quebram em duas colunas e o zoom fica numa linha, sem sair da área do mapa.

## 26. Agenda da campanha (precisa de `supabase/agenda.sql`)
Use duas contas: o **mestre** num navegador e um **jogador** em outro (ou janela anônima).
1. Mestre abre a sala da mesa → card **Próxima sessão** → **Marcar próxima sessão**. O formulário sugere o próximo sábado às 19h; troque o dia, preencha título e lugar → **Marcar sessão**.
2. No jogador (sem recarregar), o card mostra a data, "em N dias", título e lugar. Toque em **Vou**: o botão acende e "Seu nome · Seu herói" aparece na lista; no mestre, a lista atualiza sozinha.
3. Troque para **Talvez**: a resposta muda (não duplica).
4. Tela inicial do jogador: aparece o item "Próxima sessão em N dias" com o nome da mesa e "você vai"/"talvez"/"confirme"; tocar leva à sala.
5. **Adicionar ao calendário** baixa um `.ics` que abre no calendário do celular com lembrete 2 h antes; **Google Agenda** abre o evento já preenchido.
6. Mestre → **+ Marcar outra**: a sugestão é uma semana depois da última, na mesma hora. A segunda aparece em "mais adiante".
7. Mestre → **Cancelar sessão** → confirmar: o jogador vê a próxima da lista (ou "O mestre ainda não marcou"); a cancelada fica riscada com "Cancelada" e o mestre pode **Reativar** ou **Apagar**.

## 27. Bestiário da mesa (personalizar precisa de `supabase/bestiario.sql`)
1. Mestre abre a sala da mesa: aparece **Bestiário da mesa · 65** com 12 cartas (selo de ND e moldura na cor do tipo) e **Mostrar todas as 65 criaturas**.
2. Filtre por **Dragão** e por **ND 8+**; busque "goblin". Toque na carta: abre a ficha completa ao lado da arte.
3. **Personalizar** → envie uma foto, mude o nome para "Batedor Garra-Negra" e escreva uma nota → **Salvar**. A carta mostra a foto, o novo nome e o selo **da mesa**; a nota aparece em "Suas notas".
4. Na mesa ao vivo, ponha o goblin no encontro: entra como "Batedor Garra-Negra", com a foto na faixa de iniciativa e no peão do mapa. O jogador (outra conta) vê a foto e o nome, **não** a nota.
5. **Personalizar** → **Restaurar padrão**: volta ao Goblin com o emblema.
6. Solte um arquivo `src/assets/bestiario/goblin.webp` (veja `docs/ARTE-BESTIARIO.md`) e rode o app: o goblin passa a usar essa arte em todas as mesas.

## 28. Criar personagem com o ChatGPT (`docs/CRIAR-COM-CHATGPT.md`)
1. No ChatGPT, crie um Projeto e cole o guia inteiro nas instruções. Peça: "Crie uma clériga anã nível 3, protetora da família".
2. Copie a resposta inteira (com o texto em volta) → app → **Heróis** → **Colar ficha (ChatGPT)** → cole → **Importar herói**. Abre a ficha pronta: raça, classe, subclasse, perícias, idiomas, magias, equipamento inicial e PV cheio.
3. A aparência e a história aparecem nas **Notas** da ficha.
4. Troque a raça no JSON para "Hobbit" e importe de novo: aparece **Herói importado** com a lista de ajustes ("Raça "Hobbit" não encontrada — usei Humano") e **Abrir a ficha**.
5. Cole um texto qualquer: aparece "Não consegui ler…" e a janela não fecha. Com texto digitado, clicar fora também não fecha.
6. **Importar personagem (JSON)** com um arquivo da ficha simples também funciona e avisa os ajustes num toast.
7. Tema **Guilda Rubra**: o botão **Colar ficha (ChatGPT)** aparece ao lado de **Importar personagem (JSON)**.

## 29. Aba Retrato (vitrine do herói)
1. Abra uma ficha → aba **Retrato** (no celular: **Mais → Retrato**). A carta do herói aparece grande, com selo de nível, sigilo da classe, cantos dourados e a luz da raça; ao lado (embaixo, no celular), nome, conceito, atributos, números, perícias (★ = especialização), características, equipamento, magias, idiomas e história.
2. No PC, passe o mouse na carta: ela inclina, o reflexo metálico (na cor do metal do nível) segue o ponteiro; parada, um lampejo atravessa a carta de tempos em tempos. Com "reduzir movimento" no sistema, a carta fica parada.
3. Toque na arte: abre só a arte em tela cheia. Fecha no ✕, no Esc ou tocando em qualquer lugar.
4. Troque de tema (Eclipse e Forja Dourada no modo claro): o número do nível e os cantos da carta continuam dourados e legíveis.

## 30. Forja: vestível e parte do corpo
1. Inventário → **+ Outros** (ou Forjar → categoria Outros / Item Mágico): aparece **Como se usa** com **Só carregar**, **Vestível** e **Parte do corpo**.
2. Forje "Olho Demoníaco" como **Parte do corpo**, com **CD de magia 1** e resistência a **fogo**. O card aparece em **Equipado** com o selo **Corpo**, sem botão de Baú, e o peso não entra na carga. Na aba Magias a CD sobe 1; em Ficha/Retrato aparece a resistência a fogo.
3. Tente arrastar o olho para o Baú: o app avisa que faz parte do corpo.
4. Forje "Amuleto" como **Vestível** com **CA extra 1**. Ele já começa **Vestido** (CA +1). **Tirar** leva para a mochila e a CA volta; **Vestir** devolve.
5. Vestível com **Exige sintonia**: só vale vestido **e** sintonizado.
6. Um item com **Magia concedida** + Parte do corpo: a magia aparece na aba Magias (antes, item novo perdia a magia ao salvar).

## 31. Carta do herói: moldura, feitos e cicatrizes
1. Aba **Retrato** de heróis nível 2, 6, 12 e 18: moldura **Bronze**, **Prata** (filete duplo), **Ouro** (brilho dourado, cantos maiores) e **Lendária** (aro de ouro claro girando). O selo de nível mostra o nome da moldura; o reflexo acompanha o metal: bronze, prateado, dourado e ouro claro na lendária (sem arco-íris).
2. Role ataques na ficha até sair um **20 natural**: aparece "Feito conquistado: Primeiro crítico!" e o selo surge na carta (coluna à direita) e em **Feitos**. Um **1 natural** dá "Tropeço histórico" (selo lilás).
3. Leve o herói a 0 PV e cure: "Voltou do abismo".
4. Mesa ao vivo (mestre): jogador rola dano → no feed, **aplicar ▸ Goblin**. Se o goblin cair, o golpe final vai para o jogador que rolou (feito "Primeira vitória" na ficha dele). Derrube uma criatura pelo PV direto: aparece **"Goblin caiu! Golpe final de:"** com os heróis — escolha um. Dragão conta "Matador de dragões".
5. Mestre → toque no herói → **Cicatriz na carta** → "Garra do dragão no ombro" → **Gravar**. Na ficha do jogador, a cicatriz aparece em **Cicatrizes** com data, sessão e "pelo mestre", e a carta ganha uma marca de garra. O jogador também grava as próprias (e só apaga as dele).

## 32. Crítico cinematográfico
1. Role ataques/testes de d20 na ficha. Num **20 natural**: tela cheia com a arte do herói, raios dourados, "20" gigante, "Crítico!" e o nome. Num **1 natural**: "Tropeço!" com a arte desbotada caindo e uma frase de humor sorteada. Toque, Esc ou ~3 s fecham.
2. Rolagem de dano não dispara (só o d20).
3. Mesa ao vivo com dois jogadores (rolagens públicas): o 20/1 de um aparece na tela do outro e do mestre, com a arte do herói de quem rolou. Rolagens "só eu" não aparecem para ninguém.
4. **Configurações → Crítico cinematográfico** desliga (vale para este aparelho).
5. Com "reduzir movimento" no sistema, a tela aparece parada (sem raios girando), mas aparece.

## 33. Companheiros e montarias com carta
1. Aba **Retrato** → **Companheiros → Adicionar**: escolha **Montaria**, nome "Trovão", base **Cavalo de Guerra** (a linha mostra CA 11 · 19 PV · 18 m) → **Adicionar**. A ficha da montaria abre com a carta (mesmo reflexo prateado, inclinação e moldura da carta do herói), o emblema de fera e o selo **ND 1/2**.
2. O formulário **Novo companheiro** (e **Editar**) já tem **Retrato (opcional)**: envie a arte ali e a carta nasce com ela. **Sua arte** na ficha da montaria: a carta e a mini-carta da lista passam a usar a imagem.
3. PV com **−/+**, testes de atributo e ataque (**+6** / **2d6+4**) rolam e entram no histórico da ficha. Um **20 natural** da montaria **não** abre o crítico cinematográfico nem conta como feito do herói.
4. **Familiar** com base **Livre**: CA, PV máx. e deslocamento à mão; as anotações aparecem na ficha. **Editar** reabre com os valores; **Dispensar** pede confirmação.
5. Patrulheiro **Mestre das Feras** nível 3+: o companheiro da classe já aparece primeiro na lista (CA e ataques com a proficiência somada), com retrato próprio; nome e fera continuam no painel de Combate.
6. Celular: a carta fica em cima e a ficha embaixo; os atributos em 3 colunas.

## 34. Forja: magia concedida com busca
1. Inventário → **+ Outros** → **Magia concedida**: digite "raio" — aparece a lista filtrada (círculo, nome e escola), legível em qualquer tema claro ou escuro.
2. Busca sem acento e por várias palavras ("bola fogo"), e pelo círculo ("3 bola", "truque luz").
3. Setas ↑/↓ andam pela lista (ela rola junto), **Enter** escolhe, **Esc** fecha só a lista (a forja continua aberta). O ✕ tira a magia.
4. Os demais seletores do app (Recarga, raças, feras…) mostram a lista com o fundo e o texto do tema — nada de texto escuro sobre fundo escuro.

## 35. Carta: raridade, feitos secretos, títulos, relíquias e jornada
1. Aba **Retrato → Feitos**: cada selo tem a raridade escrita e a cor dela — **Comum** (bronze), **Raro** (azul), **Épico** (roxo) e **Lendário** (dourado com aro girando). Na carta, os mais raros aparecem primeiro.
2. Os 5 **feitos secretos** aparecem como **???** com "Feito secreto" até serem conquistados:
   - **Por um fio**: tome dano e fique com exatamente 1 PV.
   - **Fúria dos dados**: 3 vinte naturais no mesmo dia.
   - **Recusou a morte**: 20 natural no **Teste contra a Morte** (aba Mesa).
   - **Truque mortal** (mesa ao vivo): role o dano de um truque e o mestre aplica com **aplicar ▸** derrubando a criatura.
   - **Davi contra Golias** (mesa ao vivo): golpe final numa criatura de ND maior que o nível do herói.
3. **Título** (alcunha do personagem, não conquista de jogador): em **Retrato → Título** aparecem os liberados (ex.: "Coração de Dragão", "o Imperador da Loucura"/"a Imperatriz da Loucura", "Koschei, o Imortal"/"Baba Yaga") na forma do gênero da ficha, com a frase de lenda do escolhido. **Por conquistar** lista o resto com o caminho (secretos como **???**). Ao liberar um título por feito, aparece o aviso "Novo título". O escolhido aparece sob o nome na carta, no cabeçalho da ficha, no painel do herói do mestre e na iniciativa. **Sem título** remove.
4. **Carta do item**: no inventário, o botão de imagem na miniatura do card envia a arte (ou use **Editar → Carta do item**). Passe o mouse no card (ou segure no celular): os detalhes aparecem com a carta ao lado; o brilho acompanha a raridade: prateado, dourado nas muito raras e ouro claro nas lendárias.
5. **Relíquias** (aba Retrato): só os itens **com foto** viram carta (sem foto, não aparece nada — nem no inventário, onde fica só o botãozinho de enviar arte).
6. **Jornada**: linha do tempo com o começo, as subidas de nível (com a data), os feitos, as cicatrizes e as sessões jogadas na mesa ao vivo (entram sozinhas ao abrir uma sessão ativa como jogador). Mais de 10 marcos: **Ver desde o começo**.

## 36. Retrato → Suas cartas
1. Na aba **Retrato**, o submenu **Retrato | Suas cartas** (com o número de cartas). **Suas cartas** mostra a coleção: a carta do herói (cor da moldura do nível), companheiros/montarias **com retrato** e itens **com foto** (cor da raridade). A borda de cada carta é de metal polido pelo nível — bronze, prata, ouro ou lendária — com o reflexo do mesmo metal.
2. Filtros **Todas / Herói / Companheiros / Itens** (só aparecem os que têm carta).
3. Tocar numa carta abre em tela cheia, com inclinação e reflexo; **‹ ›** ou as setas do teclado passam para as outras; Esc, ✕ ou tocar fora fecham.
4. Só a carta do herói? Aparece a dica de como ganhar mais cartas (foto no item ou no companheiro).

## 37. Bestiário de caçadas
1. Na mesa ao vivo, o mestre derruba uma criatura do bestiário (ex.: Goblin) e dá o golpe final a um herói. Na ficha desse herói aparece o aviso **"Nova carta de caçada: Goblin!"**.
2. **Retrato → Suas cartas → Caçadas**: uma carta por criatura abatida, com a arte oficial (ou o emblema do tipo), o número de abates e o ND. A moldura sobe com os abates: bronze (1 e 3), prata (5), ouro (10, reflexo dourado) e lendária (25, **Nêmesis**).
3. Tocar na carta abre a tela cheia com **o que o herói sabe**: barra até o próximo nível e blocos destravados por abates — **Básico** (1), **Defesa: CA e PV** (3), **Pontos fracos: resistências, imunidades, vulnerabilidades e sentidos** (5), **Como luta: ataques, salvaguardas e características** (10) e **Ficha inteira** (25). Os trancados mostram 🔒 com quantos abates faltam.
4. Cada nível novo avisa: "Caçada — Goblin: Presa conhecida! Agora você conhece CA e pontos de vida."
5. Na mesa, como jogador: inimigos que o seu herói já caçou mostram **📖 ×N** na iniciativa (e a **CA**, a partir de 3 abates, no PC). Tocar abre o mesmo painel. Criaturas nunca abatidas continuam só com "ferido/sangrando".
6. **Busca geral (Ctrl+K)**: a ficha completa das criaturas só aparece para quem é **mestre** (de alguma mesa da conta ou da sessão aberta). Para o jogador, a criatura mostra a arte e o painel do bestiário de caçadas — "Criatura ainda não caçada" (tudo com cadeado) ou o que os heróis dele já aprenderam (ex.: "ND 1/4 · Humanoide · 10 abates").

## 38. Dados conquistados
1. Aba **Retrato → Dados**: "Do tema" mais os dados que o herói já ganhou (ex.: **Bordão do Errante** no nível 5, **Escamas de Dragão** ao dar o golpe final num dragão). **Dados por conquistar** mostra os outros trancados, com a raridade e como liberar.
2. Escolha um: as rolagens da ficha passam a usar esse dado — no 3D (textura própria: escamas, crânios, gelo, vitral, madeira, tigre, água…) e no dado 2D. Rolagens do companheiro/montaria continuam com o dado do tema.
3. Na mesa ao vivo, o aviso de rolagem que os outros veem mostra o dado do herói no canto.
4. Se o herói perder a condição (ex.: ficha voltou de nível), o dado volta ao do tema sozinho.
5. Texturas novas não entram na instalação do app (PWA): só baixam quando alguém rola com o dado.

## 39. Teste contra a morte para a mesa toda
1. Com o herói a 0 PV, na aba **Mesa** aparece "CAINDO — Testes contra a Morte". **Rolar teste** abre o momento em tela cheia: a arte do herói, o número natural, o monitor cardíaco atravessando a tela e os contadores (verdes = sucessos, vermelhos = falhas).
2. O batimento (vinheta, arte e traçado) acelera a cada falha: calmo com 0, mais rápido com 1, disparado com 2. Com os efeitos sonoros ligados, toca o coração no mesmo ritmo.
3. Desfechos: **Resiste…** (10+), **Escorrega…** (abaixo de 10), **A morte se aproxima** (1 natural, duas falhas), **Estabilizado** (3 sucessos, verde), **De volta!** (20 natural, levanta com 1 PV, verde — sem o "Crítico!" comum por cima) e **Tombou.** (3 falhas: arte em preto e branco e linha reta com o apito).
4. Na mesa ao vivo, os outros jogadores e o mestre veem o mesmo momento (com o nome do herói e os contadores de quem rolou).
5. Toque, Esc ou o tempo (~4 s) fecham. Desligar **Crítico cinematográfico** em Configurações desliga este momento também.

## 40. Ícones das regras (game-icons.net) e sons da Kenney
1. **Condições com ícone**: na aba **Mesa** (cartões das condições ativas), em **Descanso** (botões de todas as condições), na iniciativa da mesa (chips da criatura e botões do mestre), no inspetor do console e nos **peões do mapa** (antes eram só duas letras; agora o desenho de cada condição: veneno, venda nos olhos, correntes…).
2. **Escolas de magia com ícone**: nas magias da ficha (Abjuração = escudo mágico, Evocação = raio de fogo, Necromancia = caveira…) e nos filtros/cartões da biblioteca de magias.
3. **Sons gravados** (Configurações → **Efeitos sonoros** ligado): moedas ao mexer nas moedas, lâmina ao rolar ataque, página ao conjurar com espaço de magia, cinto ao equipar, mochila ao ganhar item (inclusive o que o mestre entrega), tecido no descanso. Desligado, nada toca (nem baixa).
4. Créditos em **Apoie o projeto**: game-icons.net (CC BY 3.0), Kenney (CC0) e texturas dos dados (MIT).
