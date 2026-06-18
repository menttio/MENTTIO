import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";
import * as db from "../lib/db";

// Integración de Google Calendar del usuario (OAuth por profesor/alumno).

// ---- Helpers de tokens ----
async function refreshAccessToken(env: Env, tokens: any): Promise<string | undefined> {
  if (!tokens?.refresh_token) return tokens?.access_token;
  if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60000) return tokens.access_token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return tokens.access_token;
  return (await res.json() as any).access_token;
}

async function getProfile(env: Env, userType: string, email: string) {
  const table = userType === "teacher" ? "teachers" : "students";
  const rows = await db.list<any>(env, table, { user_email: `eq.${email}` });
  return { table, profile: rows[0] || null };
}

// ---- getGoogleOAuthUrl: URL de consentimiento ----
export async function getGoogleOAuthUrl(env: Env, req: Request, body: { userType?: string; returnUrl?: string }) {
  const user = await requireUser(env, req);
  if (!env.GOOGLE_OAUTH_CLIENT_ID) throw new HttpError(503, "GOOGLE_OAUTH_CLIENT_ID no configurado");
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || "https://menttio.com/api/functions/googleOAuthCallback";
  const state = JSON.stringify({ userEmail: user.email, userType: body.userType, returnUrl: body.returnUrl || "/" });
  const scope = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  return { url };
}

// ---- toggleGoogleCalendar: flag de conexión ----
export async function toggleGoogleCalendar(env: Env, req: Request, body: { connect?: boolean }) {
  const user = await requireUser(env, req);
  const connect = !!body.connect;
  const t = await getProfile(env, "teacher", user.email!);
  if (t.profile) {
    await db.update(env, "teachers", { id: `eq.${t.profile.id}` }, { google_calendar_connected: connect });
  } else {
    const s = await getProfile(env, "student", user.email!);
    if (s.profile) await db.update(env, "students", { id: `eq.${s.profile.id}` }, { google_calendar_connected: connect });
  }
  return { success: true, connected: connect };
}

