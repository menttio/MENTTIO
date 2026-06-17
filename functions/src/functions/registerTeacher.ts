import { type Env, HttpError } from "../env";
import { requireUser } from "../lib/auth";
import { sendEmail } from "../lib/gmail";
import { escapeHtml } from "../lib/util";
import * as db from "../lib/db";

// Base44: registerTeacher (plan premium) -> crea cuenta corporativa Workspace, registro Teacher
// y avisos. Cuenta vía Worker de automations (/registrar-profesor); Teacher en Supabase;
// notificación interna por Gmail. La invitación de login (inviteUser) se cubre en la Fase 4 (auth).
export async function registerTeacher(env: Env, req: Request, body: any) {
  await requireUser(env, req);
  const { nombre, apellidos, email_personal, phone, education, experience_years, subjects, subscription_plan } = body;

  if (!nombre || !apellidos || !email_personal || !phone || !education) {
    throw new HttpError(400, "Faltan campos obligatorios");
  }
  if (subscription_plan === "basic") {
    throw new HttpError(400, "El plan básico no debe usar esta función");
  }
  if (!env.AUTOMATIONS_URL || !env.WEBHOOK_SECRET) throw new HttpError(500, "AUTOMATIONS_URL/WEBHOOK_SECRET no configurados");

  // 1) Crear la cuenta corporativa (Workspace) vía el Worker de automations.
  const res = await fetch(`${env.AUTOMATIONS_URL}/registrar-profesor?key=${env.WEBHOOK_SECRET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, apellidos, email: email_personal }),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(502, `registrar-profesor falló (${res.status})`);
  const corp = JSON.parse(text);
  if (corp.status !== "ok") throw new HttpError(500, corp.error || "Error al crear usuario corporativo");

  // 2) Crear el registro Teacher en Supabase (vinculado al email corporativo).
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);
  await db.insert(env, "teachers", {
    user_email: corp.email,
    full_name: `${nombre} ${apellidos}`,
    phone,
    education,
    experience_years: experience_years ?? null,
    bio: "",
    subjects: subjects || [],
    rating: 0,
    total_classes: 0,
    subscription_active: true,
    subscription_expires: expires.toISOString().split("T")[0],
    subscription_plan: subscription_plan || "premium",
    trial_used: true,
    tour_completed: false,
    corporate_email: corp.email,
  });

  // 3) Aviso interno de nuevo profesor (reutiliza el Worker de automations).
  try {
    await fetch(`${env.AUTOMATIONS_URL}/nuevo-profesor?key=${env.WEBHOOK_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellidos, telefono: phone, correo_electronico: corp.email }),
    });
  } catch (e) { console.error("aviso nuevo-profesor:", e); }

  // 4) Email de notificación a Menttio (Gmail, no Base44).
  try {
    await sendEmail(env, {
      to: env.MENTTIO_INBOX,
      subject: "Nuevo Profesor Registrado - Menttio",
      html: `<h2>Nuevo Profesor Registrado</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(nombre)} ${escapeHtml(apellidos)}</p>
        <p><strong>Email personal:</strong> ${escapeHtml(email_personal)}</p>
        <p><strong>Email corporativo:</strong> ${escapeHtml(corp.email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Formación:</strong> ${escapeHtml(education)}</p>
        <p><strong>Años de experiencia:</strong> ${escapeHtml(String(experience_years ?? "No especificado"))}</p>`,
    });
  } catch (e) { console.error("email notificación:", e); }

  return { status: "ok", email: corp.email };
}
