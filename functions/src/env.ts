// Variables/secretos del Worker de funciones (menttio-functions).
export interface Env {
  // Datos
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  // Google service account (Gmail/Drive/Admin) — reutilizado del Worker de automations.
  GOOGLE_SA_CLIENT_EMAIL: string;
  GOOGLE_SA_PRIVATE_KEY: string;
  GOOGLE_WORKSPACE_DOMAIN: string;
  GOOGLE_IMPERSONATE: string;
  MENTTIO_INBOX: string;
  // Pendientes de aportar (grupos B–E): se añaden cuando lleguen las claves.
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  // Worker de automations (reutiliza /registrar-profesor, /nuevo-profesor, /eliminar-profesor).
  AUTOMATIONS_URL?: string;
  WEBHOOK_SECRET?: string;
  // Secreto para invocar funciones cron (markCompletedClasses, cleanupUnpaidPremium) por schedule.
  CRON_SECRET?: string;
  // CORS: origen permitido del frontend (Cloudflare Pages / menttio.com).
  ALLOWED_ORIGIN?: string;
}

// Error con código HTTP para respuestas limpias.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
