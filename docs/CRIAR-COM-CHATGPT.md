<!-- Gerado por src/lib/chatgptGuide.ts — não edite à mão: rode `npm run docs:chatgpt`. -->
# Criar personagem com o ChatGPT

Use este guia para o ChatGPT montar um herói **pronto para importar** no Ficha Viva.

## Como usar

1. No ChatGPT, crie um **Projeto** (ou um GPT personalizado) e cole **este arquivo inteiro** nas instruções — ou anexe o arquivo `.md`.
2. Peça o personagem: *"Crie uma clériga anã nível 3, devota de Moradin, protetora da família"*.
3. Copie a resposta (pode ser a resposta inteira) e no app vá em **Heróis → Colar ficha (ChatGPT)** → cole → **Importar herói**.
   Também dá para salvar como `.json` e usar **Importar personagem (JSON)**.
4. O app monta a ficha com as **mesmas regras da criação** (equipamento inicial, perícias do antecedente, PV cheio, espaços de magia, recursos) e mostra uma lista do que ajustou, se algo fugiu da regra.

## Instruções para o ChatGPT

Você é o assistente de criação de personagens do app **Ficha Viva** (D&D 5e, regras de 2014, Livro do Jogador; Xanathar e Tasha só se eu pedir).
Quando eu descrever um personagem, faça perguntas só se faltar algo essencial e então responda **apenas com um bloco JSON** no formato abaixo — sem texto antes ou depois.

Regras:
1. `"formato"` é sempre `"ficha-viva/simples-1"`.
2. Use **exatamente** os nomes das listas deste guia (raça, sub-raça, classe, subclasse, antecedente, perícias, idiomas, talentos, magias, tendência).
3. `atributos` são os valores **base, antes do bônus racial** (o app soma o bônus). Use a **compra de pontos (27 pontos, valores de 8 a 15)** ou o **conjunto padrão 15, 14, 13, 12, 10, 8** — só passe de 15 se eu disser que rolei os dados.
4. `pericias`: **só as que a classe escolhe** (e as extras da raça, como as 2 do Meio-Elfo). As do antecedente e as fixas da raça entram sozinhas — não repita.
5. `idiomas`: **só os idiomas à escolha** (raça/sub-raça "1 idioma à escolha" + os do antecedente). Comum e os fixos da raça entram sozinhos.
6. `subclasse`: só se o nível já chegou no nível da subclasse da classe; senão `null`.
7. Nos níveis de aumento (4, 8, 12…), cada um vale **+2 em atributos** (`aumentosDeAtributo`, ex.: `{"des": 2}` ou `{"des": 1, "con": 1}`) **ou 1 talento** (`talentos`). A soma tem que fechar com o nível.
8. `magias`: truques + magias que o herói conhece (Bardo, Feiticeiro, Bruxo, Patrulheiro) ou prepara (Clérigo, Druida, Paladino, Mago), respeitando as quantidades da classe e o círculo máximo do nível. Mago também preenche `grimorio`. Classe sem magia: `[]`.
9. `especializacoes`: só Ladino (2 no nível 1, +2 no 6) e Bardo (2 no nível 3, +2 no 10), escolhidas entre as perícias que o herói já tem.
10. Equipamento, PV, CA, espaços de magia e recursos de classe **não vão no JSON** — o app calcula com as regras da criação.
11. Textos (`aparencia`, `personalidade`, `ideais`, `vinculos`, `defeitos`, `historia`) em português, curtos e no tom do personagem.

## Formato

| Campo | Tipo | O que vai |
|---|---|---|
| `formato` | texto | sempre `"ficha-viva/simples-1"` |
| `nome` | texto | nome do herói |
| `genero` | `"masc"` ou `"fem"` | define as palavras da ficha (ex.: "o herói"/"a heroína") |
| `idade` | número ou texto | |
| `conceito` | texto | uma frase que resume o personagem |
| `tendencia` | texto | uma das tendências da lista |
| `raca` / `subraca` | texto | da tabela de raças; `subraca` = `null` se a raça não tem |
| `bonusRacialEscolhido` | lista | só Meio-Elfo: 2 atributos (`"for"`, `"des"`, `"con"`, `"int"`, `"sab"`) |
| `classe` / `subclasse` | texto | da lista de classes; `subclasse` = `null` antes do nível dela |
| `nivel` | número | 1 a 20 |
| `antecedente` | texto | da tabela de antecedentes |
| `atributos` | objeto | `for`, `des`, `con`, `int`, `sab`, `car` — valores BASE |
| `aumentosDeAtributo` | objeto | pontos dos níveis de aumento, ex.: `{"des": 2}` |
| `talentos` | lista | nomes da lista de talentos |
| `pericias` | lista | só as escolhidas da classe (+ extras da raça) |
| `especializacoes` | lista | Ladino/Bardo |
| `idiomas` | lista | só os à escolha |
| `magias` | lista | truques + magias conhecidas/preparadas |
| `grimorio` | lista | só Mago |
| `aparencia`, `personalidade`, `ideais`, `vinculos`, `defeitos`, `historia` | texto | vão para as Notas da ficha |

## Exemplo completo

```json
{
  "formato": "ficha-viva/simples-1",
  "nome": "Lyra Ventobranco",
  "genero": "fem",
  "idade": 112,
  "conceito": "Arquivista élfica que estuda magia proibida para proteger a cidade",
  "tendencia": "Neutro e Bom",
  "raca": "Elfo",
  "subraca": "Alto Elfo",
  "classe": "Mago",
  "subclasse": "Escola de Evocação",
  "nivel": 2,
  "antecedente": "Sábio",
  "atributos": {
    "for": 8,
    "des": 14,
    "con": 13,
    "int": 15,
    "sab": 12,
    "car": 10
  },
  "pericias": [
    "Investigação",
    "Intuição"
  ],
  "especializacoes": [],
  "idiomas": [
    "Dracônico",
    "Celestial",
    "Anão"
  ],
  "talentos": [],
  "aumentosDeAtributo": {},
  "magias": [
    "Raio de Fogo",
    "Mãos Mágicas",
    "Prestidigitação",
    "Mísseis Mágicos",
    "Escudo Arcano",
    "Armadura Arcana",
    "Sono",
    "Detectar Magia"
  ],
  "grimorio": [
    "Mísseis Mágicos",
    "Escudo Arcano",
    "Armadura Arcana",
    "Sono",
    "Detectar Magia",
    "Mãos Flamejantes",
    "Convocar Familiar",
    "Identificação"
  ],
  "aparencia": "Alta, cabelo prateado preso em trança, olhos cor de âmbar, manto azul com runas bordadas.",
  "personalidade": "Fala baixo e anota tudo; não resiste a um livro trancado.",
  "ideais": "Conhecimento: a verdade deve ser preservada, mesmo a perigosa.",
  "vinculos": "A biblioteca de Vaelor, onde foi criada pelos arquivistas.",
  "defeitos": "Esconde o que descobre até ter certeza — às vezes tarde demais.",
  "historia": "Encontrou um grimório selado com o brasão da própria família e partiu para descobrir por que ele foi escondido."
}
```