// ---- getGoogleCalendarEvents: lista eventos del calendario del usuario ----
export async function getGoogleCalendarEvents(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  const { startDate, endDate, userType, userEmail } = body;
  const { profile } = await getProfile(env, userType, userEmail);
  if (!profile?.google_calendar_tokens) return { events: [] };
  const accessToken = await refreshAccessToken(env, profile.google_calendar_tokens);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", `${startDate}T00:00:00Z`);
  url.searchParams.set("timeMax", `${endDate}T23:59:59Z`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { events: [] };
  const data = await res.json() as any;
  const events = (data.items || []).map((e: any) => {
    const start = e.start.dateTime || e.start.date;
    const end = e.end.dateTime || e.end.date;
    return { id: e.id, summary: e.summary, start, end, date: start.split("T")[0],
      startTime: start.split("T")[1]?.substring(0, 5), endTime: end.split("T")[1]?.substring(0, 5) };
  });
  return { events };
}

// ---- syncGoogleCalendar: crea/actualiza el evento de una reserva en el calendario del usuario ----
export async function syncGoogleCalendar(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  const { bookingId, userType, userEmail, date, start_time, end_time } = body;
  if (!bookingId || !userType || !userEmail) throw new HttpError(400, "Faltan bookingId, userType, userEmail");

  const bookings = await db.list<any>(env, "bookings", { id: `eq.${bookingId}` });
  const bDb = bookings[0];
  if (!bDb) throw new HttpError(404, "Booking not found");
  const booking = { ...bDb, ...(date && { date }), ...(start_time && { start_time }), ...(end_time && { end_time }) };

  const { profile } = await getProfile(env, userType, userEmail);
  if (!profile?.google_calendar_connected || !profile?.google_calendar_tokens) {
    return { success: false, message: "Google Calendar not connected for this user" };
  }
  const accessToken = await refreshAccessToken(env, profile.google_calendar_tokens);

  const isGroup = booking.class_type === "group";
  const title = isGroup ? `Clase grupal de ${booking.subject_name}`
    : userType === "teacher" ? `Clase de ${booking.subject_name} con ${booking.student_name}`
    : `Clase de ${booking.subject_name} con ${booking.teacher_name}`;
  let description = isGroup ? `Clase grupal de ${booking.subject_name} (${booking.enrolled_students?.length || 1} alumno(s))\n\nID reserva: ${booking.id}`
    : userType === "teacher" ? `Clase con ${booking.student_name}\n\nID reserva: ${booking.id}`
    : `Clase con ${booking.teacher_name}\n\nID reserva: ${booking.id}`;
  if (booking.meet_link) description += `\n\nGoogle Meet: ${booking.meet_link}`;

  const event = {
    summary: title, description,
    start: { dateTime: `${booking.date}T${booking.start_time}:00`, timeZone: "Europe/Madrid" },
    end: { dateTime: `${booking.date}T${booking.end_time}:00`, timeZone: "Europe/Madrid" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }, { method: "email", minutes: 1440 }] },
  };

  const existingId = booking[`google_event_id_${userType}`];
  const calUrl = existingId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingId}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const res = await fetch(calUrl, {
    method: existingId ? "PUT" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new HttpError(502, `Google Calendar API (${res.status}): ${(await res.text()).slice(0, 160)}`);
  const created = await res.json() as any;
  if (!existingId && created.id) {
    await db.update(env, "bookings", { id: `eq.${booking.id}` }, { [`google_event_id_${userType}`]: created.id });
  }
  return { success: true, eventId: created.id };
}

// ---- deleteGoogleCalendarEvent: borra el evento de una reserva ----
export async function deleteGoogleCalendarEvent(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  const { bookingId, userType, userEmail, eventId: directEventId } = body;
  if (!userType || !userEmail) throw new HttpError(400, "Missing userType or userEmail");
  const { profile } = await getProfile(env, userType, userEmail);
  if (!profile?.google_calendar_tokens) return { success: false, message: "Google Calendar not connected" };
  const accessToken = await refreshAccessToken(env, profile.google_calendar_tokens);

  let eventId = directEventId;
  if (!eventId && bookingId) {
    const bookings = await db.list<any>(env, "bookings", { id: `eq.${bookingId}` });
    eventId = bookings[0]?.[`google_event_id_${userType}`];
  }
  if (!eventId) return { success: false, message: "No Google Calendar event ID found" };

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410/404 = ya borrado; lo tratamos como éxito.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    return { success: false, message: `Google Calendar API ${res.status}` };
  }
  return { success: true };
}

// ---- googleOAuthCallback: GET (Google redirige aquí). Intercambia code->tokens y redirige a la app. ----
export async function googleOAuthCallback(env: Env, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const appBase = env.APP_BASE_URL || "https://menttio.com";
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  let state: any = {};
  try { state = stateRaw ? JSON.parse(decodeURIComponent(stateRaw)) : {}; } catch { /* ignore */ }
  const returnUrl = state.returnUrl || "/";
  const redir = (qs: string) => Response.redirect(`${appBase}${returnUrl}?${qs}`, 302);

  if (errorParam) return redir(`calendar_error=google_denied&detail=${encodeURIComponent(errorParam)}`);
  if (!code) return redir("calendar_error=no_code");
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || "https://menttio.com/api/functions/googleOAuthCallback";

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_OAUTH_CLIENT_ID || "", client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      redirect_uri: redirectUri, grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return redir(`calendar_error=token_exchange_failed&detail=${encodeURIComponent(t.slice(0, 150))}`);
  }
  const tokens = await tokenRes.json() as any;
  const withExpiry = { ...tokens, expiry_date: Date.now() + (tokens.expires_in * 1000) };
  // Se pasan al frontend (que los guarda con la sesión del propio usuario en su Teacher/Student).
  return redir(`calendar_pending=true&cal_tokens=${encodeURIComponent(JSON.stringify(withExpiry))}&cal_user_type=${encodeURIComponent(state.userType || "")}`);
}
