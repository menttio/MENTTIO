import type { Env } from "./env";
import { sendEmail } from "./lib/gmail";
import * as db from "./lib/supabase";
import {
  buildCorporateEmail,
  createWorkspaceUser,
  deleteWorkspaceUser,
  generatePassword,
} from "./lib/admin";
import { resolveFolderPath, uploadFile } from "./lib/drive";
import { normalizeText, deleteCountryCode, formatMadrid } from "./lib/util";
import * as tpl from "./templates";

// Payload que Base44 envía para las reservas (idéntico al que mandaba a n8n).
interface BookingPayload {
  student_id?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_phone?: string;
  student_email?: string;
  subject?: string;
  price?: number;
  teacher_first_name?: string;
  teacher_last_name?: string;
  teacher_email?: string;
  teacher_phone?: string;
  class_start_datetime?: string;
  booking_id?: string;
}

function ledgerRow(p: BookingPayload, status: string) {
  return {
    booking_id: p.booking_id,
    student_id: p.student_id ?? null,
    student_first_name: p.student_first_name ?? null,
    student_last_name: p.student_last_name ?? null,
    student_email: p.student_email ?? null,
    student_phone: p.student_phone ?? null,
    subject_name: p.subject ?? null,
    price: p.price ?? null,
    start_datetime: p.class_start_datetime ?? null,
    teacher_first_name: p.teacher_first_name ?? null,
    teacher_last_name: p.teacher_last_name ?? null,
    teacher_name: `${p.teacher_first_name ?? ""} ${p.teacher_last_name ?? ""}`.trim(),
    teacher_email: p.teacher_email ?? null,
    teacher_phone: p.teacher_phone ?? null,
    status,
  };
}

// ---------- Reservas ----------

export async function reservaNueva(env: Env, p: BookingPayload) {
  const { fecha, hora, ymd } = formatMadrid(p.class_start_datetime ?? "");

  await db.upsert(env, "bookings_ledger", ledgerRow(p, "scheduled"));
  await db.upsert(env, "class_log", {
    class_id: p.booking_id,
    student_id: p.student_id ?? null,
    date: ymd || null,
    subject_name: p.subject ?? null,
    teacher_name: `${p.teacher_first_name ?? ""} ${p.teacher_last_name ?? ""}`.trim(),
    status: "scheduled",
  });

  if (p.teacher_email) {
    const e = tpl.reservaProfesor({
      nombreAlumno: p.student_first_name ?? "",
      apellidosAlumno: p.student_last_name ?? "",
      asignatura: p.subject ?? "",
      fecha,
      hora,
    });
    await sendEmail(env, { to: p.teacher_email, subject: e.subject, html: e.html });
  }

  const interno = tpl.reservaInterna({
    nombreAlumno: p.student_first_name ?? "",
    apellidosAlumno: p.student_last_name ?? "",
    asignatura: p.subject ?? "",
    nombreProfesor: `${p.teacher_first_name ?? ""} ${p.teacher_last_name ?? ""}`.trim(),
    fecha,
  });
  await sendEmail(env, { to: env.MENTTIO_INBOX, subject: interno.subject, html: interno.html });

  return { success: true };
}

export async function reservaCancelada(env: Env, p: BookingPayload) {
  // Soft-delete: conservamos historial marcando estado en vez de borrar la fila.
  const filter = { booking_id: `eq.${p.booking_id}` };
  await db.update(env, "bookings_ledger", filter, { status: "cancelled" });
  await db.update(env, "class_log", { class_id: `eq.${p.booking_id}` }, { status: "cancelled" });
  return { success: true };
}

export async function reservaModificada(env: Env, p: BookingPayload) {
  const { ymd } = formatMadrid(p.class_start_datetime ?? "");
  await db.update(
    env,
    "bookings_ledger",
    { booking_id: `eq.${p.booking_id}` },
    { start_datetime: p.class_start_datetime ?? null, status: "modified" },
  );
  await db.update(env, "class_log", { class_id: `eq.${p.booking_id}` }, { date: ymd || null });
  return { success: true };
}

export async function clasePagada(env: Env, body: { clase_id?: string }) {
  if (!body.clase_id) return { success: false, error: "clase_id requerido" };
  await db.update(env, "bookings_ledger", { booking_id: `eq.${body.clase_id}` }, { payment_status: "paid" });
  return { success: true };
}

// ---------- Altas de usuario ----------

interface NuevoRegistroPayload {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  correo_electronico?: string;
}

export async function nuevoRegistro(env: Env, tipo: "alumno" | "profesor", b: NuevoRegistroPayload) {
  const e = tpl.avisoNuevoRegistro(tipo, {
    nombre: b.nombre ?? "",
    apellidos: b.apellidos ?? "",
    telefono: b.telefono ?? "",
    email: b.correo_electronico ?? "",
  });
  await sendEmail(env, { to: env.MENTTIO_INBOX, subject: e.subject, html: e.html });
  return { success: true };
}