## Tendências

Leal e Bom, Neutro e Bom, Caótico e Bom, Leal e Neutro, Neutro, Caótico e Neutro, Leal e Mau, Neutro e Mau, Caótico e Mau

## Raças

| Raça | Bônus | Sub-raça (obrigatória se houver) | Idiomas |
|---|---|---|---|
| Humano | +1 em tudo | — | Comum, 1 idioma à escolha |
| Elfo | +2 Destreza | Alto Elfo (+1 INT) · Elfo da Floresta (+1 SAB · +1,5 m) · Drow (+1 CAR) | Comum, Élfico |
| Anão | +2 Constituição | Anão da Colina (+1 SAB · +1 PV/nível) · Anão da Montanha (+2 FOR) | Comum, Anão |
| Halfling | +2 Destreza | Pés Leves (+1 CAR) · Robusto (+1 CON) | Comum, Halfling |
| Meio-Elfo | +2 CAR · +1 / +1 à escolha — os 2 atributos à escolha (não CAR) vão em `bonusRacialEscolhido` | — | Comum, Élfico, 1 idioma à escolha |
| Meio-Orc | +2 FOR · +1 CON | — | Comum, Orc |
| Gnomo | +2 Inteligência | Gnomo da Floresta (+1 DES) · Gnomo das Rochas (+1 CON) | Comum, Gnômico |
| Tiefling | +2 CAR · +1 INT | — | Comum, Infernal |
| Draconato | +2 FOR · +1 CAR | Dragão Preto (ácido · linha · DES) · Dragão Azul (elétrico · linha · DES) · Dragão Latão (fogo · linha · DES) · Dragão Bronze (elétrico · linha · DES) · Dragão Cobre (ácido · linha · DES) · Dragão Ouro (fogo · cone · DES) · Dragão Verde (veneno · cone · CON) · Dragão Vermelho (fogo · cone · DES) · Dragão Prata (frio · cone · CON) · Dragão Branco (frio · cone · CON) | Comum, Dracônico |

## Classes

### Bárbaro
- Dado de vida d12 · atributo principal FOR · resistências FOR e CON
- Perícias: escolha **2** entre Adestrar Animais, Atletismo, Intimidação, Natureza, Percepção, Sobrevivência
- Subclasse no nível 3: Caminho do Furioso, Caminho do Guerreiro Totêmico
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19

### Bardo
- Dado de vida d8 · atributo principal CAR · resistências DES e CAR
- Perícias: escolha **3** entre quaisquer
- Subclasse no nível 3: Colégio do Conhecimento, Colégio da Bravura
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 2 truques no nível 1 (3 no 4, 4 no 10); conhece **4 no nível 1, 5 no nível 2, 6 no nível 3, 8 no nível 5, 14 no nível 10**

### Clérigo
- Dado de vida d8 · atributo principal SAB · resistências SAB e CAR
- Perícias: escolha **2** entre História, Intuição, Medicina, Persuasão, Religião
- Subclasse no nível 1: Domínio da Vida, Domínio da Luz, Domínio da Guerra, Domínio do Conhecimento, Domínio da Natureza, Domínio da Tempestade, Domínio da Enganação
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 3 truques no nível 1 (4 no 4, 5 no 10); prepara **modificador de conjuração + nível** (mín. 1)

### Druida
- Dado de vida d8 · atributo principal SAB · resistências INT e SAB
- Perícias: escolha **2** entre Arcanismo, Adestrar Animais, Intuição, Medicina, Natureza, Percepção, Religião, Sobrevivência
- Subclasse no nível 2: Círculo da Terra, Círculo da Lua
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 2 truques no nível 1 (3 no 4, 4 no 10); prepara **modificador de conjuração + nível** (mín. 1)

### Guerreiro
- Dado de vida d10 · atributo principal FOR · resistências FOR e CON
- Perícias: escolha **2** entre Acrobacia, Adestrar Animais, Atletismo, História, Intuição, Intimidação, Percepção, Sobrevivência
- Subclasse no nível 3: Campeão, Mestre de Batalha, Cavaleiro Arcano
- Aumento de atributo/talento nos níveis 4, 6, 8, 12, 14, 16, 19

### Monge
- Dado de vida d8 · atributo principal DES · resistências FOR e DES
- Perícias: escolha **2** entre Acrobacia, Atletismo, História, Intuição, Religião, Furtividade
- Subclasse no nível 3: Caminho da Mão Aberta, Caminho da Sombra, Caminho dos Quatro Elementos
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19

### Paladino
- Dado de vida d10 · atributo principal CAR · resistências SAB e CAR
- Perícias: escolha **2** entre Atletismo, Intuição, Intimidação, Medicina, Persuasão, Religião
- Subclasse no nível 3: Juramento de Devoção, Juramento dos Anciões, Juramento de Vingança
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: sem truques; prepara **modificador de conjuração + metade do nível** (mín. 1)

### Patrulheiro
- Dado de vida d10 · atributo principal DES · resistências FOR e DES
- Perícias: escolha **3** entre Adestrar Animais, Atletismo, Intuição, Investigação, Natureza, Percepção, Furtividade, Sobrevivência
- Subclasse no nível 3: Caçador, Mestre das Feras
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: sem truques; conhece **0 no nível 1, 2 no nível 2, 3 no nível 3, 4 no nível 5, 6 no nível 10**

