import { RACES, getSubraces } from '@/data/races';
import { CLASSES } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { BACKGROUNDS } from '@/data/backgrounds';
import { SKILLS, ABILITY_SHORT } from '@/data/skills';
import { FEATS } from '@/data/feats';
import { SPELLS } from '@/data/spells';
import { LANGUAGE_OPTIONS } from '@/data/classChoices';
import { asiLevelsFor } from '@/data/classFeatures';
import { subclassLevelFor } from '@/engine/levelUp';
import { cantripsKnown, spellsKnownOrPrepared } from '@/engine/spellcasting';
import { ALIGNMENTS, SIMPLE_FORMAT } from '@/engine/simpleSheet';
import type { SimpleSheet } from '@/engine/simpleSheet';

/**
 * Guia "Criar com o ChatGPT" (docs/CRIAR-COM-CHATGPT.md), montado a partir
 * dos dados do app para nunca ficar desatualizado. Regerar:
 *   npm run docs:chatgpt
 * (o teste chatgptGuide.test.ts falha se o arquivo divergir do gerado).
 */

/** Exemplo completo — o teste garante que ele importa sem nenhum aviso. */
export const GUIDE_EXAMPLE: SimpleSheet = {
  formato: SIMPLE_FORMAT,
  nome: 'Lyra Ventobranco',
  genero: 'fem',
  idade: 112,
  conceito: 'Arquivista élfica que estuda magia proibida para proteger a cidade',
  tendencia: 'Neutro e Bom',
  raca: 'Elfo',
  subraca: 'Alto Elfo',
  classe: 'Mago',
  subclasse: 'Escola de Evocação',
  nivel: 2,
  antecedente: 'Sábio',
  atributos: { for: 8, des: 14, con: 13, int: 15, sab: 12, car: 10 },
  pericias: ['Investigação', 'Intuição'],
  especializacoes: [],
  idiomas: ['Dracônico', 'Celestial', 'Anão'],
  talentos: [],
  aumentosDeAtributo: {},
  magias: ['Raio de Fogo', 'Mãos Mágicas', 'Prestidigitação', 'Mísseis Mágicos', 'Escudo Arcano', 'Armadura Arcana', 'Sono', 'Detectar Magia'],
  grimorio: ['Mísseis Mágicos', 'Escudo Arcano', 'Armadura Arcana', 'Sono', 'Detectar Magia', 'Mãos Flamejantes', 'Convocar Familiar', 'Identificação'],
  aparencia: 'Alta, cabelo prateado preso em trança, olhos cor de âmbar, manto azul com runas bordadas.',
  personalidade: 'Fala baixo e anota tudo; não resiste a um livro trancado.',
  ideais: 'Conhecimento: a verdade deve ser preservada, mesmo a perigosa.',
  vinculos: 'A biblioteca de Vaelor, onde foi criada pelos arquivistas.',
  defeitos: 'Esconde o que descobre até ter certeza — às vezes tarde demais.',
  historia: 'Encontrou um grimório selado com o brasão da própria família e partiu para descobrir por que ele foi escondido.',
};

const list = (xs: string[]) => xs.join(', ');
const ord = (n: number) => `${n}º`;
const SOURCE_NOTE: Record<string, string> = { XGE: ' · Xanathar', TCE: ' · Tasha' };
const CASTERS = CLASSES.filter((c) => c.spellcasting);

function racesSection(): string {
  const rows = RACES.map((r) => {
    const subs = getSubraces(r.id);
    const choice = r.abilityChoice
      ? ` — os ${r.abilityChoice.count} atributos à escolha${r.abilityChoice.exclude?.length ? ` (não ${r.abilityChoice.exclude.map((k) => ABILITY_SHORT[k]).join('/')})` : ''} vão em \`bonusRacialEscolhido\``
      : '';
    const subTxt = subs.length ? subs.map((s) => `${s.label}${s.bonus ? ` (${s.bonus})` : ''}`).join(' · ') : '—';
    return `| ${r.label} | ${r.bonus}${choice} | ${subTxt} | ${list(r.languages ?? [])} |`;
  });
  return ['| Raça | Bônus | Sub-raça (obrigatória se houver) | Idiomas |', '|---|---|---|---|', ...rows].join('\n');
}

