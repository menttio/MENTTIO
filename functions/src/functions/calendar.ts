import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";
import * as db from "../lib/db";

// Integración de Google Calendar del usuario (OAuth por profesor/alumno).
// NOTA: las funciones que usan los tokens del usuario (googleOAuthCallback, getGoogleCalendarEvents,
// syncGoogleCalendar, deleteGoogleCalendarEvent) quedan pendientes — requieren manejo de tokens
// (refresh) y pruebas con un usuario conectado. Aquí van las dos sin dependencia de tokens.

// getGoogleOAuthUrl: construye la URL de consentimiento de Google.
export async function getGoogleOAuthUrl(env: Env, req: Request, body: { userType?: string; returnUrl?: string }) {
  const user = await requireUser(env, req);
  if (!env.GOOGLE_OAUTH_CLIENT_ID) throw new HttpError(503, "GOOGLE_OAUTH_CLIENT_ID no configurado");
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || "https://menttio.com/api/functions/googleOAuthCallback";
  const state = JSON.stringify({ userEmail: user.email, userType: body.userType, returnUrl: body.returnUrl || "/" });
  const scope = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&` +
    `scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&` +
    `state=${encodeURIComponent(state)}`;
  return { url };
}

// toggleGoogleCalendar: activa/desactiva la conexión de calendario del usuario (profesor o alumno).
export async function toggleGoogleCalendar(env: Env, req: Request, body: { connect?: boolean }) {
  const user = await requireUser(env, req);
  const connect = !!body.connect;
  const teachers = await db.list<any>(env, "teachers", { user_email: `eq.${user.email}` });
  if (teachers[0]) {
    await db.update(env, "teachers", { id: `eq.${teachers[0].id}` }, { google_calendar_connected: connect });
  } else {
    const students = await db.list<any>(env, "students", { user_email: `eq.${user.email}` });
    if (students[0]) await db.update(env, "students", { id: `eq.${students[0].id}` }, { google_calendar_connected: connect });
  }
  return { success: true, connected: connect };
}
