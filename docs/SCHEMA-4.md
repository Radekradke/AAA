# Fichas no schema 4

O store `fv-characters` passa para versão 4. A hidratação chama `ensureCharacterV2`, cujo nome foi mantido por compatibilidade, e recupera subclasses por classe usando os campos antigos e o histórico de evolução. Fichas novas usam schema 4.

## Classes e conjuração

- `classLevels`: cada entrada pode guardar seu próprio `subclassId`.
- `subclassId` global continua representando a classe principal para leitores antigos. Ao editar a subclasse principal, atualize também sua entrada em `classLevels`.
- `classSpells[classId]`: magias conhecidas, preparadas, cópias e trocas da classe. Use `changeSpellSelection` para escrever; a função mantém a projeção nos campos globais da classe conjuradora padrão.
- `casterForClass` e `spellProfiles`: atributo, limites, CD e ataque por classe. Espaços compartilhados não concedem acesso a magias acima do círculo que a classe individual pode aprender.
- `combat.slotPools.spellcasting` e `.pact`: reservas distintas, cada círculo com `{max, used}`. `combat.spellSlots` permanece como projeção agregada. Escreva por `saveSlotPools`.

Fichas antigas não registravam a origem do espaço gasto. A primeira conversão aloca o gasto aos espaços comuns antes do pacto, para o descanso curto não recuperar indevidamente espaços comuns. Essa origem histórica não pode ser reconstruída com certeza; o jogador pode conferir os marcadores antes do próximo descanso.

## Dados de Vida

`combat.hitDicePools[faces]` guarda `{max, remaining}`. `hitDiceRemaining` é a soma das reservas. Na conversão antiga, os gastos são atribuídos primeiro ao tipo da classe principal. A evolução preserva os gastos e acrescenta o novo dado. O descanso longo recupera até metade do total, mínimo um, priorizando os maiores dados. O seletor de descanso permite escolher qual tipo gastar.

## Inventário

A identificação mecânica vem de `itemId`, `effectKey` e campos estruturados como `bodySlot`, `requiresHeld`, `requiresActivation` e `resistanceType`. Renomear não transforma um item do catálogo em homebrew. Alterar propriedades mecânicas marca a instância como homebrew e torna os dados da instância sua definição.

Use `itemDefinition`, `itemIdentity` e `activeMagicItems` para consultar efeitos. Não deduza ativação pela presença de uma palavra no nome. `activated` controla itens como Língua de Fogo; guardar, trocar ou dessintonizar encerra essa ativação.

Definições de raças personalizadas são lidas da própria ficha (`customRace`), sem modificar o catálogo global. Isso impede que uma outra versão da mesma raça altere um personagem já criado.

## Compatibilidade

Exportações continuam sendo JSON de `Character`. A importação valida a estrutura antes de migrar e persistir; rejeita tipos inválidos e níveis fora de 1–20. Formatos antigos e raças personalizadas incorporadas permanecem aceitos. Antes de abrir fichas do schema 4 numa versão antiga do app, mantenha uma exportação: versões antigas não conhecem as reservas e seleções por classe.

As operações de descanso preservam a convenção existente de limpar condições e efeitos na ficha. Isso é uma decisão do produto; condições persistentes específicas ainda devem ser conferidas com o mestre.
