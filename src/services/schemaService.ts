import { getSupabase } from './supabaseClient';

/**
 * Versão do banco: cada script SQL registra em `app_schema_steps` que rodou.
 * O app compara com a lista abaixo e diz ao mestre exatamente qual arquivo
 * falta — em vez de um erro confuso no meio da sessão.
 */
export interface SchemaStep {
  step: string;
  file: string;
  /** O que o script liga (para o mestre saber por que rodar). */
  what: string;
}

export const SCHEMA_STEPS: SchemaStep[] = [
  { step: 'base', file: 'docs/SUPABASE.md (seção 5)', what: 'fichas na nuvem, campanhas e convites' },
  { step: 'multiplayer', file: 'supabase/multiplayer_session.sql', what: 'mesa ao vivo: sessão, iniciativa e rolagens' },
  { step: 'npcs_bestiario', file: 'supabase/atualizacao_npcs_bestiario.sql', what: 'NPCs da campanha e criaturas no encontro' },
  { step: 'palco', file: 'supabase/palco.sql', what: 'palco: mapas, cenas, peões e handouts' },
  { step: 'mestre_console', file: 'supabase/mestre_console.sql', what: 'console do mestre: preparação e notas privadas' },
  { step: 'agenda', file: 'supabase/agenda.sql', what: 'agenda: marcar a próxima sessão e confirmar presença' },
  { step: 'bestiario', file: 'supabase/bestiario.sql', what: 'bestiário da mesa: foto, nome e notas das criaturas' },
  { step: 'recursos_extras', file: 'supabase/recursos_extras.sql', what: 'convite por código/QR, ficha compartilhada e registro de erros' },
  { step: 'diario_privado', file: 'supabase/diario_privado.sql', what: 'diário privado: só o jogador lê (nem o mestre nem o link), imagens das pistas na nuvem' },
];

export interface SchemaStatus {
  /** false = banco antigo, sem o registro de versão (só o recursos_extras cria). */
  known: boolean;
  missing: SchemaStep[];
}

let cache: Promise<SchemaStatus> | null = null;

async function load(): Promise<SchemaStatus> {
  const sb = getSupabase();
  if (!sb) return { known: false, missing: [] };
  const { data, error } = await sb.from('app_schema_steps').select('step');
  // tabela ainda não existe: o recursos_extras a cria e reconhece sozinho o resto
  if (error || !Array.isArray(data)) return { known: false, missing: SCHEMA_STEPS.filter((s) => s.step === 'recursos_extras') };
  const have = new Set(data.map((r: { step: string }) => r.step));
  return { known: true, missing: SCHEMA_STEPS.filter((s) => !have.has(s.step)) };
}

export const schemaService = {
  /** Uma consulta por visita (cacheada); `fresh` refaz — "já rodei, verificar". */
  status(fresh = false): Promise<SchemaStatus> {
    if (!cache || fresh) cache = load().catch(() => ({ known: false, missing: [] }));
    return cache;
  },
  /** O banco tem este passo? (desconhecido conta como "talvez": tenta e trata o erro) */
  async has(step: string): Promise<boolean> {
    const s = await this.status();
    return !s.missing.some((m) => m.step === step);
  },
};
