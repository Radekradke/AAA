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
8. **Exportar em JSON**: na ficha, o botão de corrente (**Compartilhar a ficha**) agora tem três opções: **Por link**, **Em PDF** e **Em arquivo (JSON)**. A terceira baixa `nome-do-heroi.json` (sem acento) com a ficha inteira, fecha a janela e avisa "Ficha salva em …". Importar esse arquivo em **Importar personagem (JSON)**, em outra conta, cria uma cópia igual (nível, cicatrizes, título, inventário). O menu **⋯ → Exportar ficha (JSON)** continua lá e faz o mesmo.

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
   - São **111 títulos**: golpes finais (1 a 250), dragões, gigantes, mortos-vivos, demônios, sorte e azar, quedas e voltas, **caçadas** (ex.: "Flagelo dos Goblins" com 10 goblinoides, "Pele de Lobo", "Queima-Trolls", "Corta-Cabeças", "Fim de Linhagem" ao chegar a Nêmesis), espécies caçadas, cicatrizes, sessões, companheiros, **bolsa** ("Bolsa Pesada" com 1.000 PO, "o Pé-Rapado" secreto com nível 5+ e bolsa vazia), itens raros e sintonizados, talentos, multiclasse, **alcunha de povo** no nível 8 (só da raça do herói) e o **ápice da classe** no nível 20.
   - **Como conquistou**: passe o mouse num título liberado e o balão mostra a lenda e o que o herói fez (ex.: "Deu 25 golpes finais — já são 34."). A mesma linha aparece embaixo da lenda do escolhido e numa **placa sob a carta** (fora dela), com o título e o feito. No cabeçalho da ficha, na iniciativa e no painel do mestre, o título também mostra isso ao passar o mouse.
   - **Por conquistar** mostra o progresso dos títulos de contagem (ex.: **34/50**) e põe primeiro os que estão mais perto de sair.
4. **Carta do item**: no inventário, o botão de imagem na miniatura do card envia a arte (ou use **Editar → Carta do item**). Passe o mouse no card (ou segure no celular): os detalhes aparecem com a carta ao lado; o brilho acompanha a raridade: prateado, dourado nas muito raras e ouro claro nas lendárias.
5. **Relíquias** (aba Retrato): viram carta os itens **com foto sua** e os itens **acima de comum** que têm arte padrão. Mochila, corda, rações e outros itens comuns mostram a arte padrão só na miniatura do inventário — não enchem a coleção.
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

## 41. Celular e app instalado (jogador)
1. Abra a ficha num celular (ou no DevTools com 360 px de largura). Em todas as abas, o cabeçalho é compacto: retrato pequeno, nome, raça/classe numa linha e nível com botões **−/+** grandes. CA, Inic., Desl., Perc. e Prof. cabem lado a lado, sem cortar nas bordas.
2. Role a ficha: a barra do topo ganha fundo e uma linha embaixo; o conteúdo não passa mais "por trás" dos botões. Volte ao topo: ela fica transparente de novo.
3. **Heróis**: "Novo personagem" vira uma faixa curta e seus heróis aparecem logo na primeira tela.
4. Botões pequenos (estrela de favoritar, ✕ de idioma/ferramenta, alavanca de arrastar item, interruptores) aceitam toque com folga, sem precisar acertar o pixel.
5. **Mesa ao vivo (jogador, celular)**: a ordem é **rodada/iniciativa → Seu herói → mapa → pistas e crônica**. O card **Seu herói** mostra os **PV** (barra verde → dourada → vermelha) e a **CA**, e **Abrir ficha** é um botão.
6. Com a sessão aberta, a tela do celular não apaga sozinha. **Configurações → Dados → Tela acesa na mesa ao vivo** liga/desliga (em navegadores sem suporte, a dica avisa).
7. **App instalado** (Android/Chrome): a tela de instalação mostra 3 imagens do app. Segurando o ícone aparecem os atalhos **Continuar** (abre a última ficha), **Heróis**, **Mesas** e **Nova ficha**. No app instalado, puxar a tela para baixo não recarrega a página.

## 42. Responsividade: do celular pequeno ao monitor largo
Teste no DevTools (modo dispositivo) ou girando o celular. O teste automático `e2e/responsividade.e2e.ts` cobre 320×568, 667×375, 844×390, 768×1024 e 2560×1080.
1. **Celular pequeno (320 px)**: a barra do topo cabe sem encavalar no logo (o modo de rolagem mostra só o ícone); no cabeçalho ficam os botões de nível e some a barrinha 1–20; na aba **Magias**, "Preparar" e "Conjurar" descem para a linha de baixo do nome — nada sai da tela.
2. **Celular deitado (667×375 / 844×390)**: o cabeçalho vira uma faixa fina (retrato, nome, nível e CA/Inic./Desl./Perc./Prof. na mesma linha), as abas ficam numa linha só que rola de lado e a barra de baixo fica baixinha com ícone + nome lado a lado. A ficha aparece já na primeira tela (antes, cabeçalho + abas ocupavam tudo). Na criação, o título encolhe e as escolhas ganham a altura; **Avançar** sempre visível. Na mesa ao vivo, "Seu turno!" e a iniciativa vêm primeiro.
3. **Tablet em pé (768 px)**: CA/Iniciativa/… ganham uma faixa própria embaixo do nome (o nome não quebra mais em duas linhas).
4. **Monitor largo (1920 px ou mais)**: a ficha fica mais larga (até 1440 px, e 1680 px em telas de 2200+), e a aba Mesa passa a usar 4 colunas em vez de uma faixa estreita no meio.
5. Em qualquer tamanho, os rótulos pequenos (CA, Iniciativa, FOR, INSPIRAÇÃO, Acerto/Dano, "save DES") ficam com pelo menos 10 px.

## 43. Inventário: anéis, amuletos, capas e mãos
Regras do D&D 5e 2014 (Livro do Jogador e Guia do Mestre, "Vestindo e empunhando itens").
1. **Vestir**: anéis, amuletos/periaptos, capas, mantos, botas, luvas/manoplas, braçadeiras, tiaras/chapéus, cintos, óculos e pedras Ioun mostram **Vestir** (e **Tirar** depois). Vestido, o card mostra o selo **Vestido** e a parte do corpo (Anel, Capa, Pés…), e o item vai para **Equipado**.
2. **Limites**: até **2 anéis**; **1** capa, 1 veste (Manto do Arquimago), 1 par de botas, 1 par de luvas/manoplas, 1 par de braçadeiras, 1 peça de cabeça e 1 cinto. Amuletos, óculos e pedras Ioun não têm limite na regra (o mestre decide). Antes de vestir, o card já avisa "Já está usando 2 anéis (…) — tire um antes"; tentar mesmo assim não veste e explica o motivo.
3. **Sintonia (máx. 3)**: item que pede sintonia só funciona **vestido E sintonizado**. Vestir sem sintonia avisa "só funciona sintonizado". Sintonizar um anel/capa guardado já veste junto, se houver encaixe livre; se não houver, a Sintonia mostra "sintonizado · vista para valer". Com 3 sintonias, tentar a quarta avisa o máximo.
4. **Não acumula**: dois itens iguais (ex.: dois Anéis de Proteção) dão o bônus uma vez só.
5. **Mãos**: arma de **duas mãos** tira o escudo (e vice-versa), com aviso do que foi para a mochila. Duas armas **leves** (ex.: espada curta + adaga): a segunda vai para a **mão secundária** — o ataque dela aparece como "mão secundária · ação bônus" e sem o atributo no dano (com o **Estilo de Luta com Duas Armas**, o atributo volta). O talento **Combatente com Duas Armas** libera armas não leves e dá **+1 de CA** com uma arma em cada mão. Tirar a arma principal passa a secundária para a principal.
6. **Varinhas**: a Varinha de Mísseis Mágicos e a de Detecção de Magia (sem sintonia) liberam as magias com o herói (Mochila); no Baú, não. Itens maravilhosos novos chegam na Mochila (não mais no Baú).
7. Fichas antigas: anel/amuleto que já estava sintonizado continua valendo (conta como vestido) — nada some da CA ao atualizar.

