import { type Env } from "../env";
import { requireCronOrAdmin } from "../lib/auth";
import * as db from "../lib/db";

// Base44: markCompletedClasses (cron) -> marca como 'completed' las clases programadas cuya hora
// de fin ya pasó, y crea una notificación si el pago está pendiente. En Nivel B opera sobre Supabase.
// (El push notification se añadirá con las claves VAPID — Fase 3 grupo D.)
export async function markCompletedClasses(env: Env, req: Request) {
  await requireCronOrAdmin(env, req);
  const now = Date.now();

  const scheduled = await db.list<any>(env, "bookings", { status: "eq.scheduled" });
  let updated = 0;

  for (const b of scheduled) {
    if (!b.date || !b.end_time) continue;
    const end = new Date(`${b.date}T${b.end_time}`).getTime();
    if (Number.isNaN(end) || end >= now) continue;

    await db.update(env, "bookings", { id: `eq.${b.id}` }, { status: "completed" });
    updated++;

    if (b.payment_status === "pending" && b.student_id) {
      try {
        await db.insert(env, "notifications", {
          user_id: b.student_id,
          user_email: b.student_email,
          type: "booking_new",
          title: "Clase completada - Pago pendiente",
          message: `Tu clase de ${b.subject_name} con ${b.teacher_name} ha finalizado. Por favor, procede con el pago.`,
          related_id: b.id,
          link_page: "MyClasses",
        });
      } catch (e) { console.error("notificación:", e); }
    }
  }
  return { success: true, message: `${updated} clases marcadas como completadas` };
}
