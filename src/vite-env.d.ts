/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Versão do build (commit curto ou data) — vai nos relatórios de erro. */
  readonly VITE_APP_VERSION?: string;
  /** Data e hora (ISO) do build. */
  readonly VITE_APP_BUILT_AT?: string;
  /** Versão de lançamento (package.json): a que o CHANGELOG.md descreve. */
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
