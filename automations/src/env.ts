export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;

  // Service account de Google
  GOOGLE_SA_CLIENT_EMAIL: string;
  GOOGLE_SA_PRIVATE_KEY: string;
  GOOGLE_WORKSPACE_DOMAIN: string;
  GOOGLE_IMPERSONATE: string;

  // Drive
  DRIVE_ROOT_PROFESORES: string;

  // Email interno
  MENTTIO_INBOX: string;

  // Secretos compartidos
  WEBHOOK_SECRET: string;
  CRON_SECRET: string;

  // Cron -> Base44
  BASE44_FUNCTIONS_URL: string;
}