## 44. Manto do Arquimago, Cinto Anão e Pedras Ioun nas contas
1. **Manto do Arquimago** (vestido e sintonizado), sem armadura: a CA vira **15 + DES** ("ver cálculo" mostra o manto como CA base). Com escudo, o escudo soma; com armadura, o manto não vale. Não acumula com Armadura Arcana nem com Defesa sem Armadura — fica a melhor (o Monge com SAB alta pode continuar com a própria). O +2 no ataque e na CD de magia segue valendo.
2. **Cinto Anão**: **+2 CON até no máximo 20** — CON 16 vira 18, 19 vira 20 e 20 fica 20. Salvaguarda de CON e PV acompanham.
3. **Pedras Ioun** de Fortitude, Discernimento, Intelecto, Liderança, Força e Agilidade: **+2** no atributo, até 20. Um item que fixa o atributo (ex.: Amuleto da Saúde, CON 19) ganha se der mais.
4. A prévia "Ao vestir" já mostra a mudança de CA/atributo antes de vestir. Itens que já estavam na mochila antes desta versão passam a valer sozinhos.

## 45. Arte dos itens na busca
1. **Busca geral** (Ctrl+K ou a lupa): itens com arte mostram uma miniatura da carta no lugar do ícone na lista. Abrindo o item, a carta aparece **ao lado das informações** (no celular, em cima), com a moldura da raridade.
2. **Adicionar item** (inventário): cada item com arte mostra a miniatura na linha; passar o mouse (ou segurar no celular) abre os detalhes com a carta ao lado.
3. Itens sem arte continuam como antes (ícone, sem moldura vazia).

## 46. Brilho das cartas só no hover
1. Em repouso, as cartas (herói, aliados, caçadas, coleção, relíquias e itens na busca) ficam **limpas**: sem faixa clara parada, só o filete fino da moldura.
2. Passando o mouse: um **lampejo** atravessa a carta uma vez, de cima/esquerda para baixo/direita, de forma contínua (sem tranco). Ouro e lendária passam um pouco mais rápido.
3. **Todas** as cartas com brilho (herói, aliados, coleção, caçadas, relíquias e itens na busca) **inclinam em 3D** para o cursor e sobem um pouco; a luz e as raias de metal escovado deslizam junto. Tirar o mouse volta a carta macia ao lugar e apaga o brilho. No celular não inclina (o dedo cobre a carta).
4. Com "reduzir movimento" no sistema, o brilho aparece no hover sem o lampejo animado.

## 47. Magias, kits e equipamento conferidos com os livros
**Cargas (cajados e varinhas)**
1. Aba **Magias → Cajados e varinhas**: cada item mostra as cargas (bolinhas + "7/10 cargas") e cada magia com o seu custo. Cajado do Fogo: Mãos Flamejantes 1, Bola de Fogo 3, Muralha de Fogo 4 — as 10 cargas são compartilhadas.
2. Cajado da Cura: Curar Ferimentos escolhe o círculo (1 carga por círculo, até o 4º). Varinhas de Bolas de Fogo/Relâmpagos/Mísseis: cada carga extra sobe um círculo. Varinhas mostram **CD 15** fixa; cajados usam a sua CD.
3. **Descanso longo** recupera as cargas rolando os dados do item (1d6+4 nos cajados, 1d6+1 nas varinhas, 2d8+4 no Cajado do Poder) e mostra quanto voltou. Ao gastar a **última carga**, o app rola o d20: no 1 avisa que o item se perde (com botão para remover da ficha).
4. No **Inventário**, o cartão de itens com cargas (inclusive Anel da Evasão, Gema da Visão, Varinha da Paralisia) mostra as cargas com −1/+1.

**Cajados**
5. Foco arcano (cajado), foco druídico (cajado de madeira) e cajados mágicos **equipam como bordão** (1d6, versátil 1d8). Cajado do Poder: +2 no ataque e no dano. Cajado do Gelo agora tem Muralha de Gelo; Cajado do Poder tem as 9 magias (20 cargas).

**Sintonia por classe**
6. Itens "requer sintonia por…" recusam com o motivo: Cajado da Cura (bardo, clérigo, druida), Cajados do Fogo/Gelo (druida, feiticeiro, bruxo, mago), Cajado do Poder e Manto do Arquimago (feiticeiro, bruxo, mago), Bastão do Pacto (bruxo), varinhas de combate (qualquer conjurador), Vingadora Sagrada (paladino).

**Kits iniciais do Livro do Jogador**
7. Equipamento da criação mostra o **kit do PHB** da classe; "Personalizar kit" traz as opções (a)/(b) do livro, com escolha de arma quando diz "qualquer arma…". Pacotes chegam **abertos** (10 tochas, 10 rações, corda…). Arco e besta vêm com munição. Mago: grimório + bolsa de componentes ou foco; Ladino: 2 adagas + ferramentas de ladrão; Clérigo/Paladino: símbolo sagrado; Druida: foco druídico; Bardo: instrumento. Martelo de guerra/cota de malha do Clérigo ficam liberados na criação (o domínio é escolhido depois) com o aviso "se o domínio permitir"; com um domínio sem a proficiência (Conhecimento…), ficam bloqueados. (Não vem mais a poção de cura — não está no livro.)
8. Equipamento do **antecedente** vira item do catálogo (pé de cabra, roupas, kit de herbalismo…), empilhando com o que já veio no pacote.
8a. A tela mostra o que vem **do antecedente** e a bolsa de ouro dele. A ficha começa só com o ouro do antecedente (Soldado 10 po, Acólito 15 po…) — não há mais 25 po extras.
8b. **Trocar o kit por ouro (regra do livro)**: mostra a fórmula da classe (Guerreiro 5d4 × 10 po, Mago 4d4 × 10, Monge 5d4…), "Rolar" ou "Usar a média". A ficha nasce sem o kit da classe e com esse ouro + o do antecedente. "Voltar ao kit" restaura a escolha anterior.
8c. Duas armas leves iguais (Patrulheiro: 2 espadas curtas) já vêm uma em cada mão; "Também leva" não repete as que estão equipadas. Bruxo/Feiticeiro escolhem "arma simples" e o padrão é o bordão (não a maça). Armas sem proficiência aparecem marcadas "— sem proficiência" na lista.
8d. Armadura pesada sem a FOR pedida mostra o aviso de −3 m; a linha **Carga** mostra o peso do kit contra a capacidade.

**Componentes**
9. Conjurar magia com componente **M** sem foco nem bolsa de componentes (fora do Baú) mostra aviso. Material com preço (diamante de 300 po…) sempre aparece como lembrete no aviso da conjuração.

