import { type Env, HttpError } from "../env";
import { sendEmail } from "../lib/gmail";
import { escapeHtml } from "../lib/util";

// Base44: sendContactEmail (formulario de contacto, PÚBLICO — sin auth).
// Portado de integrations.Core.SendEmail (gastaba créditos Base44) a Gmail vía service account.
export async function sendContactEmail(
  env: Env,
  _req: Request,
  body: { name?: string; lastName?: string; email?: string; message?: string },
) {
  const { name, lastName, email, message } = body;
  if (!name || !lastName || !email || !message) {
    throw new HttpError(400, "Todos los campos son obligatorios");
  }
  const fullName = `${name} ${lastName}`;
  const msgHtml = escapeHtml(message).replace(/\n/g, "<br>");

  // Aviso interno.
  await sendEmail(env, {
    to: env.MENTTIO_INBOX,
    fromName: "Formulario de Contacto - Menttio",
    subject: `Nuevo mensaje de contacto de ${fullName}`,
    html: `<h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre completo:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p><br>
      <p><strong>Mensaje:</strong></p><p>${msgHtml}</p><br><hr>
      <p style="color:#666;font-size:12px;">Enviado desde el formulario de contacto de Menttio</p>`,
  });

  // Confirmación al usuario.
  await sendEmail(env, {
    to: email,
    fromName: "Menttio",
    subject: "Hemos recibido tu mensaje",
    html: `<h2>¡Gracias por contactarnos!</h2>
      <p>Hola ${escapeHtml(fullName)},</p>
      <p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p><br>
      <p><strong>Tu mensaje:</strong></p>
      <p style="background:#f5f5f5;padding:15px;border-radius:8px;">${msgHtml}</p><br>
      <p>Saludos,</p><p><strong>El equipo de Menttio</strong></p>`,
  });

  return { success: true };
}
