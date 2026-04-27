/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional alias; same n8n URL as VITE_N8N_PARSE_WEBHOOK_URL. */
  readonly VITE_PARSE_API_URL?: string;
  readonly VITE_N8N_PARSE_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
