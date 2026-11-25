// Junta todo o SQL do Supabase num arquivo só (supabase/TUDO.sql), na ordem
// certa: o script base da seção 5 de docs/SUPABASE.md + os 13 arquivos.
// Tudo pode rodar de novo sem apagar dados. Rode: npm run sql:tudo
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const ORDEM = [
  ['multiplayer_session.sql', 'mesa ao vivo: sessão, encontro, iniciativa'],
  ['atualizacao_npcs_bestiario.sql', 'NPCs e bestiário da campanha'],
  ['palco.sql', 'palco: mapas, cenas, cutscenes, pistas e imagens'],
  ['mestre_console.sql', 'console do mestre'],
  ['recursos_extras.sql', 'convite por código, ficha compartilhada, registro de erros'],
  ['agenda.sql', 'agenda da campanha'],
  ['bestiario.sql', 'bestiário da mesa'],
  ['diario_privado.sql', 'diário que só o jogador lê'],
  ['mesa_vida.sql', 'PV do herói igual para mestre e jogador'],
  ['discord.sql', 'rolagens no Discord da mesa'],
  ['mesa_membros.sql', 'sair, remover e lista de jogadores'],
  ['segredos.sql', 'segredos do mapa e loot nas pistas'],
];

export function baseSql() {
  const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
  const sec5 = md.slice(md.indexOf('## 5.'));
  const start = sec5.indexOf('```sql') + 6;
  return sec5.slice(start, sec5.indexOf('```', start)).trim();
}

export function buildTudo() {
  const bar = '-- ' + '='.repeat(69);
  const parts = [
    bar,
    '-- Ficha Viva — TUDO O SQL DO SUPABASE NUM ARQUIVO SÓ',
    '-- Gerado por `npm run sql:tudo` (não edite à mão: edite os arquivos de',
    '-- supabase/ e a seção 5 de docs/SUPABASE.md e gere de novo).',
    '--',
    '-- Como usar: Supabase → SQL Editor → aba nova → cole TUDO → Run, sem nada',
    '-- selecionado. Pode rodar de novo sem apagar dados. Se o editor parar no',
    '-- meio, rode de novo: o que já foi feito é pulado.',
    bar,
    '',
    bar,
    '-- 1/13 · base: fichas, campanhas, crônica, políticas, realtime',
    bar,
    baseSql(),
    '',
  ];
  ORDEM.forEach(([file, what], i) => {
    parts.push(bar, `-- ${i + 2}/13 · supabase/${file} · ${what}`, bar, readFileSync(resolve(root, 'supabase', file), 'utf8').trim(), '');
  });
  return parts.join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(resolve(root, 'supabase/TUDO.sql'), buildTudo());
  console.log('supabase/TUDO.sql gerado.');
}