### Ladino
- Dado de vida d8 · atributo principal DES · resistências DES e INT
- Perícias: escolha **4** entre Acrobacia, Atletismo, Enganação, Intuição, Intimidação, Investigação, Percepção, Atuação, Persuasão, Prestidigitação, Furtividade
- Subclasse no nível 3: Ladrão, Assassino, Trapaceiro Arcano
- Aumento de atributo/talento nos níveis 4, 8, 10, 12, 16, 19

### Feiticeiro
- Dado de vida d6 · atributo principal CAR · resistências CON e CAR
- Perícias: escolha **2** entre Arcanismo, Enganação, Intuição, Intimidação, Persuasão, Religião
- Subclasse no nível 1: Linhagem Dracônica, Magia Selvagem
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 4 truques no nível 1 (5 no 4, 6 no 10); conhece **2 no nível 1, 3 no nível 2, 4 no nível 3, 6 no nível 5, 11 no nível 10**

### Bruxo
- Dado de vida d8 · atributo principal CAR · resistências SAB e CAR
- Perícias: escolha **2** entre Arcanismo, Enganação, História, Intimidação, Investigação, Natureza, Religião
- Subclasse no nível 1: A Arquifada, O Corruptor, O Grande Antigo
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 2 truques no nível 1 (3 no 4, 4 no 10); conhece **2 no nível 1, 3 no nível 2, 4 no nível 3, 6 no nível 5, 10 no nível 10**

### Mago
- Dado de vida d6 · atributo principal INT · resistências INT e SAB
- Perícias: escolha **2** entre Arcanismo, História, Intuição, Investigação, Medicina, Religião
- Subclasse no nível 2: Escola de Evocação, Escola de Abjuração, Escola de Adivinhação, Escola de Conjuração, Escola de Encantamento, Escola de Ilusão, Escola de Necromancia, Escola de Transmutação
- Aumento de atributo/talento nos níveis 4, 8, 12, 16, 19
- Magias: 3 truques no nível 1 (4 no 4, 5 no 10); grimório com **6 magias de 1º círculo + 2 por nível** (`grimorio`); prepara INT + nível delas (`magias`)

## Antecedentes

| Antecedente | Perícias que já dá | Idiomas à escolha |
|---|---|---|
| Acólito | Intuição, Religião | 2 |
| Charlatão | Enganação, Prestidigitação | 0 |
| Criminoso | Enganação, Furtividade | 0 |
| Artista | Acrobacia, Atuação | 0 |
| Herói do Povo | Adestrar Animais, Sobrevivência | 0 |
| Artesão de Guilda | Intuição, Persuasão | 1 |
| Eremita | Medicina, Religião | 1 |
| Nobre | História, Persuasão | 1 |
| Forasteiro | Atletismo, Sobrevivência | 1 |
| Sábio | Arcanismo, História | 2 |
| Marujo | Atletismo, Percepção | 0 |
| Soldado | Atletismo, Intimidação | 0 |
| Órfão das Ruas | Prestidigitação, Furtividade | 0 |

## Perícias

Acrobacia (DES) · Adestrar Animais (SAB) · Arcanismo (INT) · Atletismo (FOR) · Enganação (CAR) · História (INT) · Intuição (SAB) · Intimidação (CAR) · Investigação (INT) · Medicina (SAB) · Natureza (INT) · Percepção (SAB) · Atuação (CAR) · Persuasão (CAR) · Religião (INT) · Prestidigitação (DES) · Furtividade (DES) · Sobrevivência (SAB)

## Idiomas

Anão (padrão) · Élfico (padrão) · Gigante (padrão) · Gnômico (padrão) · Goblin (padrão) · Halfling (padrão) · Orc (padrão) · Abissal (exótico) · Celestial (exótico) · Dracônico (exótico) · Dialeto Subterrâneo (exótico) · Infernal (exótico) · Primordial (exótico) · Silvestre (exótico) · Subcomum (exótico)

## Talentos

- **Alerta**
- **Ator**
- **Atleta**
- **Investida**
- **Especialista em Bestas**
- **Duelista Defensivo** (pré-requisito: Destreza 13+)
- **Combatente de Duas Armas**
- **Explorador de Masmorras**
- **Vigoroso**
- **Adepto Elemental** (pré-requisito: Capaz de conjurar magias)
- **Lutador** (pré-requisito: Força 13+)
- **Mestre em Armas Grandes**
- **Curandeiro**
- **Fortemente Encouraçado** (pré-requisito: Proficiência em armadura média)
- **Mestre em Armadura Pesada** (pré-requisito: Proficiência em armadura pesada)
- **Líder Inspirador** (pré-requisito: Carisma 13+)
- **Mente Afiada**
- **Levemente Encouraçado**
- **Linguista**
- **Sortudo**
- **Caçador de Magos**
- **Iniciado na Magia**
- **Adepto Marcial**
- **Mestre em Armadura Média** (pré-requisito: Proficiência em armadura média)
- **Móbil**
- **Moderadamente Encouraçado** (pré-requisito: Proficiência em armadura leve)
- **Combatente Montado**
- **Observador**
- **Mestre em Hastes**
- **Resiliente**
- **Conjurador de Rituais** (pré-requisito: Inteligência ou Sabedoria 13+)
- **Atacante Selvagem**
- **Sentinela**
- **Atirador de Elite**
- **Mestre do Escudo**
- **Habilidoso**
- **Sorrateiro** (pré-requisito: Destreza 13+)
- **Franco-Atirador Mágico** (pré-requisito: Capaz de conjurar magias)
- **Brigão de Taverna**
- **Durão**
- **Conjurador de Guerra** (pré-requisito: Capaz de conjurar magias)
- **Mestre em Armas**
- **Sorte Generosa** (pré-requisito: Halfling) · Xanathar
- **Medo Dracônico** (pré-requisito: Draconato) · Xanathar
- **Couro Dracônico** (pré-requisito: Draconato) · Xanathar
- **Alta Magia Drow** (pré-requisito: Elfo (drow)) · Xanathar
- **Fortitude Anã** (pré-requisito: Anão) · Xanathar
- **Precisão Élfica** (pré-requisito: Elfo ou Meio-Elfo) · Xanathar
- **Desvanecer** (pré-requisito: Gnomo) · Xanathar
- **Teleporte Feérico** (pré-requisito: Elfo (alto elfo)) · Xanathar
- **Chamas de Flegetos** (pré-requisito: Tiefling) · Xanathar
- **Constituição Infernal** (pré-requisito: Tiefling) · Xanathar
- **Fúria Orc** (pré-requisito: Meio-Orc) · Xanathar
- **Prodígio** (pré-requisito: Humano, Meio-Elfo ou Meio-Orc) · Xanathar
- **Segunda Chance** (pré-requisito: Halfling) · Xanathar
- **Agilidade Atarracada** (pré-requisito: Anão ou raça Pequena) · Xanathar
- **Magia do Elfo da Floresta** (pré-requisito: Elfo (da floresta)) · Xanathar
- **Iniciado Artífice** · Tasha
- **Chef** · Tasha
- **Esmagador** · Tasha
- **Adepto Místico** (pré-requisito: Conjuração ou Magia de Pacto) · Tasha
- **Tocado pelas Fadas** · Tasha
- **Iniciado em Combate** (pré-requisito: Proficiência com uma arma marcial) · Tasha
- **Pistoleiro** · Tasha
- **Adepto Metamágico** (pré-requisito: Conjuração ou Magia de Pacto) · Tasha
- **Perfurador** · Tasha
- **Envenenador** · Tasha
- **Tocado pelas Sombras** · Tasha
- **Especialista em Perícia** · Tasha
- **Retalhador** · Tasha
- **Telecinético** · Tasha
- **Telepático** · Tasha

