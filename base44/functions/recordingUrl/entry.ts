import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Devuelve el enlace de la grabación de una o varias clases.
// Sustituye a recordingLink, que leía una hoja de cálculo de Google con una clave de API.
// Una clave de API solo sirve en hojas compartidas públicamente, así que al cerrar la hoja
// (necesario: contenía clases de menores) dejó de funcionar. Ahora se lee de la reserva.
//
// Dos comprobaciones, las mismas que antes:
//   1. Quien pregunta participó en esa clase (o es administrador).
//   2. Todos los alumnos de la clase autorizan la grabación, y lo hicieron el dia de la clase o
//      antes (lote C, 09/11/2026: el consentimiento se lee del historial Consent).
// La segunda se repite aquí aunque saveRecording ya la hiciera al guardar: si un alumno
// retira el permiso después, la grabación deja de servirse desde ese momento.
//
// Acepta booking_id (una) o booking_ids (varias, hasta 100). Con la lista, la pantalla de
// grabaciones hace una sola llamada en vez de una por clase.
// --- Consentimiento de grabacion (lote C, 09/11/2026). Copia identica en saveRecording,
// recordingUrl, consentimientoClase y recordingActions: Base44 no comparte codigo entre funciones.
// Fuente de verdad: el ultimo evento de la entidad Consent (tipo grabacion) de cada alumno, que
// solo escribe el servidor. Student.recording_consent es solo una copia para pintar pantallas.
// Una clase cuenta como consentida si TODOS sus alumnos tienen el permiso vigente y lo dieron
// el dia de la clase o antes: dar el permiso no cubre clases grabadas antes (decision 2a).
type Consentimiento = { ok: boolean; desde: string | null };
async function consentimientoDe(db: any, correo: string, cache: Map<string, Consentimiento>): Promise<Consentimiento> {
  if (cache.has(correo)) return cache.get(correo)!;
  const ev = await db.entities.Consent.filter({ user_email: correo, type: 'grabacion' }, '-event_date', 1).catch(() => []);
  const u = ev[0];
  const r = u && u.granted === true
    ? { ok: true, desde: String(u.event_date || u.created_date || '').slice(0, 10) }
    : { ok: false, desde: null };
  cache.set(correo, r);
  return r;
}
function alumnosDe(b: any): string[] {
  const enrolled = Array.isArray(b.enrolled_students) ? b.enrolled_students : [];
  return [...new Set(
    [b.student_email, ...enrolled.map((s: any) => s?.student_email)]
      .filter(Boolean).map((e: unknown) => String(e).trim().toLowerCase()),
  )];
}
async function claseConsentida(db: any, b: any, cache: Map<string, Consentimiento>): Promise<{ ok: boolean; motivo: string }> {
  const correos = alumnosDe(b);
  if (!correos.length) return { ok: false, motivo: 'clase_sin_alumnos' };
  const dia = String(b.date || '').slice(0, 10);
  for (const c of correos) {
    const r = await consentimientoDe(db, c, cache);
    if (!r.ok) return { ok: false, motivo: 'sin_consentimiento' };
    if (dia && r.desde && r.desde > dia) return { ok: false, motivo: 'grabada_antes_del_consentimiento' };
  }
  return { ok: true, motivo: 'ok' };
}
// --- fin consentimiento

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lista = Array.isArray(body.booking_ids) ? body.booking_ids : [];
    const ids = [...new Set(
      (body.booking_id ? [body.booking_id, ...lista] : lista)
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean),
    )].slice(0, 100);

    if (ids.length === 0) {
      return Response.json({ error: 'booking_id o booking_ids es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const email = (user.email || '').toLowerCase();
    const esAdmin = user.role === 'admin';

    const cache = new Map();

    const resultados = {};
    for (const id of ids) {
      const booking = await db.entities.Booking.get(id).catch(() => null);
      if (!booking) {
        resultados[id] = { recording_url: null, motivo: 'no_encontrada' };
        continue;
      }

      const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
      const permitido =
        esAdmin ||
        (booking.student_email || '').toLowerCase() === email ||
        (booking.teacher_email || '').toLowerCase() === email ||
        enrolled.some((s) => (s?.student_email || '').toLowerCase() === email);

      if (!permitido) {
        resultados[id] = { recording_url: null, motivo: 'sin_acceso' };
        continue;
      }

      // Grabacion retirada (cuarentena o papelera): ya no se sirve a nadie salvo al admin.
      if (!esAdmin && (booking.recording_status === 'cuarentena' || booking.recording_status === 'papelera')) {
        resultados[id] = {
          recording_url: null,
          motivo: 'retirada',
          mensaje: 'Esta grabación ya no está disponible.',
        };
        continue;
      }

      const alguienSinPermiso = !(await claseConsentida(db, booking, cache)).ok;

      if (alguienSinPermiso && !esAdmin) {
        resultados[id] = {
          recording_url: null,
          motivo: 'sin_consentimiento',
          mensaje: 'Esta clase no tiene autorizada la grabación, así que no se muestra.',
        };
        continue;
      }

      resultados[id] = { recording_url: booking.recording_url || null };
    }

    // Con una sola clase se responde plano, como hacía recordingLink.
    if (body.booking_id && ids.length === 1) {
      return Response.json(resultados[ids[0]]);
    }
    return Response.json({ recordings: resultados });
  } catch (error) {
    console.error('Error en recordingUrl:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