**Dados corrigidos**
10. Raio Ardente 36 m; Cordão de Flechas 1,5 m; Despertar 8 horas; Raio do Enfraquecimento sem dano (metade do dano com armas de FOR); Criar ou Destruir Água sem salvaguarda; materiais com custo em Augúrio, Encontrar o Caminho, Aprisionamento, invocações do Tasha e outras. Anel de Resistência sem sintonia; Pedra da Sorte soma +1 em perícias/iniciativa/passiva; Machado do Berserker +1 PV por nível; dano "gelo" passa a "frio" (resistências batem).

## 48. Escolhas do 1º nível dentro da criação
1. **Caminho → Clérigo, Feiticeiro ou Bruxo**: aparece "Domínio Divino / Origem de Feitiçaria / Patrono Transcendental · escolha do 1º nível" sob as classes. Sem escolher, o painel da classe avisa e o rodapé diz "Falta aqui: …"; o Despertar fica travado.
2. **Escolhas da classe e da subclasse** no mesmo lugar: Estilo de Luta (Guerreiro), Inimigo Favorito + Terreno (Patrulheiro — Dragões, Gigantes, Corruptores… pedem também o idioma), 3 instrumentos (Bardo), ferramenta ou instrumento (Monge), Ancestral Dragão (Feiticeiro Dracônico), 2 idiomas + 2 perícias (Conhecimento), truque de druida + perícia (Natureza).
3. **Origem → Anão**: escolha da ferramenta (ferreiro, cervejeiro ou pedreiro) sob a sublinhagem.
4. Trocar de classe limpa a subclasse e as escolhas antigas; trocar de domínio limpa as do domínio anterior. Domínio sem armadura pesada (Conhecimento, Luz, Enganação) tira a cota de malha do kit se ela estava escolhida.
5. Ao despertar, ferramentas e instrumentos viram proficiência, o truque da Natureza entra nas magias (sem repetir na sugestão), o Feiticeiro Dracônico fala Dracônico — e a aba **Evoluir** não mostra "Escolhas pendentes" para um herói recém-criado.

## 49. Etapa "Magias" na criação
1. Bardo, Clérigo, Druida, Feiticeiro, Bruxo e Mago ganham o capítulo **Magias** entre Perícias e Equipamento; os demais não veem a etapa (a numeração dos capítulos se ajusta).
2. A etapa chega com a sugestão clássica da classe, já no limite certo: Bardo 2 truques + 4 conhecidas; Feiticeiro 4 + 2; Bruxo 2 + 2 (com a lista do patrono); Clérigo/Druida 3/2 truques + preparadas = mod. + 1; Mago 3 truques, 6 no grimório e prepara INT + 1 delas.
3. Magias de domínio e o truque do Acólito da Natureza aparecem em "Já vêm prontas" e não ocupam vaga.
4. Tirar um truque/magia trava o Despertar e o rodapé diz "Falta aqui: escolha 1 truque". Preparar a mais diz "Tire 1…". "Usar a sugestão" volta ao padrão. Trocar de classe zera as magias.
5. O que foi escolhido é exatamente o que aparece na aba Magias da ficha.

## 50. Capítulo "Dons" (escolhas do 1º nível)
1. Logo depois do **Caminho**, o capítulo **Dons** reúne as escolhas do 1º nível: subclasse de Clérigo/Feiticeiro/Bruxo, Estilo de Luta, Inimigo Favorito + Terreno (+ idioma), instrumentos do Bardo, ferramenta do Monge, Ancestral Dragão, Bênçãos do Conhecimento, Acólito da Natureza, ferramenta do Anão e truque do Alto Elfo. Quem não tem nada a decidir (ex.: Bárbaro humano) não vê o capítulo. Origem e Caminho voltaram a ter só raça/sublinhagem e classe — o Caminho lista em "Na ficha" os Dons que vêm a seguir.
2. **Trilha no topo**: uma parada por decisão, com número, ✓ e o que foi escolhido (ou "1 de 3"). Escolher a subclasse acrescenta na trilha as decisões dela (Conhecimento → idiomas e perícias). Ao completar uma decisão, a trilha avança sozinha para a próxima que falta.
3. **Cartões** com ícone ou arte: instrumentos e ferramentas com a arte do item, inimigos favoritos com criaturas, dragões na cor do ancestral, truques com o ícone da escola.
4. **Painel "O que entra na ficha"**: passar o mouse mostra sem escolher. Subclasse mostra as características do 1º nível explicadas, magias de domínio/lista do patrono, proficiências e o que vem depois; idiomas mostram quem fala; truques mostram tempo, alcance, duração e dano; ferramentas e estilos explicam o efeito. Botão "Escolher X" / "Trocar por X" / "Tirar da escolha".
5. **Celular**: tocar no cartão abre uma gaveta de baixo com o painel; a escolha é no botão da gaveta (✕ ou toque fora fecha).
6. Notebook (altura ≤ 860 px): cartões deitados em 2 colunas, arte no lugar do ícone.
7. Perícias escolhidas nos Dons aparecem em "Já treinadas" no capítulo Perícias (fonte "Dons") e não podem ser escolhidas de novo.

## 51. Dica de item (estilo BG3) e miniaturas na busca
1. Passar o mouse num item (inventário, catálogo "Adicionar item", e agora no capítulo **Equipamento** da criação: kit, opções (a)/(b) de um item só, pacotes, "Também leva" e itens do antecedente) mostra a dica: nome na cor da raridade, "Comum · Arma marcial corpo a corpo", o número em destaque (1d8 cortante, CA 16, 2d4+2 de cura), propriedades (Versátil (1d10 com as duas mãos), Exige FOR 13, Desvantagem em Furtividade, sintonia, cargas), uma frase curta e, no rodapé, peso e preço. Com arte, a carta do item aparece ao lado. No celular: segurar o dedo no nome.
2. **Busca (Ctrl+K)**: heróis com o retrato redondo, criaturas com a arte do bestiário, itens com a arte, magias com o ícone da escola e condições com o ícone da condição.

## 52. Dons explicados e auditoria da criação (Origem, Caminho)
1. **Dons**: cada opção diz o que faz. Ferramentas e instrumentos mostram para que servem, o atributo usado e exemplos; idiomas mostram quem fala e a escrita; inimigos favoritos, exemplos de criaturas e o idioma; terrenos, lugares e benefícios. Opções em grupos (Monge: **Ferramentas de artesão × Instrumentos musicais**; idiomas **padrão × exóticos**) ganham abas. Os cartões têm só ícone; a arte do item aparece grande no painel da direita.
2. **Origem**: o painel lista os traços da raça e da sublinhagem. No PC são chips: passar o mouse mostra o que cada um faz. No celular a lista vem completa. Anão: ferramentas e Especialização em Rochas; Anão da Montanha: armaduras leves e médias; elfos, halflings e gnomos com os traços da sublinhagem. Drow não repete Visão no Escuro; Draconato não repete "Sopro".
3. **Caminho**: o painel mostra vida, salvaguardas, **armaduras**, **armas** e as perícias da classe (com a lista). O druida aparece com "nada de metal". Sob a grade, "**<Classe> no 1º nível**" traz cartões com cada característica e o que ela faz.
4. **Trocar de classe**:
   - Clicar de novo na classe já escolhida não apaga nada.
   - Trocar de classe só refaz os atributos se ainda estiverem no array padrão.
   - A Especialização do Ladino não passa para outra classe.