## Magias

Cada magia mostra as classes que podem aprendê-la. "Xanathar"/"Tasha" = só com o pacote do livro ligado no app.

### Truques
- Amizade — Bardo, Feiticeiro, Bruxo, Mago
- Arte Druídica — Druida
- Bordão Místico — Druida
- Chama Sagrada — Clérigo
- Chicote de Espinhos — Druida
- Consertar — Bardo, Clérigo, Druida, Feiticeiro, Mago
- Controlar Chamas — Druida, Feiticeiro, Mago · Xanathar
- Criar Fogueira — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Dobre pelos Mortos — Clérigo, Bruxo, Mago · Xanathar
- Estabilizar Criatura — Clérigo
- Estrondo — Bardo, Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Explosão de Espadas — Feiticeiro, Bruxo, Mago · Tasha
- Globos de Luz — Bardo, Feiticeiro, Mago
- Golpe Certeiro — Bardo, Feiticeiro, Bruxo, Mago
- Ilusão Menor — Bardo, Feiticeiro, Bruxo, Mago
- Infestação — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Isca Elétrica — Feiticeiro, Bruxo, Mago · Tasha
- Lâmina de Chamas Verdes — Feiticeiro, Bruxo, Mago · Tasha
- Lâmina Trovejante — Feiticeiro, Bruxo, Mago · Tasha
- Lasca Mental — Feiticeiro, Bruxo, Mago · Tasha
- Lufada — Druida, Feiticeiro, Mago · Xanathar
- Luz — Bardo, Clérigo, Feiticeiro, Mago
- Mãos Mágicas — Bardo, Feiticeiro, Bruxo, Mago
- Mensagem — Bardo, Feiticeiro, Mago
- Moldar Água — Druida, Feiticeiro, Mago · Xanathar
- Moldar Terra — Druida, Feiticeiro, Mago · Xanathar
- Orientação — Clérigo, Druida
- Palavra Radiante — Clérigo · Xanathar
- Pedra Mágica — Druida, Bruxo · Xanathar
- Prestidigitação — Bardo, Feiticeiro, Bruxo, Mago
- Produzir Chama — Druida
- Proteção contra Lâminas — Bardo, Feiticeiro, Bruxo, Mago
- Queimadura de Frio — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Raio de Fogo — Feiticeiro, Mago
- Raio de Gelo — Feiticeiro, Mago
- Rajada de Veneno — Druida, Feiticeiro, Bruxo, Mago
- Rajada Mística — Bruxo
- Resistência — Clérigo, Druida
- Respingo Ácido — Feiticeiro, Mago
- Selvageria Primal — Druida · Xanathar
- Taumaturgia — Clérigo
- Toque Chocante — Feiticeiro, Mago
- Toque Gélido — Feiticeiro, Bruxo, Mago
- Zombaria Viciosa — Bardo

