import type { Env } from "./env";
import * as db from "./lib/supabase";
import * as sheets from "./lib/sheets";
import { getAccessToken, SCOPES } from "./lib/google-auth";
import { sendEmail } from "./lib/gmail";
import { normalizeText } from "./lib/util";
import * as tpl from "./templates";

// Porta el workflow n8n "Creacion videollamada + pizarra". Cron del Worker:
//  A) clases que empiezan pronto y sin Meet -> crea evento Calendar+Meet, guarda link, emails.
//  B) clases ya terminadas sin grabación -> busca el archivo en Drive y escribe el link.
const CALENDAR = "academia@menttio.com"; // calendario donde se crean las videollamadas
const REC_FOLDER = "1HQc4hFsrXXuoPnCu_meG54nIzOHMK2eO"; // carpeta Drive "Meet Recordings" (de menttio@)

interface Booking {
  booking_id: string;
  student_id: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  student_email: string | null;
  subject_name: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
  teacher_email: string | null;
  start_datetime: string | null;
  meet_link: string | null;
  recording_url: string | null;
}

export async function runVideollamadas(env: Env): Promise<Record<string, unknown>> {
  const now = new Date();
  const result = { creadas: 0, grabaciones: 0, errores: [] as string[] };

  // ---------- PARTE A: crear videollamadas para clases que empiezan en <= 60 min ----------
  const inOneHour = new Date(now.getTime() + 60 * 60000).toISOString();
  let upcoming: Booking[] = [];
  try {
    upcoming = await db.select<Booking>(env, "bookings_ledger", {}, {
      and: `(status.in.(scheduled,modified),meet_link.is.null,start_datetime.gte.${now.toISOString()},start_datetime.lte.${inOneHour})`,
    });
  } catch (e) { result.errores.push(`select upcoming: ${(e as Error).message}`); }

  for (const b of upcoming) {
    try {
      await crearVideollamada(env, b);
      result.creadas++;
    } catch (e) { result.errores.push(`videollamada ${b.booking_id}: ${(e as Error).message}`); }
  }

  // ---------- PARTE B: recuperar grabación de clases terminadas (hace >2h, < 3 días) ----------
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60000).toISOString();
  let finished: Booking[] = [];
  try {
    finished = await db.select<Booking>(env, "bookings_ledger", {}, {
      and: `(meet_link.not.is.null,recording_url.is.null,start_datetime.lt.${twoHoursAgo},start_datetime.gt.${threeDaysAgo})`,
    });
  } catch (e) { result.errores.push(`select finished: ${(e as Error).message}`); }

  for (const b of finished) {
    try {
      const ok = await recuperarGrabacion(env, b);
      if (ok) result.grabaciones++;
    } catch (e) { result.errores.push(`grabacion ${b.booking_id}: ${(e as Error).message}`); }
  }

  return result;
}

function teacherName(b: Booking): string {
  return `${b.teacher_first_name ?? ""} ${b.teacher_last_name ?? ""}`.trim();
}

async function crearVideollamada(env: Env, b: Booking): Promise<void> {
  const token = await getAccessToken(env, SCOPES.calendar, CALENDAR);
  const startISO = b.start_datetime!;
  const endISO = new Date(new Date(startISO).getTime() + 60 * 60000).toISOString();

  // Título que termina en _{bk_id}: la grabación de Meet hereda este nombre y así luego
  // se empareja con la reserva por el bk_id (igual que en n8n).
  const titulo = [
    normalizeText(b.subject_name ?? ""),
    `${normalizeText(b.student_first_name ?? "")}${normalizeText(b.student_last_name ?? "")}`,
    teacherName(b),
    startISO.replace(/:/g, "-"),
    b.booking_id,
  ].join("_");

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: titulo,
        start: { dateTime: startISO },
        end: { dateTime: endISO },
        conferenceData: { createRequest: { requestId: `mnt-${b.booking_id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      }),
    },
  );
  const ev = (await res.json()) as any;
  if (!res.ok) throw new Error(`Calendar (${res.status}): ${JSON.stringify(ev.error?.message ?? ev).slice(0, 160)}`);
  const meet: string = ev.conferenceData?.entryPoints?.[0]?.uri ?? ev.hangoutLink ?? "";
  if (!meet) throw new Error("evento creado pero sin enlace Meet");

  // Guardar el link: en Supabase (control de duplicados) y en la entidad Booking de Base44.
  await db.update(env, "bookings_ledger", { booking_id: `eq.${b.booking_id}` }, { meet_link: meet });
  if (env.BASE44_FUNCTIONS_URL) {
    try {
      await fetch(`${env.BASE44_FUNCTIONS_URL}/setMeetLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: b.booking_id, meet_link: meet }),
      });
    } catch (e) { console.error(`setMeetLink ${b.booking_id}:`, e); }
  }

  // Emails: al alumno (simple) y al profesor (premium con recordatorio de grabar si es @menttio.com).
  const esPremium = (b.teacher_email ?? "").toLowerCase().endsWith("@menttio.com");
  if (b.student_email) {
    const e = tpl.videollamadaAviso({ link: meet, avisoGrabar: false });
    await sendEmail(env, { to: b.student_email, subject: e.subject, html: e.html });
  }
  if (b.teacher_email) {
    const e = tpl.videollamadaAviso({ link: meet, avisoGrabar: esPremium });
    await sendEmail(env, { to: b.teacher_email, subject: e.subject, html: e.html });
  }
}

async function recuperarGrabacion(env: Env, b: Booking): Promise<boolean> {
  const token = await getAccessToken(env, SCOPES.drive); // impersona menttio@menttio.com
  // La grabación de Meet se llama "...._{bk_id} - <fecha> - Recording": buscar por el bk_id.
  const q = `'${REC_FOLDER}' in parents and trashed=false and name contains '${b.booking_id}'`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`Drive (${res.status}): ${JSON.stringify(data.error?.message ?? data).slice(0, 160)}`);
  const file = (data.files ?? [])[0];
  if (!file) return false; // todavía no está la grabación; se reintenta en el próximo tick

  const fileId: string = file.id;
  // Guardar en Supabase (control) y en la hoja GRABACIONES col F (lo que lee getRecordingLink).
  await db.update(env, "bookings_ledger", { booking_id: `eq.${b.booking_id}` }, { recording_url: fileId });
  try {
    const row = await sheets.findRowNumber(env, sheets.SHEET_GRABACIONES, sheets.SHEET_GRABACIONES.keyCol, b.booking_id);
    if (row > 0) await sheets.updateCell(env, sheets.SHEET_GRABACIONES, row, 5, fileId); // col F = Id archivo Drive
  } catch (e) { console.error(`hoja grabacion ${b.booking_id}:`, e); }
  return true;
}