## 53. Auditoria da criação: Passado, Atributos, Perícias, Magias e Despertar
1. **Passado**: estes antecedentes deixam escolher o tipo de ferramenta (PHB), num seletor sob a grade que diz para que ela serve:
   - Herói do Povo e Artesão de Guilda: ferramenta de artesão;
   - Artista e Forasteiro: instrumento;
   - Criminoso, Nobre e Soldado: jogo.

   O painel e os itens mostram a escolha. Ao despertar, ela vira proficiência e item na mochila (o Soldado leva o jogo escolhido). Trocar de antecedente zera a escolha; trocar de classe não. A história e a característica do antecedente aparecem inteiras.
2. **Atributos**:
   - Novo método **Rolar 4d6**: seis rolagens, o menor dado riscado. Os valores vão para os atributos na ordem da classe e podem ser trocados entre si. "Rolar de novo" refaz tudo.
   - O método fica salvo: voltar à etapa depois da compra de pontos continua na compra de pontos.
   - Gastar mais de 27 pontos, ou escolher "Rolar" sem rolar, trava o Despertar.
3. **Perícias**:
   - Ladino sem as 2 especializações não desperta (o rodapé diz quantas faltam).
   - Desmarcar uma perícia tira a ★ dela.
   - Trocar o antecedente depois de especializar numa perícia dele avisa "Especialização em X sem a perícia — troque".
4. **Magias**: Taumaturgia (Tiefling), Globos de Luz (Drow), Ilusão Menor (Gnomo da Floresta) e o truque do Alto Elfo aparecem em "Já vêm prontas" e não aparecem na lista de truques da classe.
5. **Despertar**: "A lenda até aqui" mostra subclasse, Dons, perícias e ferramentas (★ = Especialização), idiomas e magias, como vão entrar na ficha.

## 54. Auditoria das abas da ficha
1. **Mesa / Combate**:
   - "Ação Atacar: 2 ataques · Ataque Extra" sobre os ataques: Guerreiro 5 (3 no 11º, 4 no 20º); Bárbaro, Monge, Paladino e Patrulheiro 5; Bardo da Bravura 6; Bruxo com Lâmina Sedenta.
   - As armas do Campeão mostram o selo "crítico 19–20".
2. **Ficha**:
   - No PC, Perícias e Características de Classe ficam na coluna da esquerda e Proficiências na da direita, sem o vão de antes.
   - Toda característica de classe (1–20, com ou sem subclasse) mostra o que faz ao passar o mouse, inclusive "Magias de Domínio (+2)…" e "Característica de Arquétipo".
   - Ladino tem **Gíria de Ladrão** e Druida tem **Druídico** em Idiomas.
3. **Magias**:
   - O cartão do truque mostra o dano do nível atual: Chama Sagrada 2d8 no 5º; Rajada Mística "2× 1d10".
   - A seção das magias raciais chama "Magias de raça, itens e talentos".
4. **Descanso / Dados de Vida**:
   - Gastar um Dado de Vida (Mesa, Combate ou a nova linha "Dados de Vida" da aba Descanso) rola d + CON e **soma a vida sozinho**.
   - O botão fica desativado com a vida cheia ou sem dados.
5. **Conferidos sem erro**: vida, CA, CD e ataque de magia, espaços (inclusive meio-conjurador e Pacto), preparadas/conhecidas, Inventário (carga = FOR × 7,5 kg), Evoluir (pendências de invocação e pacto, PV médio, XP), Retrato, Diário e Dados.

## 55. Diário de Campanha — fase 1 (Rabiscos, Crônica, Anotar)
O Diário é **pessoal** (só o jogador vê) e fica salvo **na ficha**: funciona offline e sincroniza com o resto.

1. **Seções**: Rabiscos · Crônica · Quadro da Guilda (§56) · Pistas (§57) · Pessoas (§58). A busca no topo vale para a seção aberta, e o diário lembra a última seção usada.
2. **Rabiscos**:
   - Escreva e dê **Enter**: vira um post-it. Shift+Enter quebra a linha.
   - Cores: ouro, perigo, aliado, ideia, mistério.
   - ☆ fixa no topo; ✓ marca como resolvida (some da lista, "Mostrar N resolvidas" traz de volta); ◐ troca a cor; clicar no texto edita.
   - As antigas "Anotações rápidas" viraram um rabisco fixado.
3. **Menções** (rabiscos, crônica e botão Anotar):
   - **@** abre a lista de NPCs revelados e **heróis dos outros jogadores** das mesmas campanhas.
   - **#** marca um lugar ("#Porto Sombrio", "#Torre de Vigia"); os lugares já usados viram sugestão.
   - No texto, a menção vira chip; passar o mouse (ou tocar) mostra retrato e papel. Herói tem cor própria.
4. **Crônica**:
   - "+ Nova sessão" já vem com o próximo número e a data de hoje. Cada sessão é uma página com título e **texto livre**, com modos **Escrever / Ler**.
   - Ao lado, "Nesta sessão" lista quem apareceu e por onde o grupo passou.
   - Os cartões da lista mostram trecho, citados e lugares.
   - As sessões antigas (campos Resumo/NPCs/Lugares…) abrem com tudo junto num texto só.
5. **✎ Anotar** em todas as abas da ficha:
   - Abre um bilhete; Enter salva nos Rabiscos (aviso "Anotado nos Rabiscos do Diário").
   - No celular fica acima da barra de abas, só com o ícone.
6. A ficha impressa mostra os rabiscos em aberto (fixados primeiro) em "Notas".

## 56. Diário — fase 2: Quadro da Guilda (missões)
Seção nova do Diário, entre Crônica e Pistas da mesa. É pessoal (só o jogador vê). O número na aba conta as missões **Ativas**.

1. **Colunas**: Rumores (ouvimos falar) · Ativas (estamos nessa) · Concluídas · Falhas, cada uma com sua cor e contador.
   - No PC aparecem as quatro lado a lado.
   - No celular aparece uma coluna por vez, escolhida no seletor de cima (com a contagem de cada uma); a tela não rola para o lado.
2. **Nova missão**:
   - O "+" em Rumores ou Ativas (no celular, em qualquer coluna) cria a missão nessa coluna e já abre o detalhe.
   - Missão sem nome aparece como "Missão sem nome".
3. **Cartão** (cartaz pregado com alfinete):
   - Mostra nome, "pedida por …", 💰 recompensa, ⏳ prazo e barra de objetivos ("1/3").
   - Missão **Urgente** ganha borda vermelha e o selo "Urgente". Dentro da coluna, as urgentes vêm primeiro.
   - Em Concluídas e Falhas o nome aparece riscado.
4. **Mudar de coluna**:
   - Arraste o cartão para outra coluna (no PC a coluna de destino acende).
   - Ou use ◀ ▶ no rodapé do cartão (funciona no toque).
5. **Detalhe** (modal padrão: Esc e ✕ fecham, clique fora não perde nada):
   - situação (Rumor/Ativa/Feita/Falhou);
   - nome, **Quem pediu** (com @ para NPC/herói), recompensa, prazo, prioridade (Urgente/Normal/Quando der);
   - **Objetivos**: Enter adiciona, caixinha marca ✓, ✕ tira; @ e # funcionam;
   - **Anotações** com @ e #, em modo ler/editar;
   - "Apagar missão" pede confirmação.