### 1º círculo
- Absorver Elementos — Druida, Patrulheiro, Feiticeiro, Mago · Xanathar
- Alarme — Patrulheiro, Mago
- Amizade Animal — Bardo, Druida, Patrulheiro
- Área Escorregadia — Mago
- Armadura Arcana — Feiticeiro, Mago
- Armadura de Agathys — Bruxo
- Bênção — Clérigo, Paladino
- Bom Fruto — Druida, Patrulheiro
- Braços de Hadar — Bruxo
- Bruxaria — Bruxo
- Catapulta — Feiticeiro, Mago · Xanathar
- Causar Medo — Bruxo, Mago · Xanathar
- Cerimônia — Clérigo, Paladino · Xanathar
- Comando — Clérigo, Paladino
- Compreender Idiomas — Bardo, Feiticeiro, Bruxo, Mago
- Constrição — Druida
- Convocar Familiar — Mago
- Criar ou Destruir Água — Clérigo, Druida
- Curar Ferimentos — Bardo, Clérigo, Druida, Paladino, Patrulheiro
- Destruição Colérica — Paladino
- Destruição Lancinante — Paladino
- Destruição Trovejante — Paladino
- Detectar Magia — Bardo, Clérigo, Druida, Paladino, Patrulheiro, Feiticeiro, Mago
- Detectar o Bem e o Mal — Clérigo, Paladino
- Detectar Veneno e Doença — Clérigo, Druida, Paladino, Patrulheiro
- Disco Flutuante de Tenser — Mago
- Disfarçar-se — Bardo, Feiticeiro, Mago
- Duelo Compelido — Paladino
- Enfeitiçar Pessoa — Bardo, Druida, Feiticeiro, Bruxo, Mago
- Escrita Ilusória — Bardo, Bruxo, Mago
- Escudo Arcano — Feiticeiro, Mago
- Escudo da Fé — Clérigo, Paladino
- Faca de Gelo — Druida, Feiticeiro, Mago · Xanathar
- Falar com Animais — Bardo, Druida, Patrulheiro
- Favor Divino — Paladino
- Fogo das Fadas — Bardo, Druida
- Golpe Constritor — Patrulheiro
- Golpe Zéfiro — Patrulheiro · Xanathar
- Heroísmo — Bardo, Paladino
- Identificação — Bardo, Mago
- Imagem Silenciosa — Bardo, Feiticeiro, Mago
- Infligir Ferimentos — Clérigo
- Infusão Cáustica de Tasha — Feiticeiro, Mago · Tasha
- Laço — Druida, Patrulheiro, Mago · Xanathar
- Laço Animal — Druida, Patrulheiro · Xanathar
- Leque Cromático — Feiticeiro, Mago
- Mãos Flamejantes — Feiticeiro, Mago
- Marca do Caçador — Patrulheiro
- Mísseis Mágicos — Feiticeiro, Mago
- Névoa Obscurecente — Druida, Patrulheiro, Feiticeiro, Mago
- Onda Trovejante — Bardo, Druida, Feiticeiro, Mago
- Orbe Cromático — Feiticeiro, Mago
- Palavra Curativa — Bardo, Clérigo, Druida
- Passos Longos — Bardo, Druida, Patrulheiro, Mago
- Perdição — Bardo, Clérigo
- Proteção contra o Bem e o Mal — Clérigo, Paladino, Bruxo, Mago
- Purificar Alimentos e Bebidas — Clérigo, Druida, Paladino
- Queda Suave — Bardo, Feiticeiro, Mago
- Raio Adoecente — Feiticeiro, Mago
- Raio de Bruxa — Feiticeiro, Bruxo, Mago
- Raio do Caos — Feiticeiro · Xanathar
- Raio Guiador — Clérigo
- Recuo Acelerado — Feiticeiro, Bruxo, Mago
- Repreensão Infernal — Bruxo
- Riso Histérico de Tasha — Bardo, Mago
- Saltar — Druida, Patrulheiro, Feiticeiro, Mago
- Santuário — Clérigo
- Saraivada de Espinhos — Patrulheiro
- Servo Invisível — Bardo, Bruxo, Mago
- Sono — Bardo, Feiticeiro, Mago
- Sussurros Dissonantes — Bardo
- Tremor de Terra — Bardo, Druida, Feiticeiro, Mago · Xanathar
- Vitalidade Falsa — Feiticeiro, Mago

### 2º círculo
- Abrasador de Aganazzar — Feiticeiro, Mago · Xanathar
- Acalmar Emoções — Bardo, Clérigo
- Alterar-se — Feiticeiro, Mago
- Ampliar/Reduzir — Feiticeiro, Mago
- Aprimorar Habilidade — Bardo, Clérigo, Druida, Feiticeiro
- Arma Espiritual — Clérigo
- Arma Mágica — Paladino, Mago
- Arrombar — Bardo, Feiticeiro, Mago
- Augúrio — Clérigo
- Aura Mágica de Nystul — Mago
- Auxílio — Clérigo, Paladino
- Boca Encantada — Bardo, Mago
- Cativar — Bardo, Bruxo
- Cegueira/Surdez — Bardo, Clérigo, Feiticeiro, Mago
- Chama Contínua — Clérigo, Mago
- Chicote Mental de Tasha — Feiticeiro, Mago · Tasha
- Convocar Montaria — Paladino
- Cordão de Flechas — Patrulheiro
- Coroa da Loucura — Bardo, Feiticeiro, Bruxo, Mago
- Crescer Espinhos — Druida, Patrulheiro
- Despedaçar — Bardo, Feiticeiro, Bruxo, Mago
- Destruição Marcante — Paladino
- Detectar Pensamentos — Bardo, Feiticeiro, Mago
- Encontrar Armadilhas — Clérigo, Druida, Patrulheiro
- Enxame de Bolas de Neve de Snilloc — Feiticeiro, Mago · Xanathar
- Escrita Celeste — Bardo, Druida, Mago · Xanathar
- Escuridão — Feiticeiro, Bruxo, Mago
- Esfera Flamejante — Druida, Mago
- Espinho Mental — Feiticeiro, Bruxo, Mago · Xanathar
- Espírito Curador — Druida, Patrulheiro · Xanathar
- Esquentar Metal — Bardo, Druida
- Flecha Ácida de Melf — Mago
- Força Fantasmagórica — Bardo, Feiticeiro, Mago
- Imagem Espelhada — Feiticeiro, Bruxo, Mago
- Imobilizar Pessoa — Bardo, Clérigo, Druida, Feiticeiro, Bruxo, Mago
- Invisibilidade — Bardo, Feiticeiro, Bruxo, Mago
- Invocar Fera — Druida, Patrulheiro · Tasha
- Lâmina das Sombras — Feiticeiro, Bruxo, Mago · Xanathar
- Lâmina Flamejante — Druida
- Levitação — Feiticeiro, Mago
- Localizar Animais ou Plantas — Bardo, Druida, Patrulheiro
- Localizar Objeto — Bardo, Clérigo, Druida, Paladino, Patrulheiro, Mago
- Lufada de Vento — Druida, Feiticeiro, Mago
- Mensageiro Animal — Bardo, Druida, Patrulheiro
- Nublar — Feiticeiro, Mago
- Nuvem de Adagas — Bardo, Feiticeiro, Bruxo, Mago
- Oração de Cura — Clérigo
- Passo Enevoado — Feiticeiro, Bruxo, Mago
- Passos sem Pegadas — Druida, Patrulheiro
- Patas de Aranha — Feiticeiro, Bruxo, Mago
- Pele de Árvore — Druida, Patrulheiro
- Pirotecnia — Bardo, Feiticeiro, Mago · Xanathar
- Prender à Terra — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Proteção contra Veneno — Clérigo, Druida, Paladino, Patrulheiro
- Punho de Terra de Maximilian — Feiticeiro, Mago · Xanathar
- Raio Ardente — Feiticeiro, Mago
- Raio do Enfraquecimento — Bruxo, Mago
- Raio Lunar — Druida
- Redemoinho de Poeira — Druida, Feiticeiro, Mago · Xanathar
- Repouso Tranquilo — Clérigo, Mago
- Restauração Menor — Bardo, Clérigo, Druida, Paladino, Patrulheiro
- Sentido Bestial — Druida, Patrulheiro
- Silêncio — Bardo, Clérigo, Patrulheiro
- Sopro de Dragão — Feiticeiro, Mago · Xanathar
- Sugestão — Bardo, Feiticeiro, Bruxo, Mago
- Teia — Feiticeiro, Mago
- Tranca Arcana — Mago
- Truque de Corda — Mago
- Vento Protetor — Bardo, Druida, Feiticeiro, Mago · Xanathar
- Ver o Invisível — Bardo, Feiticeiro, Mago
- Vínculo Protetor — Clérigo
- Visão no Escuro — Druida, Patrulheiro, Feiticeiro, Mago
- Zona da Verdade — Bardo, Clérigo, Paladino

