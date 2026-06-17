import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";

// Proxies de los avisos del frontend hacia el Worker de automations (que ya hace el trabajo:
// Supabase/Gmail/Drive). Replican el transform de las funciones notify* de Base44.

export function splitName(full = "") {
  const parts = String(full).trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

// Offset de Europe/Madrid (1=CET, 2=CEST) para una fecha dada -> ISO con offset correcto.
export function madridIso(date: string, time: string): string {
  const probe = new Date(`${date}T12:00:00Z`);
  const s = probe.toLocaleString("en-US", { timeZone: "Europe/Madrid", timeZoneName: "shortOffset" });
  const m = s.match(/GMT([+-]\d+)/);
  const off = m ? parseInt(m[1], 10) : 1;
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.abs(off)).padStart(2, "0");
  return `${date}T${time}:00.000${sign}${hh}:00`;
}

async function proxy(env: Env, route: string, body: unknown) {
  if (!env.AUTOMATIONS_URL || !env.WEBHOOK_SECRET) throw new HttpError(500, "AUTOMATIONS_URL/WEBHOOK_SECRET no configurados");
  const res = await fetch(`${env.AUTOMATIONS_URL}/${route}?key=${env.WEBHOOK_SECRET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(502, `${route} falló (${res.status})`);
  return { success: true };
}

export function bookingPayload(b: any) {
  const s = splitName(b.student_name);
  const t = splitName(b.teacher_name);
  return {
    student_id: b.student_id,
    student_first_name: s.first,
    student_last_name: s.last,
    student_phone: b.student_phone || "",
    student_email: b.student_email,
    subject: b.subject_name,
    price: b.price,
    teacher_first_name: t.first,
    teacher_last_name: t.last,
    teacher_email: b.teacher_email,
    teacher_phone: b.teacher_phone || "",
    class_start_datetime: madridIso(b.date, b.start_time),
    booking_id: b.booking_id,
  };
}

// notifyN8N / notifyN8NBulk: reserva nueva/modificada/cancelada según status.
export async function notifyN8N(env: Env, req: Request, body: { bookingData?: any }) {
  await requireUser(env, req);
  const b = body.bookingData || {};
  const route = b.status === "cancelled" ? "reserva/cancelada"
    : b.status === "modified" ? "reserva/modificada" : "reserva";
  return proxy(env, route, bookingPayload(b));
}
export const notifyN8NBulk = notifyN8N;

// notifyFileUpload: subida de archivos -> /subir-archivos.
export async function notifyFileUpload(env: Env, req: Request, body: { bookingData?: any }) {
  await requireUser(env, req);
  const b = body.bookingData || {};
  const s = splitName(b.student_name);
  const t = splitName(b.teacher_name);
  return proxy(env, "subir-archivos", {
    student_first_name: s.first, student_last_name: s.last, student_id: b.student_id, student_email: b.student_email,
    teacher_first_name: t.first, teacher_last_name: t.last, teacher_id: b.teacher_id, teacher_email: b.teacher_email,
    booking_id: b.booking_id, status: b.status, subject_name: b.subject_name, date: b.date,
    files: b.uploaded_files || [],
  });
}

// notifyClassPaid: clase pagada -> /clase-pagada.
export async function notifyClassPaid(env: Env, req: Request, body: { id?: string; clase_id?: string }) {
  await requireUser(env, req);
  return proxy(env, "clase-pagada", { clase_id: body.clase_id || body.id });
}

// notifyNuevoAlumno / notifyNuevoProfesor: avisos internos.
export async function notifyNuevoAlumno(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  return proxy(env, "nuevo-alumno", body);
}
export async function notifyNuevoProfesor(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  return proxy(env, "nuevo-profesor", body);
}