6. **Busca**: a busca do diário filtra os cartões por nome, quem pediu, recompensa, anotações e objetivos.
7. **Lugares**: lugares marcados com # nas missões entram nas sugestões de # do diário inteiro.
8. Tudo fica salvo na ficha: recarregue a página e confira.

## 57. Diário — fase 3: Pistas (imagem, verificação, entregas do mestre)
A seção **Pistas** aparece sempre (antes só existia quando o mestre tinha entregado algo). O número na aba conta as pistas **a verificar**. Tudo é pessoal e salvo na ficha.

1. **Filtro**: Todas · A verificar · Confirmadas · Falsas, cada um com contagem. A busca do diário também filtra (nome, texto, fonte e conclusão).
2. **Cartão** (ficha de evidência):
   - foto emoldurada quando tem imagem;
   - carimbo inclinado com a situação (amarelo / verde / vermelho);
   - trecho do texto, a fonte e a missão ligada (⚑).
   - As a verificar vêm primeiro. Pista falsa fica com o nome riscado.
3. **+ Nova pista** abre o detalhe:
   - nome e situação (A verificar / Confirmada / Falsa);
   - "O que diz / o que vimos" e "Quem contou / onde achamos", ambos com @ e #;
   - **Missão ligada**, escolhida entre as do Quadro da Guilda;
   - a conclusão só aparece quando a pista é confirmada ("Como confirmamos?") ou falsa ("Por que é falsa?").
4. **Imagem**:
   - "Anexar imagem" (arquivo) ou **Ctrl+V** com uma imagem copiada, com o detalhe aberto;
   - a imagem é reduzida e comprimida (WebP, até ~180 KB) e fica **dentro da ficha**: aparece offline e depois de recarregar;
   - "Trocar imagem" / "Tirar imagem"; clicar na imagem amplia (clique de novo fecha);
   - limite de **30 pistas com imagem** por ficha (aviso em vermelho ao passar disso).
5. **Entregues pelo mestre** (quando há handouts nas mesas desta ficha):
   - clicar abre a entrega como antes;
   - **Investigar** cria uma pista com o título e o texto da entrega e a fonte "Entregue pelo mestre". A imagem continua vindo do armazenamento da mesa e não conta no limite;
   - depois disso o botão vira "✓ nas pistas" e abre a pista.
6. **Quadro da Guilda**: o detalhe da missão mostra as **Pistas ligadas**, com a situação de cada uma.
7. No celular:
   - o detalhe empilha imagem e campos;
   - a barra de seções do diário mostra as 4 abas e rola sozinha até a aba ativa;
   - a tela não rola para o lado.

## 58. Diário — fase 4: Pessoas, busca em todo o diário e ligações
1. **Pessoas** (nova seção):
   - lista os NPCs revelados e os heróis dos outros jogadores das mesas desta ficha;
   - filtro Todos · NPCs · Heróis, com contagem;
   - cada cartão mostra o retrato (ou a inicial), o papel, a opinião e "citado em N". Os mais citados vêm primeiro.
2. **Detalhe da pessoa**:
   - retrato grande;
   - "O que o mestre revelou" (resumo do NPC) ou "Da ficha" (herói);
   - **O que eu acho**: Aliado / Neutro / Suspeito / Inimigo (clicar de novo tira), mais notas livres com @ e #;
   - **Onde aparece**: cada rabisco, sessão, missão e pista que cita a pessoa (com @ ou com o nome inteiro), com um trecho. Clicar leva até o item: abre a sessão, a missão ou a pista, ou destaca o rabisco com um brilho.
3. **Menções clicáveis**: dentro do Diário, tocar num nome citado (@) abre a pessoa. No botão Anotar das outras abas continua só o retrato ao passar o mouse.
4. **Pista ↔ missão**:
   - no detalhe da pista, "abrir missão →" abre a missão ligada;
   - no detalhe da missão, cada pista em "Pistas ligadas" abre a pista.
5. **Busca em todo o diário**: a seção aberta continua filtrando. Abaixo das abas aparece **"Também em: Quadro da Guilda 1 · Pistas 2"** para as outras seções com resultado; clicar vai até lá mantendo a busca.
6. A opinião e as notas sobre cada pessoa ficam salvas na ficha (recarregue e confira).
7. No celular, a barra de seções (5 abas) rola sozinha até a aba ativa. O detalhe da pessoa empilha o retrato sobre os campos.

## 59. Diário privado e leve (só você lê; imagens fora da ficha)
Antes: rode `supabase/diario_privado.sql` no Supabase (docs/SUPABASE.md §12). Sem ele, o app avisa que falta o script e o diário segue como antes.
1. **O mestre não lê o seu diário**:
   - escreva um rabisco, uma sessão e uma pista numa ficha compartilhada com uma mesa;
   - entre como o mestre e abra a ficha do jogador: a ficha aparece normalmente, sem o diário;
   - no Supabase (Table Editor → `sheets`), o `snapshot` não tem mais `diary`, e `journal`/`notes` estão vazios. O conteúdo está em `sheet_diaries`.
2. **Link de compartilhamento**: o link da ficha não mostra (nem carrega) o diário.
3. **Outros aparelhos**:
   - entre na mesma conta em outro aparelho: o diário aparece igual, e as imagens das pistas são baixadas e guardadas nesse aparelho;
   - edite o diário num aparelho e espere uns segundos: o outro recebe ao sincronizar.
4. **Offline**: sem internet, anexe uma imagem numa pista; ela aparece na hora. Ao voltar a conexão, sobe sozinha para a pasta privada (bucket `diario`).
5. **Imagens antigas**: pistas criadas antes desta mudança, com a imagem dentro da ficha, continuam aparecendo. A imagem passa para o aparelho e para a nuvem privada, e a ficha fica leve.
6. **Histórico da ficha**: restaurar uma versão volta PV, itens, nível etc., mas **não mexe no Diário** (anotações mais novas ficam).
7. Convidado (sem conta): tudo funciona no aparelho, como antes.

## 60. Regra oficial × regra da mesa × automação; aba Jogar

**Inspiração (PHB 2014: tem ou não tem)**
1. Ficha nova, aba **Jogar**: o selo diz "Sem inspiração". Toque **+**: vira "Inspirado". O **+** fica desligado ("Já tem inspiração (regra 2014: não acumula)").
2. **Evoluir → Regras desta ficha** → ligue **Inspiração acumulável** (etiqueta "Regra da mesa"). Volte ao Jogar: o selo mostra pontos, losangos e a marca **mesa**; o **+** acumula até 10.
3. Desligue a regra: os pontos caem para 1 (continua inspirado).
4. Ficha antiga que já tinha 3 pontos: continua com 3 e a regra aparece ligada (nada se perde).

**Regras desta ficha**
5. Ficha sem nada fora do livro: o cabeçalho não mostra selo; o painel diz "Nada fora do livro".
6. Use um item criado na Forja, digite os atributos à mão ou ligue a inspiração acumulável: aparece no cabeçalho **"2014 · N fora do padrão"** (passe o mouse para ver a lista). Tocar leva ao painel em Evoluir.
7. No painel, cada coisa tem a etiqueta do que é: Opcional do PHB (Talentos, Multiclasse), Regra da mesa, Homebrew, Outro livro (Origem de Tasha) ou Ajuste manual.
8. O antigo botão "Homebrew" (que não controlava nada) saiu.