### 3º círculo
- Acelerar — Feiticeiro, Mago
- Amedrontar — Bardo, Feiticeiro, Bruxo, Mago
- Andar na Água — Clérigo, Druida, Patrulheiro, Feiticeiro
- Animar Mortos — Clérigo, Mago
- Arma Elemental — Paladino
- Aura de Vitalidade — Paladino
- Bola de Fogo — Feiticeiro, Mago
- Círculo Mágico — Clérigo, Paladino, Bruxo, Mago
- Clarividência — Bardo, Clérigo, Feiticeiro, Mago
- Conjurar Animais — Druida, Patrulheiro
- Conjurar Rajada — Patrulheiro
- Contramágica — Feiticeiro, Bruxo, Mago
- Convocar Relâmpagos — Druida
- Crescimento de Plantas — Bardo, Druida, Patrulheiro
- Criar Alimentos e Água — Clérigo, Paladino
- Destruição Cegante — Paladino
- Dissipar Magia — Bardo, Clérigo, Druida, Paladino, Feiticeiro, Bruxo, Mago
- Enviar Mensagem — Bardo, Clérigo, Mago
- Erupção de Terra — Druida, Feiticeiro, Mago · Xanathar
- Espíritos Guardiões — Clérigo
- Falar com os Mortos — Bardo, Clérigo
- Falar com Plantas — Bardo, Druida, Patrulheiro
- Fingir-se de Morto — Bardo, Clérigo, Druida, Mago
- Flecha Relampejante — Patrulheiro
- Flechas Flamejantes — Druida, Patrulheiro, Feiticeiro, Mago · Xanathar
- Fome de Hadar — Bruxo
- Forma Gasosa — Feiticeiro, Bruxo, Mago
- Fortaleza do Intelecto — Bardo, Feiticeiro, Bruxo, Mago · Tasha
- Fundir-se às Rochas — Clérigo, Druida
- Glifo de Proteção — Bardo, Clérigo, Mago
- Idiomas — Bardo, Clérigo, Feiticeiro, Bruxo, Mago
- Imagem Maior — Bardo, Feiticeiro, Bruxo, Mago
- Inimigos por Toda Parte — Bardo, Feiticeiro, Bruxo, Mago · Xanathar
- Invocar Cria das Sombras — Bruxo, Mago · Tasha
- Invocar Demônios Menores — Bruxo, Mago · Xanathar
- Invocar Fada — Druida, Patrulheiro, Bruxo, Mago · Tasha
- Invocar Morto-Vivo — Bruxo, Mago · Tasha
- Lentidão — Feiticeiro, Mago
- Luz do Dia — Clérigo, Druida, Paladino, Patrulheiro, Feiticeiro
- Manto do Cruzado — Paladino
- Manto Espiritual — Clérigo, Paladino, Bruxo, Mago · Tasha
- Maremoto — Druida, Feiticeiro, Mago · Xanathar
- Meteoros Diminutos de Melf — Feiticeiro, Mago · Xanathar
- Montaria Fantasmagórica — Mago
- Muralha de Água — Druida, Feiticeiro, Mago · Xanathar
- Muralha de Areia — Mago · Xanathar
- Muralha de Vento — Druida, Patrulheiro
- Não Detecção — Bardo, Patrulheiro, Mago
- Nevasca — Druida, Feiticeiro, Mago
- Névoa Fétida — Bardo, Feiticeiro, Mago
- Padrão Hipnótico — Bardo, Feiticeiro, Bruxo, Mago
- Palavra Curativa em Massa — Clérigo
- Passo Trovejante — Feiticeiro, Bruxo, Mago · Xanathar
- Pequena Cabana de Leomund — Bardo, Mago
- Piscar — Feiticeiro, Mago
- Proteção contra Energia — Clérigo, Druida, Patrulheiro, Feiticeiro, Mago
- Relâmpago — Feiticeiro, Mago
- Remover Maldição — Clérigo, Paladino, Bruxo, Mago
- Respirar na Água — Druida, Patrulheiro, Feiticeiro, Mago
- Revivificar — Clérigo, Paladino
- Rogar Maldição — Bardo, Clérigo, Mago
- Servo Minúsculo — Mago · Xanathar
- Sinal de Esperança — Clérigo
- Soneca — Bardo, Feiticeiro, Mago · Xanathar
- Toque Vampírico — Bruxo, Mago
- Transferência de Vida — Clérigo, Mago · Xanathar
- Voo — Feiticeiro, Bruxo, Mago