function classesSection(): string {
  return CLASSES.map((c) => {
    const subs = subclassesFor(c.id).map((s) => s.label);
    const skills = c.skillChoices.length >= SKILLS.length ? 'quaisquer' : list(c.skillChoices.map((k) => SKILLS.find((s) => s.key === k)!.label));
    const lines = [
      `### ${c.label}`,
      `- Dado de vida ${c.die} · atributo principal ${ABILITY_SHORT[c.prim]} · resistências ${c.savingThrows.map((k) => ABILITY_SHORT[k]).join(' e ')}`,
      `- Perícias: escolha **${c.skillPicks}** entre ${skills}`,
      `- Subclasse no nível ${subclassLevelFor(c.id)}: ${list(subs)}`,
      `- Aumento de atributo/talento nos níveis ${list(asiLevelsFor(c.id).map(String))}`,
    ];
    if (c.spellcasting) {
      const known = (lv: number) => spellsKnownOrPrepared(c.id, lv, 3);
      const k1 = known(1);
      const cantrips = cantripsKnown(c.id, 1);
      lines.push(
        `- Magias: ${cantrips ? `${cantrips} truques no nível 1 (${cantripsKnown(c.id, 4)} no 4, ${cantripsKnown(c.id, 10)} no 10)` : 'sem truques'}; ` +
          (k1.label === 'preparadas'
            ? `prepara **modificador de conjuração + ${c.id === 'paladin' ? 'metade do nível' : 'nível'}** (mín. 1)`
            : k1.label === 'no grimório'
              ? `grimório com **6 magias de 1º círculo + 2 por nível** (\`grimorio\`); prepara INT + nível delas (\`magias\`)`
              : `conhece **${[1, 2, 3, 5, 10].map((lv) => `${known(lv).count} no nível ${lv}`).join(', ')}**`),
      );
    }
    return lines.join('\n');
  }).join('\n\n');
}

function backgroundsSection(): string {
  const rows = BACKGROUNDS.map((b) => `| ${b.label} | ${list(b.skills.map((k) => SKILLS.find((s) => s.key === k)!.label))} | ${b.languagesCount ?? 0} |`);
  return ['| Antecedente | Perícias que já dá | Idiomas à escolha |', '|---|---|---|', ...rows].join('\n');
}

function featsSection(): string {
  return FEATS.map((f) => `- **${f.label}**${f.prereq ? ` (pré-requisito: ${f.prereq})` : ''}${SOURCE_NOTE[f.source] ?? ''}`).join('\n');
}