**Magias: o que a ficha faz**
9. Aba **Magias**: cada magia tem um selo — **✓ automática**, **◐ parcial** ou **✋ na mesa**.
10. Passe o mouse (ou toque) no nome: a dica mostra **Na ficha** com linhas ✓ (a ficha aplica), ⚄ (a ficha rola) e ✋ (fica com a mesa). Ex.: Escudo = aplica +5 CA e sai sozinho; Bola de Fogo = rola o dano, o alvo faz salvaguarda e o mestre aplica; Bênção = fica marcada, mas o 1d4 você soma; Detectar Magia = resolvida na mesa.

**Abas**
11. A antiga aba **Mesa** agora se chama **Jogar** (as campanhas continuam em **Mesas**, no topo).
12. No PC: Jogar, Ficha, Combate, Inventário, Magias, Diário | separador | Evoluir, Descanso, Retrato, Dados (menores). Passe o mouse em cada aba: aparece para que ela serve.
13. No Jogar, os blocos têm atalho para o detalhe: Ataques → **Combate ›**, Salvaguardas → **Ficha ›**, Magia → **Magias ›**, Recursos & Descanso → **Descanso ›**.
14. No celular, **Mais** abre uma lista com Diário, Evoluir, Descanso, Retrato e Dados, cada uma com uma linha dizendo para que serve.

## 61. Pacotes abrem sozinhos

Pacotes (Explorador, Masmorras, Assaltante, Diplomata, Artista, Sacerdote, Estudioso) são só itens vendidos juntos: na ficha eles sempre viram os itens de dentro. Kits (Curandeiro, Disfarce, Ladrão…) continuam uma ferramenta só.

1. Inventário → **+ Adicionar** → busque "Pacote de Explorador" e toque: o catálogo diz "Pacote de Explorador foi aberto na mochila". Feche: aparecem Mochila, Saco de Dormir, Tocha, Rações etc. — e **não** aparece um item "Pacote de Explorador".
2. Com 1 tocha antes, ficam **x11** (soma à pilha, não cria uma segunda Tocha). Uma pilha guardada no **Baú** não é somada (a nova vai para a Mochila).
3. O aviso "Pacote de Explorador aberto: 8 itens na Mochila" tem **Desfazer**: volta exatamente ao que era (1 tocha, sem saco de dormir).
4. Ficha antiga com um pacote fechado no inventário: o card mostra **Abrir pacote**. Tocar abre os itens no mesmo recipiente; o Desfazer devolve o pacote fechado.
5. O mestre entregando um pacote pela mesa ao vivo: chega aberto na ficha do jogador.
6. Adicione um **Kit de Disfarce** ou **Kit de Curandeiro**: entra como um item só.

## 62. Descrições e etiquetas de itens (todo o catálogo)

1. Inventário → **+ Adicionar** → passe o mouse (no celular: segure) em **Armadura de Couro**: abaixo da CA aparece a descrição em itálico, depois a linha prática ("CA 11 + seu modificador de Destreza, sem atrapalhar a Furtividade") e as etiquetas **Barata · Furtividade**.
2. **Rapieira**: depois das propriedades, "Ataca com Força ou Destreza (a melhor)." seguido de para que ela serve; etiqueta **Social**.
3. Etiquetas automáticas: **Adaga** mostra Arremessável; **Arco Longo**, Duas mãos e Precisa de munição; **Armadura de Placas**, Barulhenta.
4. Uma **Espada Longa +2** usa a descrição da espada longa.
5. Na mochila, a mesma dica aparece no card do item (inclusive em itens antigos, achados pelo id do catálogo). Itens criados na Forja não têm descrição (ainda).
6. Equipamento: **Tocha** (Fonte de luz · Inflamável · Gasta ao usar), **Corda de Cânhamo** (Exploração · Barata), **Ácido** (Gasta ao usar, automática por ser consumível), **Ferramentas de Ferreiro** (Ferramenta), **Alaúde** (sem "Ferramenta"; Social), **Foco Arcano: Varinha** (Foco de conjuração · Discreta), **Cavalo de Guerra** (Montado · Defesa).
7. Pacotes (ex.: Pacote de Explorador) dizem na dica que entram abertos na mochila.
8. Itens mágicos: a dica mostra a regra exata do catálogo e, na linha de baixo, uma dica de uso. **Varinha de Bolas de Fogo**: "7 cargas: Bola de Fogo (CD 15)…" e depois "Cuidado com aliados na área…". **Poção de Cura**: "Recupera 2d4+2 PV" e "Beber é uma ação…".
9. Equipamento comum (ex.: **Tocha**) não repete a nota: a linha prática já diz o que ela faz.
10. Armaduras e escudos mágicos (**Armadura de Placas de Adamante**, **Escudo Sentinela**) dizem o efeito especial na linha prática.

## 63. Mesa ao vivo: ordens do mestre, PV do herói e telas

Antes: rode `supabase/mesa_vida.sql` no Supabase (docs/SUPABASE.md §13).

**Ordens do mestre nunca se perdem**
1. Com a sessão aberta, o jogador bloqueia o celular. O mestre faz várias rolagens (mais de 40 no registro) e aplica dano no herói. Ao desbloquear, o dano está na ficha.
2. O mestre dá XP e **encerra a sessão** antes de o jogador abrir o app. Quando o jogador abre a sala da mesa, o XP entra na ficha. Abrir de novo não dá o XP duas vezes.

**PV do herói igual para os dois**
3. O jogador bebe uma Poção de Cura pela ficha: em ~1 s, a linha do herói no encontro do mestre mostra o PV novo.
4. O herói tem 5 de PV temporário e o mestre aplica 7 de dano: a ficha fica com 2 a menos, e a linha do mestre também (não 7).
5. O jogador marca "Caído" na ficha: a condição aparece no encontro para o mestre.
6. Sem o `mesa_vida.sql`: o mestre vê o aviso de SQL faltando; o resto funciona como antes.

**Telas**
7. Console do mestre → Bastidores → **Criaturas**: retrato ao lado do nome, linhas alinhadas.
8. Abrir a mesa ao vivo: enquanto carrega, aparece o desenho da tela (blocos apagados). O mestre não vê mais a tela do jogador piscando antes do console.
9. Celular do jogador, com mapa no ar: o card do turno tem **Ver mapa ↓**, que rola até o mapa. No PC o botão não aparece.
10. Bastidores: **Biblioteca de cenas** (texto curto; o detalhe fica ao passar o mouse) e **Todas as pistas** no lugar de "Gaveta completa".
11. Sala da mesa → Crônica: o campo diz "Título (obrigatório)", e o **Registrar** explica ao passar o mouse por que está apagado.

## 64. Munição: cada disparo gasta uma peça

1. Herói com **Arco Curto** equipado e **Flechas (20)** na Mochila. Aba Combate (ou Jogar): ao lado do nome do arco aparece **20 flechas**.
2. Clicar em **ACERTO** do arco: o "Acertou o alvo?" mostra **−1 flecha · sobram 19**, e o selo vira **19 flechas**. Na Mochila, o pacote mostra **19 flechas** no lugar de "x1".
3. **Desfazer** no "acertou?": a flecha volta (selo em 20).
4. Com **Besta Leve** e **Virotes (20)**: a besta gasta virote; as flechas não mudam. Funda gasta bala, zarabatana gasta agulha.
5. Dois pacotes de flechas (x2 = 40): depois de 21 disparos, sobra 1 pacote com 19.
6. A última flecha: o "acertou?" avisa **era a última!**, o pacote some da Mochila e o selo fica vermelho, **sem flechas**. O próximo ACERTO não rola: o aviso diz "Sem flechas na Mochila." e oferece **Atirar assim**.
7. Flechas guardadas no Baú não servem: o aviso diz que estão no Baú (o selo mostra quantas há lá ao passar o mouse).
8. Depois da luta, com 2 ou mais flechas disparadas aparece **Recolher +N** (metade do disparado, para baixo). Clicar devolve as flechas e o botão some. O descanso longo zera a conta do que dá para recolher.
9. Espada, adaga e azagaia não mostram selo e não gastam nada.

