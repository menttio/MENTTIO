import type { Env } from "./env";
import * as db from "./lib/supabase";

// Lote F (P23, 10/11/2026): baja de una cuenta en el registro del worker (Supabase).
// Lo llama closeAccount (Base44) con la clave compartida. Antes la baja no llegaba aqui:
// bookings_ledger seguia guardando nombre, correo y telefono del alumno, y el cron le seguia
// mandando el Meet de sus clases futuras.
//
// - Clases futuras (programadas) del usuario: se cancelan.
// - En todas sus filas: nombre, correo y telefono se sustituyen por "Usuario dado de baja".
//   Se conservan fecha, asignatura, precio y estado de pago (obligaciones contables).

const ANON = "Usuario dado de baja";

async function ids(env: Env, filtro: Record<string, string>): Promise<string[]> {
  const filas = await db.select<{ booking_id: string }>(env, "bookings_ledger", filtro, { select: "booking_id" });
  return filas.map((f) => f.booking_id).filter(Boolean);
}

async function porLotes(env: Env, tabla: string, columna: string, lista: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < lista.length; i += 50) {
    const lote = lista.slice(i, i + 50).map((x) => `"${x.replace(/"/g, "")}"`).join(",");
    await db.update(env, tabla, { [columna]: `in.(${lote})` }, patch);
  }
}

export async function anonimizarBaja(env: Env, email: string) {
  const ahora = new Date().toISOString();
  const resumen: Record<string, number> = {};

  // Alumno
  const futurasAlumno = await ids(env, { student_email: `eq.${email}`, status: "in.(scheduled,modified)", start_datetime: `gt.${ahora}` });
  await porLotes(env, "bookings_ledger", "booking_id", futurasAlumno, { status: "cancelled" });
  await porLotes(env, "class_log", "class_id", futurasAlumno, { status: "cancelled" });
  const comoAlumno = await ids(env, { student_email: `eq.${email}` });
  await porLotes(env, "bookings_ledger", "booking_id", comoAlumno, {
    student_first_name: ANON, student_last_name: null, student_email: null, student_phone: null,
  });
  resumen.alumno_filas = comoAlumno.length;
  resumen.alumno_canceladas = futurasAlumno.length;

  // Profesor
  const futurasProfesor = await ids(env, { teacher_email: `eq.${email}`, status: "in.(scheduled,modified)", start_datetime: `gt.${ahora}` });
  await porLotes(env, "bookings_ledger", "booking_id", futurasProfesor, { status: "cancelled" });
  await porLotes(env, "class_log", "class_id", futurasProfesor, { status: "cancelled" });
  const comoProfesor = await ids(env, { teacher_email: `eq.${email}` });
  await porLotes(env, "bookings_ledger", "booking_id", comoProfesor, {
    teacher_first_name: ANON, teacher_last_name: null, teacher_name: ANON, teacher_email: null, teacher_phone: null,
  });
  await porLotes(env, "class_log", "class_id", comoProfesor, { teacher_name: ANON });
  resumen.profesor_filas = comoProfesor.length;
  resumen.profesor_canceladas = futurasProfesor.length;

  return { ok: true, ...resumen };
}