### 4º círculo
- Adivinhação — Clérigo
- Assassino Fantasmagórico — Mago
- Aura de Pureza — Paladino
- Aura de Vida — Paladino
- Banimento — Clérigo, Paladino, Feiticeiro, Bruxo, Mago
- Baú Secreto de Leomund — Mago
- Cão Fiel de Mordenkainen — Mago
- Compulsão — Bardo
- Confusão — Bardo, Druida, Feiticeiro, Mago
- Conjurar Elementais Menores — Druida, Mago
- Conjurar Seres da Floresta — Druida, Patrulheiro
- Controlar a Água — Clérigo, Druida, Mago
- Destruição Atordoante — Paladino
- Dominar Besta — Druida, Feiticeiro
- Encontrar Corcel Maior — Paladino · Xanathar
- Enfeitiçar Monstro — Bardo, Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Escudo de Fogo — Mago
- Esfera Aquosa — Druida, Feiticeiro, Mago · Xanathar
- Esfera de Tempestade — Feiticeiro, Mago · Xanathar
- Esfera Resiliente de Otiluke — Mago
- Esfera Vitriólica — Feiticeiro, Mago · Xanathar
- Fabricar — Mago
- Guardião da Fé — Clérigo
- Guardião da Natureza — Druida, Patrulheiro · Xanathar
- Inseto Gigante — Druida
- Invisibilidade Maior — Bardo, Feiticeiro, Mago
- Invocar Aberração — Bruxo, Mago · Tasha
- Invocar Construto — Mago · Tasha
- Invocar Demônio Maior — Bruxo, Mago · Xanathar
- Invocar Elemental — Druida, Patrulheiro, Mago · Tasha
- Liberdade de Movimento — Bardo, Clérigo, Druida, Patrulheiro
- Localizar Criatura — Bardo, Clérigo, Druida, Paladino, Patrulheiro, Mago
- Metamorfose — Bardo, Druida, Feiticeiro, Mago
- Moldar Rochas — Clérigo, Druida, Mago
- Muralha de Fogo — Druida, Feiticeiro, Mago
- Olho Arcano — Mago
- Pele de Pedra — Druida, Patrulheiro, Feiticeiro, Mago
- Porta Dimensional — Bardo, Feiticeiro, Bruxo, Mago
- Praga — Druida, Feiticeiro, Bruxo, Mago
- Proteção contra a Morte — Clérigo, Paladino
- Radiação Nauseante — Feiticeiro, Bruxo, Mago · Xanathar
- Ruína Elemental — Druida, Bruxo, Mago · Xanathar
- Santuário Particular de Mordenkainen — Mago
- Sombra de Moil — Bruxo · Xanathar
- Tempestade de Gelo — Druida, Feiticeiro, Mago
- Tentáculos Negros de Evard — Mago
- Terreno Alucinatório — Bardo, Druida, Bruxo, Mago
- Vinha Constritora — Druida, Patrulheiro

### 5º círculo
- Aljava Veloz — Patrulheiro
- Alvorada — Clérigo, Mago · Xanathar
- Animar Objetos — Bardo, Feiticeiro, Mago
- Arma Sagrada — Clérigo, Paladino · Xanathar
- Caminhar em Árvores — Druida, Patrulheiro
- Chamado Infernal — Bruxo, Mago · Xanathar
- Círculo de Poder — Paladino
- Círculo de Teletransporte — Bardo, Feiticeiro, Mago
- Coluna de Chamas — Clérigo
- Comunhão — Clérigo
- Comunhão com a Natureza — Druida, Patrulheiro
- Concha Antivida — Druida
- Cone do Frio — Feiticeiro, Mago
- Conjurar Elemental — Druida, Mago
- Conjurar Saraivada — Patrulheiro
- Consagrar — Clérigo
- Contágio — Clérigo, Druida
- Contatar Outro Plano — Bruxo, Mago
- Controlar Ventos — Druida, Feiticeiro, Mago · Xanathar
- Criação — Feiticeiro, Mago
- Curar Ferimentos em Massa — Bardo, Clérigo, Druida
- Dança Macabra — Bruxo, Mago · Xanathar
- Despertar — Bardo, Druida
- Despistar — Bardo, Mago
- Destruição Banidora — Paladino
- Dissipar o Bem e o Mal — Clérigo, Paladino
- Dominar Pessoa — Bardo, Feiticeiro, Mago
- Enervação — Feiticeiro, Bruxo, Mago · Xanathar
- Estática Sináptica — Bardo, Feiticeiro, Bruxo, Mago · Xanathar
- Fortalecer Perícia — Bardo, Feiticeiro, Bruxo, Mago · Xanathar
- Fúria da Natureza — Druida, Patrulheiro · Xanathar
- Golpe Vento de Aço — Patrulheiro, Mago · Xanathar
- Imobilizar Monstro — Bardo, Feiticeiro, Bruxo, Mago
- Imolação — Feiticeiro, Mago · Xanathar
- Inundação de Energia Negativa — Bruxo, Mago · Xanathar
- Lendas e Histórias — Bardo, Clérigo, Mago
- Mão de Bigby — Mago
- Missão — Bardo, Clérigo, Druida, Paladino, Mago
- Modificar Memória — Bardo, Mago
- Muralha de Energia — Mago
- Muralha de Luz — Feiticeiro, Bruxo, Mago · Xanathar
- Muralha de Pedra — Druida, Feiticeiro, Mago
- Névoa Mortal — Feiticeiro, Mago
- Onda Destrutiva — Paladino
- Passagem pelas Paredes — Mago
- Passo Distante — Feiticeiro, Bruxo, Mago · Xanathar
- Praga de Insetos — Clérigo, Druida, Feiticeiro
- Reencarnar — Druida
- Restauração Maior — Bardo, Clérigo, Druida
- Reviver os Mortos — Bardo, Clérigo, Paladino
- Similaridade — Bardo, Feiticeiro, Mago
- Sonho — Bardo, Bruxo, Mago
- Telecinese — Feiticeiro, Mago
- Transmutar Rocha — Druida, Mago · Xanathar
- Vidência — Bardo, Clérigo, Druida, Bruxo, Mago
- Vínculo Planar — Bardo, Clérigo, Druida, Mago
- Vínculo Telepático de Rary — Mago