## 65. Versão do app no menu principal

1. Abrir o menu principal: embaixo de tudo aparece **Versão 10/10/2026 12:49 · 4c034aa** (data e hora do build e o commit).
2. Com a versão mais nova aberta, ao lado aparece **✓ atualizada**.
3. Com o app instalado (ou uma aba antiga aberta) e um deploy novo no ar: ao abrir o menu (ou voltar para o app), aparece **Nova versão disponível · atualizar**. Tocar atualiza e recarrega na versão nova, que passa a mostrar ✓ atualizada.
4. Sem internet: aparece "sem internet para conferir". O app nunca diz "desatualizado" sem conseguir conferir.

## 66. Miniatura das magias

1. Busca (Ctrl+K) → "sono": a magia aparece com uma plaquinha quadrada com o símbolo da escola e moldura na cor do círculo (truque cinza, 1º–2º verde, 3º–5º azul, 6º–8º roxo, 9º laranja).
2. A mesma miniatura aparece na aba Magias (ao lado de cada magia), na biblioteca de "+ Aprender" (com o círculo no cantinho) e no seletor de magias da Forja.
3. Com a arte em `src/assets/magias/<id>.webp`, a miniatura passa a mostrar a arte; os detalhes da magia na busca mostram a carta grande, e a criação (Dons/Magias) também usa a arte.
4. No celular (até 420 px), a miniatura fica ao lado do nome e os botões descem para a linha de baixo.

## 67. Contador de artes (Configurações → Avançado)

1. Configurações → Avançado → **Contador de artes** → Abrir. Aparece o total ("486 de 939 artes · 52%") e uma barra por categoria: Magias, Armas, Armaduras e escudos, Equipamento, Itens mágicos, Criaturas, Retratos das classes, Vozes das classes. Categoria completa fica verde com ✓.
2. Tocar numa categoria: mostra a pasta e o guia, a divisão (magias por círculo, itens mágicos por raridade, criaturas por tipo…) e **Faltam N** com a lista de ids e nomes.
3. **Copiar ids** copia a lista do que falta (id e nome, um por linha), pronta para colar no gerador de imagens ou numa planilha.
4. Soltar uma arte nova na pasta e publicar: o número sobe sozinho na próxima versão.

## 68. Selo da raça no card e arte da magia no modal

1. Heróis: no canto do avatar de cada card aparece um selinho redondo com o ícone da raça, na cor da raça (passe o mouse para ver o nome). É mais discreto que a arte da classe.
2. Aba Magias: passe o mouse (ou toque) numa magia com arte (ex.: Armadura Arcana, Luz, Sono). O modal abre com a arte numa faixa no topo, de ponta a ponta, esmaecendo para dentro do painel; o nome da magia entra sobre a parte esmaecida. Brilho no topo na cor do círculo (verde 1º–2º, azul 3º–5º…).
3. Itens com arte continuam com a carta ao lado do texto.
4. Conferir no tema claro e no escuro: a arte some suave na cor do painel, sem faixa escura.
5. Aba Magias e aba Jogar: cada linha com arte tem a ilustração como fundo, bem transparente (acende um pouco ao passar o mouse); sem miniatura recortada. O ícone da escola fica ao lado do nome.
6. Modal da magia: a arte aparece **inteira** (sem corte) no topo, sobre um fundo desfocado da própria imagem, com os detalhes embaixo.
7. Lista: nome inteiro (sem "…"), duas colunas no PC, um botão (Conjurar). Mago: o "+"/"✓" à esquerda prepara/desprepara; magia não preparada fica apagada. ★ fixa a magia em **Favoritas** no topo (e primeiro na aba Jogar); ✕ esquece — os dois aparecem ao passar o mouse. Título de cada círculo mostra os espaços livres. Filtro por círculo e busca (com mais de 8 magias). CD e ataque num chip só; regras em "Como funciona". Magia de concentração ativa ganha brilho roxo. Sem tag "automática"

## 69. Aprender / preparar magias: filtros

1. Aba Magias → **+ Aprender** (ou **+ Preparar**). No topo: busca (com ✕ para limpar) e o botão **Filtros**.
2. Abas **Disponíveis · Escolhidas · Todas**, cada uma com a contagem. Abre em Disponíveis; "Escolhidas" mostra só as que o herói já tem; em "Todas" as bloqueadas aparecem apagadas com o motivo (🔒).
3. Círculos: **Todos · T · 1 … 9** numa linha só, também no celular (nada cortado, nada rolando de lado). Tocar de novo no círculo ativo volta para Todos.
4. **Filtros** abre um painel com Efeito (bolinha da cor), Escola (ícone) e Propriedades (Concentração, Ritual), tudo quebrando linha. O botão mostra quantos filtros estão ligados.
5. Cada filtro ligado vira uma etiqueta com ✕ embaixo da barra; **Limpar tudo** zera filtros, círculo e busca.
6. Lista separada por círculo (Truques, 1º círculo…) com a contagem de cada grupo; com um círculo escolhido, sem cabeçalho.
7. Sem resultado: mensagem com atalho (**Limpar filtros** ou **Ver todas e o motivo**).
8. PC: a barra de busca/filtros fica presa no topo ao rolar a lista. Celular: rola junto (para não tomar a tela).

## 70. Origem: sub-raças explicadas e balão das raças homebrew

1. Criação → Origem → escolha uma raça com sublinhagem (Anão, Elfo, Halfling, Gnomo, Draconato). Embaixo dos botões da sublinhagem aparece uma frase curta explicando a escolhida (ex.: Anão da Colina "ganham 1 PV a mais a cada nível"). Trocar a sublinhagem troca a frase.
2. Draconato: a frase diz o sopro (forma e salvaguarda) e a resistência da cor escolhida.
3. Raças homebrew (ex.: Aasimar, Tabaxi, Golias): passe o mouse no card (no celular, toque longo). O balão mostra a descrição, os traços em uma linha cada e, em "Sub-raças (o que muda)", o bônus, a frase e o traço de cada sub-raça. A base oficial aparece como etiqueta.
4. Escolhida uma raça homebrew com sub-raças, a sub-raça escolhida também ganha a frase curta embaixo dos botões.

## 71. Bruxo: invocações e Arcano Místico funcionando + subir de nível pelo topo

