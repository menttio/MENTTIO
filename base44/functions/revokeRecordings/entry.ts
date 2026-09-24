import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Al retirar el permiso de grabación, borra los enlaces de las grabaciones ya guardadas.
//
// Hace falta porque el enlace vive en la propia reserva, y hay pantallas que lo pintan
// directamente desde ahí (la tarjeta de clase) sin pasar por recordingUrl, que es donde se
// comprueba el consentimiento. Si no se borrase, un alumno que retira el permiso seguiría
// viendo el enlace de sus clases antiguas: un consentimiento que no surte efecto al retirarlo
// no es un consentimiento.
//
// Solo actúa sobre las clases del propio usuario que llama (o de cualquiera, si es
// administrador). No borra el archivo de Drive: eso lo decide el profesor, dueño de la clase.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const esAdmin = user.role === 'admin';
    const objetivo = String((esAdmin && body.user_email) || user.email).toLowerCase();

    const db = base44.asServiceRole;

    // Comprobación de coherencia: solo se borra si el permiso está realmente retirado.
    // Si no, una llamada suelta podría ocultarle a alguien sus grabaciones autorizadas.
    const alumnos = await db.entities.Student.filter({ user_email: objetivo }).catch(() => []);
    const algunoAutoriza = alumnos.some((a) => a.recording_consent === true);
    if (algunoAutoriza) {
      return Response.json({ success: true, cleared: 0, motivo: 'consentimiento_vigente' });
    }

    const bookings = await db.entities.Booking.filter({ student_email: objetivo }).catch(() => []);
    let cleared = 0;
    for (const b of bookings) {
      if (!b.recording_url) continue;
      try {
        await db.entities.Booking.update(b.id, { recording_url: null });
        cleared++;
      } catch (e) {
        console.error(`revokeRecordings ${b.id}:`, e);
      }
    }

    return Response.json({ success: true, cleared });
  } catch (error) {
    console.error('Error en revokeRecordings:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