function spellsSection(): string {
  const out: string[] = [];
  for (let lv = 0; lv <= 9; lv++) {
    const at = SPELLS.filter((s) => s.level === lv).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!at.length) continue;
    out.push(`### ${lv === 0 ? 'Truques' : `${ord(lv)} círculo`}`);
    for (const s of at) {
      const classes = s.classes ? CASTERS.filter((c) => s.classes!.includes(c.id as never)).map((c) => c.label) : ['todas'];
      out.push(`- ${s.name} — ${list(classes)}${SOURCE_NOTE[s.source ?? ''] ?? ''}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

const INSTRUCTIONS = `Você é o assistente de criação de personagens do app **Ficha Viva** (D&D 5e, regras de 2014, Livro do Jogador; Xanathar e Tasha só se eu pedir).
Quando eu descrever um personagem, faça perguntas só se faltar algo essencial e então responda **apenas com um bloco JSON** no formato abaixo — sem texto antes ou depois.

Regras:
1. \`"formato"\` é sempre \`"${SIMPLE_FORMAT}"\`.
2. Use **exatamente** os nomes das listas deste guia (raça, sub-raça, classe, subclasse, antecedente, perícias, idiomas, talentos, magias, tendência).
3. \`atributos\` são os valores **base, antes do bônus racial** (o app soma o bônus). Use a **compra de pontos (27 pontos, valores de 8 a 15)** ou o **conjunto padrão 15, 14, 13, 12, 10, 8** — só passe de 15 se eu disser que rolei os dados.
4. \`pericias\`: **só as que a classe escolhe** (e as extras da raça, como as 2 do Meio-Elfo). As do antecedente e as fixas da raça entram sozinhas — não repita.
5. \`idiomas\`: **só os idiomas à escolha** (raça/sub-raça "1 idioma à escolha" + os do antecedente). Comum e os fixos da raça entram sozinhos.
6. \`subclasse\`: só se o nível já chegou no nível da subclasse da classe; senão \`null\`.
7. Nos níveis de aumento (4, 8, 12…), cada um vale **+2 em atributos** (\`aumentosDeAtributo\`, ex.: \`{"des": 2}\` ou \`{"des": 1, "con": 1}\`) **ou 1 talento** (\`talentos\`). A soma tem que fechar com o nível.
8. \`magias\`: truques + magias que o herói conhece (Bardo, Feiticeiro, Bruxo, Patrulheiro) ou prepara (Clérigo, Druida, Paladino, Mago), respeitando as quantidades da classe e o círculo máximo do nível. Mago também preenche \`grimorio\`. Classe sem magia: \`[]\`.
9. \`especializacoes\`: só Ladino (2 no nível 1, +2 no 6) e Bardo (2 no nível 3, +2 no 10), escolhidas entre as perícias que o herói já tem.
10. Equipamento, PV, CA, espaços de magia e recursos de classe **não vão no JSON** — o app calcula com as regras da criação.
11. Textos (\`aparencia\`, \`personalidade\`, \`ideais\`, \`vinculos\`, \`defeitos\`, \`historia\`) em português, curtos e no tom do personagem.`;

const FIELDS = `| Campo | Tipo | O que vai |
|---|---|---|
| \`formato\` | texto | sempre \`"${SIMPLE_FORMAT}"\` |
| \`nome\` | texto | nome do herói |
| \`genero\` | \`"masc"\` ou \`"fem"\` | define as palavras da ficha (ex.: "o herói"/"a heroína") |
| \`idade\` | número ou texto | |
| \`conceito\` | texto | uma frase que resume o personagem |
| \`tendencia\` | texto | uma das tendências da lista |
| \`raca\` / \`subraca\` | texto | da tabela de raças; \`subraca\` = \`null\` se a raça não tem |
| \`bonusRacialEscolhido\` | lista | só Meio-Elfo: 2 atributos (\`"for"\`, \`"des"\`, \`"con"\`, \`"int"\`, \`"sab"\`) |
| \`classe\` / \`subclasse\` | texto | da lista de classes; \`subclasse\` = \`null\` antes do nível dela |
| \`nivel\` | número | 1 a 20 |
| \`antecedente\` | texto | da tabela de antecedentes |
| \`atributos\` | objeto | \`for\`, \`des\`, \`con\`, \`int\`, \`sab\`, \`car\` — valores BASE |
| \`aumentosDeAtributo\` | objeto | pontos dos níveis de aumento, ex.: \`{"des": 2}\` |
| \`talentos\` | lista | nomes da lista de talentos |
| \`pericias\` | lista | só as escolhidas da classe (+ extras da raça) |
| \`especializacoes\` | lista | Ladino/Bardo |
| \`idiomas\` | lista | só os à escolha |
| \`magias\` | lista | truques + magias conhecidas/preparadas |
| \`grimorio\` | lista | só Mago |
| \`aparencia\`, \`personalidade\`, \`ideais\`, \`vinculos\`, \`defeitos\`, \`historia\` | texto | vão para as Notas da ficha |`;

export function buildChatGptGuide(): string {
  return `<!-- Gerado por src/lib/chatgptGuide.ts — não edite à mão: rode \`npm run docs:chatgpt\`. -->
# Criar personagem com o ChatGPT

Use este guia para o ChatGPT montar um herói **pronto para importar** no Ficha Viva.

## Como usar

1. No ChatGPT, crie um **Projeto** (ou um GPT personalizado) e cole **este arquivo inteiro** nas instruções — ou anexe o arquivo \`.md\`.
2. Peça o personagem: *"Crie uma clériga anã nível 3, devota de Moradin, protetora da família"*.
3. Copie a resposta (pode ser a resposta inteira) e no app vá em **Heróis → Colar ficha (ChatGPT)** → cole → **Importar herói**.
   Também dá para salvar como \`.json\` e usar **Importar personagem (JSON)**.
4. O app monta a ficha com as **mesmas regras da criação** (equipamento inicial, perícias do antecedente, PV cheio, espaços de magia, recursos) e mostra uma lista do que ajustou, se algo fugiu da regra.

## Instruções para o ChatGPT

${INSTRUCTIONS}

## Formato

${FIELDS}

## Exemplo completo

\`\`\`json
${JSON.stringify(GUIDE_EXAMPLE, null, 2)}
\`\`\`

## Tendências

${list(ALIGNMENTS)}

## Raças

${racesSection()}

## Classes

${classesSection()}

## Antecedentes

${backgroundsSection()}

## Perícias

${SKILLS.map((s) => `${s.label} (${ABILITY_SHORT[s.ability]})`).join(' · ')}

## Idiomas

${LANGUAGE_OPTIONS.map((l) => `${l.label} (${l.tag})`).join(' · ')}

## Talentos

${featsSection()}

## Magias

Cada magia mostra as classes que podem aprendê-la. "Xanathar"/"Tasha" = só com o pacote do livro ligado no app.

${spellsSection()}
`;
}