1. Cabeçalho da ficha: o "+" do nível **não** sobe mais sozinho. Ele abre a aba Evoluir, já rolada até "Subir para o Nível N", com PV e escolhas. O nível só muda ao confirmar ali.
2. Evoluir → escolhas pendentes (Invocações, Arcano Místico, Metamagia…): passe o mouse numa opção. Se for magia, aparece a magia inteira (círculo, tempo, alcance, duração e o que a ficha faz); senão, o efeito completo.
3. Aba Ficha → características escolhidas: passar o mouse numa magia escolhida (ex.: Arcano Místico) mostra a magia inteira, não só a escola.
4. Explosão Agonizante: Rajada Mística do nível 5 com CAR +3 e dois acertos → dano "2d10 +6".
5. Invocações que dão magia aparecem em Magias → "Magias de raça, itens, talentos e invocações" e conjuram de verdade, sem espaço:
   - Armadura das Sombras: Armadura Arcana em si mesmo, a CA vira 13 + DES na hora.
   - Vigor Infernal: Vitalidade Falsa em si mesmo, ganha PV temporários.
   - Disfarçar-se, Imagem Silenciosa, Detectar Magia, Falar com Animais e outras à vontade.
   - Atolar a Mente, Palavra Terrível, Sussurros Enfeitiçantes e outras: 1×, "usada" até o descanso longo.
6. Visão do Diabo: na aba Ficha, Visão no Escuro de 36 m (inclui escuridão mágica).
7. Bebedor de Vida (Pacto da Lâmina, nível 12): no dano da arma aparece "Bebedor de Vida +CAR necrótico", ligado por padrão.
8. Explosão Repulsiva / Lança Mística: no "acertou?" da Rajada Mística aparece o lembrete de empurrar 3 m / alcance 90 m.
9. Arcano Místico (6º–9º): a magia mostra "Arcano Místico · 1×/descanso longo" e conjura sem espaço. Depois fica "usado · volta no descanso longo".
10. Magias de raça e talento (Legado Infernal, Magia Drow…) também conjuram de verdade agora, com efeito e rolagem, em vez de só descontar o uso.

## 72. Bárbaro: Fúria de verdade (auditoria do 1 ao 20)

1. Combate → painel de Fúria: **Entrar em Fúria** gasta 1 uso (ex.: 4/4 → 3/4) e a ação bônus. A lista mostra o que vale enquanto ela dura.
2. Em Fúria, "Aplicar dano" corta pela metade (chip "Resistência da Fúria", que dá para desligar). Com o Totem do Urso, a resistência vale para tudo menos psíquico.
3. Em Fúria, teste e salvaguarda de FOR (e Atletismo) rolam com vantagem. O rótulo diz "vantagem: Fúria". Magias ficam travadas.
4. Nível 2+: **Ataque Imprudente** dá vantagem nos ataques corpo a corpo com FOR no turno e aparece nos efeitos. Some ao passar o turno.
5. Nível 2+: salvaguarda de DES com "vantagem: Sentido de Perigo" (não vale se estiver cego).
6. Nível 11+: cair a 0 PV em Fúria abre a "Fúria Implacável" (CON CD 10, +5 por uso). Passou → 1 PV; falhou → cai e a Fúria acaba.
7. Nível 18: teste de FOR nunca fica abaixo do valor de FOR ("Força Indomável (mínimo N)").
8. Furioso: "com Frenesi" e, ao encerrar, +1 exaustão. Nível 6+: em Fúria, não deixa marcar Enfeitiçado/Amedrontado.
9. Relatório completo: `docs/auditoria/barbaro.md`.

## 73. Guerreiro: auditoria do 1 ao 20

1. Combate → painel "Guerreiro":
   - **Retomar o Fôlego** rola 1d10 + nível, cura e gasta a ação bônus. Fica travado até o descanso curto.
   - **Surto de Ação** gasta o uso e libera a ação do turno.
   - **Indomável** rola de novo a última salvaguarda feita na ficha (o nome dela aparece no botão).
2. Estilo **Combate com Armas Grandes**: com montante/machado grande, os 1 e 2 do dano rolam de novo. O rótulo diz "Armas Grandes (rolou de novo 1–2)". Com espada longa, só quando marcar "Duas mãos".
3. Campeão 18: em "Novo turno" com PV ≤ metade, recupera 5 + CON (aviso "Sobrevivente").
4. Mestre de Batalha: no dano do ataque aparece "Manobra · gasta 1 dado (+1dX) · CD N". Escolher (ex.: Derrubada) soma o dado, gasta 1 dado e avisa "salvaguarda de FOR CD N ou o alvo cai". Ataque Preciso aparece no "Acertou?" e soma o dado ao ataque.
5. Relatório completo: `docs/auditoria/guerreiro.md`.

## 74. Menu principal: irmãs magas no fundo

1. No PC (janela com 900 px ou mais), o fundo do menu mostra a maga da água ou a do ar (sorteada a cada visita). O menu fica no lado direito, com uma névoa escura atrás para ler bem.
2. Cada clipe toca até o fim (5 s) e funde no da outra irmã, sem corte seco. Depois volta para a primeira, e assim por diante.
3. Trocar de aba do navegador pausa o vídeo; voltar retoma.
4. Celular, "economia de dados" ou "reduzir movimento" no sistema: sem vídeo, e o menu volta ao centro como antes.

## 75. Ladino: auditoria do 1 ao 20

1. Combate → painel "Ladino" (nível 2+):
   - **Disparada** muda o Movimento para o dobro (ex.: "9,0 m de 18 m (Disparada)").
   - **Desengajar** e **Esconder** gastam a ação bônus. Esconder rola Furtividade.
2. Nível 5+: no "Aplicar dano", marque **Esquiva Sobrenatural**. O dano cai pela metade e a reação fica gasta.
3. Nível 7+ (ou Monge 7+): **Evasão: passei** zera o dano; **falhei** aplica metade.
4. Nível 11+: rolar uma perícia treinada com d20 baixo mostra "Talento Confiável (d20 3 → 10)".
5. Nível 14+: a Ficha mostra "Sentido Cego 3 m".
6. Nível 20: **Golpe de Sorte** transforma o último teste em 20 e gasta o uso (volta no descanso curto).
7. Subclasses:
   - **Ladrão**: Mãos Rápidas no painel. Nível 9: Furtividade com vantagem se andou até metade do deslocamento. Nível 17: aviso do 2º turno ao rolar iniciativa.
   - **Assassino**: os kits de disfarce e de envenenador aparecem nas ferramentas. **Assassinar** dá vantagem nos ataques do turno. Nível 17: o painel mostra a CD do Golpe Mortal.
8. Relatório completo: `docs/auditoria/ladino.md`.

## 76. Vídeos de fundo e Palco das origens (experimental)

1. Configurações → Aparência → **Vídeos de fundo**:
   - **Automático**: comportamento de antes (sem vídeo no celular, com economia de dados, rede lenta ou "menos movimento" no sistema).
   - **Sempre**: mostra o vídeo do menu mesmo assim. Use se o seu Windows estiver com as animações desligadas.
   - **Desligado**: nunca mostra.
2. Configurações → Avançado → **Palco das origens** (ligado):
   - Na Forja, a etapa Origem mostra a cena da raça em tela cheia, a ficha da raça à direita e os brasões na borda.
   - Sem a trilha de capítulos e sem o card do herói nessa etapa.
3. Humano, Elfo, Tiefling e Anão usam as irmãs como cena provisória. As outras raças mostram o brasão com "cena da raça em produção".
4. Trocar de raça troca a cena com fusão. A sublinhagem e os atributos à escolha (Meio-Elfo) continuam funcionando, e "+" cria raça homebrew.
5. **Avançar** vai para o Caminho, e o card do herói volta a aparecer.
6. Para colocar o vídeo de uma raça: `src/assets/racas/<id>.mp4` (e `.webp`), ver o LEIA-ME de lá.
