import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";
import * as db from "../lib/db";

// Base44: getRecordingLink -> enlace de la grabación de una clase.
// En Nivel B la grabación vive en bookings.recording_url (Supabase), no en la hoja de Sheets.
export async function getRecordingLink(env: Env, req: Request, body: { booking_id?: string }) {
  await requireUser(env, req);
  if (!body.booking_id) throw new HttpError(400, "booking_id es requerido");

  const rows = await db.list<{ recording_url: string | null }>(
    env, "bookings",
    { id: `eq.${body.booking_id}` },
    { select: "recording_url" },
  );
  const raw = rows[0]?.recording_url;
  if (!raw) return { recording_url: null };

  // Acepta tanto un id de Drive como una URL completa.
  let recordingUrl = raw.trim();
  if (recordingUrl.includes("drive.google.com")) {
    const m = recordingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) recordingUrl = `https://drive.google.com/file/d/${m[1]}/view`;
  } else {
    recordingUrl = `https://drive.google.com/file/d/${recordingUrl}/view`;
  }
  return { recording_url: recordingUrl };
}