// ---------- Registrar profesor (crea cuenta Workspace, respuesta SÍNCRONA) ----------

export async function registrarProfesor(
  env: Env,
  b: { nombre?: string; apellidos?: string; email?: string },
) {
  const nombre = b.nombre ?? "";
  const apellidos = b.apellidos ?? "";
  const corporateEmail = buildCorporateEmail(env, nombre, apellidos);
  const password = generatePassword(15);

  await createWorkspaceUser(env, {
    primaryEmail: corporateEmail,
    givenName: nombre,
    familyName: apellidos,
    password,
  });

  // Email con credenciales al correo personal (no es bloqueante si falla).
  if (b.email) {
    try {
      const e = tpl.credencialesPersonal({ correoElectronico: corporateEmail, contrasena: password });
      await sendEmail(env, { to: b.email, subject: e.subject, html: e.html });
    } catch (err) {
      console.error("Aviso: fallo enviando credenciales al correo personal:", err);
    }
  }
  // Email de bienvenida al correo corporativo (recién creado; no bloqueante).
  try {
    const e = tpl.credencialesCorporativo({ nombre, emailCorporativo: corporateEmail, password });
    await sendEmail(env, { to: corporateEmail, subject: e.subject, html: e.html });
  } catch (err) {
    console.error("Aviso: fallo enviando bienvenida al correo corporativo:", err);
  }

  // Contrato que esperan registerTeacher / createCorporateUser en Base44:
  return { status: "ok", email: corporateEmail, firstName: nombre, lastName: apellidos };
}

export async function eliminarProfesor(env: Env, b: { primaryEmail?: string }) {
  if (!b.primaryEmail) return { success: false, error: "primaryEmail requerido" };
  await deleteWorkspaceUser(env, b.primaryEmail);
  return { success: true };
}

// ---------- Subir archivos (Drive + email) ----------

interface FileUploadPayload {
  student_first_name?: string;
  student_last_name?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  teacher_email?: string;
  subject_name?: string;
  date?: string;
  files?: Array<string | { url?: string; name?: string }>;
}

export async function subirArchivos(env: Env, p: FileUploadPayload) {
  const urls = (p.files ?? [])
    .map((f) => (typeof f === "string" ? f : f?.url))
    .filter((u): u is string => Boolean(u));

  // Ruta de carpetas igual que en n8n:
  // Profesores / {Nombre Apellidos profesor} / Alumnos / {NombreAlumno+Apellidos} / {Asignatura} / Apuntes / {fecha}_{Asignatura}
  const profNombre = normalizeText(p.teacher_first_name ?? "");
  const profApellidos = normalizeText(p.teacher_last_name ?? "");
  const alumno = normalizeText(p.student_first_name ?? "") + normalizeText(p.student_last_name ?? "");
  const asignatura = normalizeText(p.subject_name ?? "");

  const segments = [
    `${profNombre} ${profApellidos}`.trim(),
    "Alumnos",
    alumno,
    asignatura,
    "Apuntes",
    `${p.date ?? ""}_${asignatura}`,
  ];

  try {
    const folderId = await resolveFolderPath(env, env.DRIVE_ROOT_PROFESORES, segments);
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`No se pudo descargar ${url}: ${res.status}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      const mime = res.headers.get("content-type") ?? "application/octet-stream";
      const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "archivo");
      await uploadFile(env, folderId, name, buf, mime);
    }
  } catch (err) {
    // Si Drive falla, seguimos avisando por email igualmente.
    console.error("Aviso: fallo subiendo a Drive:", err);
  }

  if (p.teacher_email) {
    const e = tpl.archivosSubidos({
      nombre: p.student_first_name ?? "",
      apellidos: p.student_last_name ?? "",
      asignatura: p.subject_name ?? "",
      fecha: p.date ?? "",
      urls,
    });
    await sendEmail(env, { to: p.teacher_email, subject: e.subject, html: e.html });
  }
  return { success: true, uploaded: urls.length };
}

// ---------- Informe mensual ----------

export async function informeProgreso(
  env: Env,
  body: { mes?: string; estudiantes?: tpl.InformeAlumno[] },
) {
  const estudiantes = body.estudiantes ?? [];
  let sent = 0;
  for (const est of estudiantes) {
    if (!est.email) continue;
    const e = tpl.informeMensual({ ...est, mesLabel: est.mesLabel || body.mes || "" });
    await sendEmail(env, { to: est.email, subject: e.subject, html: e.html });
    sent++;
  }
  return { success: true, sent };
}
