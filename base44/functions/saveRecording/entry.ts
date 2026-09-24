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

    // Consentimiento de todos los alumnos de la clase (individual o grupal).
    const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    const correos = [...new Set(
      [booking.student_email, ...enrolled.map((s) => s?.student_email)]
        .filter(Boolean)
        .map((e) => String(e).toLowerCase()),
    )];

    const sinPermiso = [];
    for (const correo of correos) {
      const alumnos = await db.entities.Student.filter({ user_email: correo }).catch(() => []);
      if (!alumnos[0] || alumnos[0].recording_consent !== true) sinPermiso.push(correo);
    }
    const consent = correos.length > 0 && sinPermiso.length === 0;

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
      motivo: consent ? 'ok' : (correos.length === 0 ? 'clase_sin_alumnos' : 'sin_consentimiento'),
      booking_id: bookingId,
    });
  } catch (error) {
    console.error('Error en saveRecording:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
