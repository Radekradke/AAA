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