### 6º círculo
- Aliado Planar — Clérigo
- Aparência Extraplanar de Tasha — Feiticeiro, Bruxo, Mago · Tasha
- Banquete dos Heróis — Clérigo, Druida
- Barreira de Lâminas — Clérigo
- Bosque do Druida — Druida · Xanathar
- Caminhar no Vento — Druida
- Carne para Pedra — Bruxo, Mago
- Círculo da Morte — Feiticeiro, Bruxo, Mago
- Conjurar Fada — Druida, Bruxo
- Contingência — Mago
- Convocação Instantânea de Drawmij — Mago
- Corrente de Relâmpagos — Feiticeiro, Mago
- Criar Homúnculo — Mago · Xanathar
- Criar Mortos-Vivos — Clérigo, Bruxo, Mago
- Cura Completa — Clérigo, Druida
- Dança Irresistível de Otto — Bardo, Mago
- Desintegrar — Feiticeiro, Mago
- Dispersar — Feiticeiro, Bruxo, Mago · Xanathar
- Encontrar o Caminho — Bardo, Clérigo, Druida
- Esfera Congelante de Otiluke — Feiticeiro, Mago
- Gaiola de Almas — Bruxo, Mago · Xanathar
- Globo de Invulnerabilidade — Feiticeiro, Mago
- Guardas e Proteções — Bardo, Mago
- Ilusão Programada — Bardo, Mago
- Investidura da Pedra — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Investidura das Chamas — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Investidura do Gelo — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Investidura do Vento — Druida, Feiticeiro, Bruxo, Mago · Xanathar
- Invocar Celestial — Clérigo, Paladino · Tasha
- Invocar Corruptor — Bruxo, Mago · Tasha
- Mau-Olhado — Bardo, Feiticeiro, Bruxo, Mago
- Mover Terra — Druida, Feiticeiro, Mago
- Muralha de Espinhos — Druida
- Muralha de Gelo — Mago
- Ossos da Terra — Druida · Xanathar
- Palavra de Recordação — Clérigo
- Portal Arcano — Feiticeiro, Bruxo, Mago
- Prejudicar — Clérigo
- Prisão Mental — Feiticeiro, Bruxo, Mago · Xanathar
- Proibição — Clérigo
- Proteção Primordial — Druida · Xanathar
- Raio Solar — Druida, Feiticeiro, Mago
- Recipiente Arcano — Mago
- Sugestão em Massa — Bardo, Feiticeiro, Bruxo, Mago
- Transformação de Tenser — Mago · Xanathar
- Transporte pelas Plantas — Druida
- Visão da Verdade — Bardo, Clérigo, Feiticeiro, Bruxo, Mago

### 7º círculo
- Bola de Fogo Controlável — Feiticeiro, Mago
- Conjurar Celestial — Clérigo
- Coroa de Estrelas — Feiticeiro, Bruxo, Mago · Xanathar
- Dedo da Morte — Feiticeiro, Bruxo, Mago
- Espada de Mordenkainen — Bardo, Mago
- Forma Etérea — Bardo, Clérigo, Feiticeiro, Bruxo, Mago
- Inverter a Gravidade — Druida, Feiticeiro, Mago
- Isolamento — Mago
- Jaula de Energia — Bardo, Bruxo, Mago
- Mansão Magnífica de Mordenkainen — Bardo, Mago
- Miragem Arcana — Bardo, Druida, Mago
- Palavra de Poder: Dor — Feiticeiro, Bruxo, Mago · Xanathar
- Palavra Divina — Clérigo
- Projetar Imagem — Bardo, Mago
- Regeneração — Bardo, Clérigo, Druida
- Ressurreição — Bardo, Clérigo
- Símbolo — Bardo, Clérigo, Mago
- Simulacro — Mago
- Sonho do Véu Azul — Bardo, Feiticeiro, Bruxo, Mago · Tasha
- Spray Prismático — Feiticeiro, Mago
- Teletransporte — Bardo, Feiticeiro, Mago
- Tempestade de Fogo — Clérigo, Druida, Feiticeiro
- Templo dos Deuses — Clérigo · Xanathar
- Turbilhão — Druida, Feiticeiro, Mago · Xanathar
- Viagem Planar — Clérigo, Druida, Feiticeiro, Bruxo, Mago

### 8º círculo
- Antipatia/Simpatia — Druida, Mago
- Aura Sagrada — Clérigo
- Campo Antimagia — Clérigo, Mago
- Clone — Mago
- Controlar o Clima — Clérigo, Druida, Mago
- Dominar Monstro — Bardo, Feiticeiro, Bruxo, Mago
- Dragão Ilusório — Mago · Xanathar
- Enfraquecer o Intelecto — Bardo, Druida, Bruxo, Mago
- Escuridão Enlouquecedora — Bruxo, Mago · Xanathar
- Explosão Solar — Druida, Feiticeiro, Mago
- Formas Animais — Druida
- Fortaleza Poderosa — Mago · Xanathar
- Lábia — Bardo, Bruxo
- Labirinto — Mago
- Mente em Branco — Bardo, Mago
- Murchar Horrendo de Abi-Dalzim — Feiticeiro, Mago · Xanathar
- Nuvem Incendiária — Feiticeiro, Mago
- Palavra de Poder: Atordoar — Bardo, Feiticeiro, Bruxo, Mago
- Semiplano — Bruxo, Mago
- Telepatia — Mago
- Terremoto — Clérigo, Druida, Feiticeiro
- Tsunami — Druida

### 9º círculo
- Alterar Forma — Druida, Mago
- Aprisionamento — Bruxo, Mago
- Chuva de Meteoros — Feiticeiro, Mago
- Cura Completa em Massa — Clérigo
- Desejo — Feiticeiro, Mago
- Grito Psíquico — Bardo, Feiticeiro, Bruxo, Mago · Xanathar
- Invulnerabilidade — Mago · Xanathar
- Lâmina do Desastre — Feiticeiro, Bruxo, Mago · Tasha
- Metamorfose em Massa — Bardo, Feiticeiro, Mago · Xanathar
- Metamorfose Verdadeira — Bardo, Bruxo, Mago
- Muralha Prismática — Mago
- Palavra de Poder: Curar — Bardo
- Palavra de Poder: Matar — Bardo, Feiticeiro, Bruxo, Mago
- Parar o Tempo — Feiticeiro, Mago
- Portal — Clérigo, Feiticeiro, Mago
- Presciência — Bardo, Druida, Bruxo, Mago
- Projeção Astral — Clérigo, Bruxo, Mago
- Ressurreição Verdadeira — Clérigo, Druida
- Sinistro — Mago
- Tempestade da Vingança — Druida
