import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";
import * as db from "../lib/db";

// Base44: setMeetLink -> guarda el enlace de Meet en la reserva.
export async function setMeetLink(env: Env, req: Request, body: { booking_id?: string; meet_link?: string }) {
  await requireUser(env, req);
  if (!body.booking_id || !body.meet_link) {
    throw new HttpError(400, "Faltan campos requeridos: booking_id y meet_link");
  }
  await db.update(env, "bookings", { id: `eq.${body.booking_id}` }, { meet_link: body.meet_link });
  return { success: true, booking_id: body.booking_id };
}
