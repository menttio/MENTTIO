import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Da o retira el permiso de grabacion del alumno que llama (lote C, 09/11/2026).
//
// Antes lo escribia el navegador directamente (Student.update + Consent.create), asi que un
// alumno podia marcarse "autorizado" desde la consola y un menor podia declarar que lo
// autorizaba su tutor. Ahora:
//  - El historial (entidad Consent) solo lo escribe el servidor y es la UNICA fuente de verdad:
//    saveRecording, recordingUrl, consentimientoClase y recordingActions miran el ultimo evento.
//  - Se actualizan todas las fichas Student del correo (habia fichas duplicadas con valores
//    distintos y el resultado dependia de cual salia primero).
//  - Menores de 14 anos dados de alta desde TUTOR_DESDE: dar el permiso no surte efecto hasta
//    que el tutor lo confirma con el enlace que le llega por correo (confirmarConsentimientoTutor).
//  - Retirar el permiso surte efecto en el acto, lo pida quien lo pida. Las grabaciones de ese
//    alumno pasan a cuarentena en el siguiente ciclo del worker (<= 15 min) y se borran a los 30 dias.

const TUTOR_DESDE = '2026-11-09T00:00:00Z';
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function firmar(datos: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw', enc.encode('tutor-consent:' + (Deno.env.get('AUTOMATION_SECRET') || '')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', clave, enc.encode(datos)));
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || !user.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (typeof body.granted !== 'boolean') {
      return Response.json({ error: 'granted (true/false) es obligatorio' }, { status: 400 });
    }
    const granted: boolean = body.granted;
    const textVersion = String(body.text_version || '').slice(0, 50) || undefined;
    const textShown = String(body.text_shown || '').slice(0, 5000) || undefined;

    const db = base44.asServiceRole;
    const email = String(user.email).toLowerCase();
    const fichas = await db.entities.Student.filter({ user_email: email }).catch(() => []);
    if (!fichas.length) return Response.json({ error: 'No tienes ficha de alumno' }, { status: 404 });

    const principal = fichas.find((f: any) => f.is_minor === true) || fichas[0];
    const esMenor = fichas.some((f: any) => f.is_minor === true);
    const ahora = new Date().toISOString();

    // Menor dado de alta con el sistema nuevo: el permiso lo confirma el tutor.
    const necesitaTutor = granted && esMenor &&
      fichas.every((f: any) => String(f.created_date || '') >= TUTOR_DESDE.slice(0, 19));

    if (necesitaTutor) {
      const tutor = String(principal.guardian_email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tutor) || tutor === email) {
        return Response.json({
          error: 'Para autorizar la grabación de un menor de 14 años hace falta el correo de su padre, madre o tutor (distinto del del alumno).',
        }, { status: 400 });
      }
      const payload = b64url(enc.encode(JSON.stringify({
        s: principal.id, e: email, g: tutor, v: textVersion, x: Date.now() + 7 * 24 * 3600 * 1000,
        n: b64url(crypto.getRandomValues(new Uint8Array(9))),
      })));
      const token = `${payload}.${await firmar(payload)}`;
      const enlace = `https://menttio.com/api/functions/confirmarConsentimientoTutor?t=${encodeURIComponent(token)}`;

      for (const f of fichas) {
        await db.entities.Student.update(f.id, { recording_consent_pending_at: ahora });
      }
      await db.integrations.Core.SendEmail({
        from_name: 'Menttio',
        to: tutor,
        subject: 'Menttio: autorización para grabar las clases de ' + (principal.full_name || 'tu hijo/a'),
        body: `<p>Hola${principal.guardian_name ? ' ' + esc(principal.guardian_name) : ''}:</p>
<p>${esc(principal.full_name || 'Tu hijo/a')} (${esc(email)}) ha pedido en Menttio que sus clases online se graben.
Las grabaciones solo las ven el alumno y su profesor, y se borran a los 12 meses.</p>
<p>Como es menor de 14 años, necesitamos que lo autorices tú. Si estás de acuerdo, pulsa aquí (el enlace caduca en 7 días):</p>
<p><a href="${enlace}" style="display:inline-block;background:#41f2c0;color:#404040;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Autorizo la grabación de las clases</a></p>
${textShown ? `<p style="font-size:12px;color:#666">Texto que se autoriza:<br>${esc(textShown)}</p>` : ''}
<p>Si no estás de acuerdo, ignora este correo: sin tu confirmación las clases no se graban. Puedes retirar el permiso cuando quieras desde el perfil del alumno o escribiéndonos.</p>
<p>El equipo de Menttio</p>`,
      });
      return Response.json({ ok: true, pendiente_tutor: true });
    }

    await db.entities.Consent.create({
      user_email: email,
      student_id: principal.id,
      type: 'grabacion',
      granted,
      granted_by: esMenor ? 'tutor' : 'alumno',
      guardian_name: esMenor ? principal.guardian_name : undefined,
      guardian_email: esMenor ? principal.guardian_email : undefined,
      text_version: textVersion,
      text_shown: textShown,
      event_date: ahora,
      description: esMenor && granted ? 'Declarado desde la cuenta del alumno (alta anterior a la verificación por correo del tutor)' : undefined,
    });
    for (const f of fichas) {
      await db.entities.Student.update(f.id, {
        recording_consent: granted,
        recording_consent_date: ahora,
        recording_consent_pending_at: null,
      });
    }
    return Response.json({ ok: true, granted, recording_consent_date: ahora });
  } catch (error) {
    console.error('setRecordingConsent:', (error as Error)?.message);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
