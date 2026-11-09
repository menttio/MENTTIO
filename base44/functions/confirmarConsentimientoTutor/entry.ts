import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Enlace que recibe el tutor de un menor de 14 anos para autorizar la grabacion (lote C).
// Lo genera setRecordingConsent: va firmado (HMAC) y caduca a los 7 dias. No requiere sesion:
// lo que acredita al tutor es haber recibido el correo en la direccion que se dio al registrarse.
// GET  -> pagina de confirmacion con un boton (los antivirus y previsualizadores de correo abren
//         los enlaces con GET; si se confirmara con GET, el permiso se daria solo).
// POST -> registra el consentimiento y redirige a menttio.com.

const enc = new TextEncoder();

function desdeB64url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b + '='.repeat((4 - (b.length % 4)) % 4));
}

async function tokenValido(t: string | null): Promise<any | null> {
  if (!t || !t.includes('.')) return null;
  const [payload, firma] = t.split('.');
  try {
    const clave = await crypto.subtle.importKey(
      'raw', enc.encode('tutor-consent:' + (Deno.env.get('AUTOMATION_SECRET') || '')),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const firmaBytes = Uint8Array.from(desdeB64url(firma), (c) => c.charCodeAt(0));
    if (!(await crypto.subtle.verify('HMAC', clave, firmaBytes, enc.encode(payload)))) return null;
    const d = JSON.parse(desdeB64url(payload));
    if (!d?.s || !d?.e || !d?.g || typeof d.x !== 'number' || Date.now() > d.x) return null;
    return d;
  } catch {
    return null;
  }
}

const pagina = (titulo: string, cuerpo: string) => new Response(
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="font-family:Arial,sans-serif;background:#f6f8fa;padding:30px;color:#404040">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px">
<h2>${titulo}</h2>${cuerpo}</div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  let t = url.searchParams.get('t');
  if (req.method === 'POST') {
    const form = await req.formData().catch(() => null);
    t = String(form?.get('t') || t || '');
  }
  const d = await tokenValido(t);
  if (!d) {
    return pagina('Enlace no válido', '<p>El enlace no es válido o ha caducado (dura 7 días). Pide al alumno que vuelva a solicitar la autorización desde su perfil en Menttio.</p>');
  }

  if (req.method !== 'POST') {
    const tt = String(t).replace(/"/g, '');
    return pagina('Autorizar la grabación de las clases',
      `<p>Vas a autorizar que se graben las clases online de la cuenta <strong>${String(d.e).replace(/[<>&"]/g, '')}</strong> en Menttio.
Las grabaciones solo las ven el alumno y su profesor, y se borran a los 12 meses. Puedes retirar el permiso cuando quieras.</p>
<form method="POST"><input type="hidden" name="t" value="${tt}">
<button type="submit" style="background:#41f2c0;border:0;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer">Sí, autorizo la grabación</button></form>
<p style="font-size:13px;color:#666">Si no estás de acuerdo, cierra esta página: sin tu confirmación las clases no se graban.</p>`);
  }

  try {
    const db = createClientFromRequest(req).asServiceRole;
    const fichas = await db.entities.Student.filter({ user_email: d.e }).catch(() => []);
    const principal = fichas.find((f: any) => f.id === d.s);
    if (!principal || !principal.recording_consent_pending_at ||
        String(principal.guardian_email || '').toLowerCase() !== String(d.g).toLowerCase()) {
      return pagina('Nada que confirmar', '<p>Esta solicitud ya no está pendiente (puede que ya se confirmara o que el alumno la retirase).</p>');
    }
    const ahora = new Date().toISOString();
    await db.entities.Consent.create({
      user_email: d.e,
      student_id: principal.id,
      type: 'grabacion',
      granted: true,
      granted_by: 'tutor',
      guardian_name: principal.guardian_name,
      guardian_email: principal.guardian_email,
      text_version: d.v,
      event_date: ahora,
      description: 'Confirmado por el tutor con el enlace enviado a ' + principal.guardian_email,
    });
    for (const f of fichas) {
      await db.entities.Student.update(f.id, {
        recording_consent: true,
        recording_consent_date: ahora,
        recording_consent_pending_at: null,
      });
    }
    return Response.redirect('https://menttio.com/?consentimiento_tutor=ok', 303);
  } catch (e) {
    console.error('confirmarConsentimientoTutor:', (e as Error)?.message);
    return pagina('Error', '<p>No hemos podido guardar la autorización. Inténtalo de nuevo en unos minutos.</p>');
  }
});
