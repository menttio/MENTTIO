import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Guarda el enlace de la grabación de una clase dentro de Menttio.
// Antes esto se escribía en una hoja de cálculo de Google que tenía que estar compartida
// públicamente para poder leerla con una clave de API; es decir, los datos de las clases
// (incluidas las de menores) eran accesibles a cualquiera con el enlace. Ahora vive en la
// propia reserva.
//
// La llama la automatización (Cloudflare Worker) con la clave compartida AUTOMATION_SECRET.
// Un administrador también puede, para corregir a mano.
//
// El enlace se guarda SIEMPRE, con consentimiento o sin él, y quien decide si se muestra es
// recordingUrl, que lo comprueba en cada lectura. Es a propósito: si sólo se guardara con
// permiso, un alumno que lo diera más tarde no recuperaría nunca sus grabaciones anteriores,
// porque la única forma de volver a relacionarlas con su clase era la hoja de cálculo que
// estamos retirando. Guardándolo siempre, el permiso funciona en los dos sentidos y al momento.
//
// Lo que sí depende del consentimiento es el acceso al archivo en Drive, que es la puerta de
// verdad: sin permiso no se comparte, así que el enlace no abre nada. Por eso se devuelve
// `consent`: la automatización lo usa para decidir si comparte el archivo.
//
// Lote C (09/11/2026): dar el permiso ya NO desbloquea grabaciones anteriores (decision 2a), y
// las grabaciones sin consentimiento pasan a cuarentena y se borran a los 30 dias (recordingActions).
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
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const automationSecret = Deno.env.get('AUTOMATION_SECRET');
    const providedKey = req.headers.get('x-automation-key') || '';
    const isAutomation = Boolean(automationSecret) && providedKey === automationSecret;

    // Autorización antes de tocar la reserva, para no revelar a un anónimo si existe.
    if (!isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || !user.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.role !== 'admin') {
        return Response.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || '').trim();
    const bruto = String(body.drive_file_id || '').trim();

    if (!bookingId || !bruto) {
      return Response.json({ error: 'Faltan campos requeridos: booking_id y drive_file_id' }, { status: 400 });
    }

    // Admite el identificador suelto o una dirección de Drive completa; guarda siempre lo mismo.
    let fileId = bruto;
    const enlace = bruto.match(/\/d\/([a-zA-Z0-9_-]+)/) || bruto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (enlace) fileId = enlace[1];
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
      return Response.json({ error: 'drive_file_id no tiene un formato válido', valor: bruto.slice(0, 80) }, { status: 400 });
    }

    const booking = await db.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Consentimiento de todos los alumnos, vigente y dado el dia de la clase o antes (lote C).
    const c = await claseConsentida(db, booking, new Map());
    const consent = c.ok;
    // A quien comparte el worker el archivo: alumnos de la clase (tambien los de grupo) y profesor.
    const destinatarios = consent
      ? [...alumnosDe(booking), String(booking.teacher_email || '').toLowerCase()].filter(Boolean)
      : [];

    const recordingUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const yaEstaba = booking.recording_url === recordingUrl;
    if (!yaEstaba) {
      await db.entities.Booking.update(bookingId, { recording_url: recordingUrl });
    }

    return Response.json({
      success: true,
      stored: true,
      ya_estaba: yaEstaba,
      consent,
      motivo: c.motivo === 'grabada_antes_del_consentimiento' ? 'sin_consentimiento' : c.motivo,
      destinatarios,
      booking_id: bookingId,
    });
  } catch (error) {
    console.error('Error en saveRecording:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
