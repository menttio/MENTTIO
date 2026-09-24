import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Devuelve el enlace de la grabación de una o varias clases.
// Sustituye a recordingLink, que leía una hoja de cálculo de Google con una clave de API.
// Una clave de API solo sirve en hojas compartidas públicamente, así que al cerrar la hoja
// (necesario: contenía clases de menores) dejó de funcionar. Ahora se lee de la reserva.
//
// Dos comprobaciones, las mismas que antes:
//   1. Quien pregunta participó en esa clase (o es administrador).
//   2. Todos los alumnos de la clase autorizan la grabación.
// La segunda se repite aquí aunque saveRecording ya la hiciera al guardar: si un alumno
// retira el permiso después, la grabación deja de servirse desde ese momento.
//
// Acepta booking_id (una) o booking_ids (varias, hasta 100). Con la lista, la pantalla de
// grabaciones hace una sola llamada en vez de una por clase.
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

    // El consentimiento de cada alumno se consulta una vez, no una por clase: un alumno
    // con cuarenta clases pasadas generaba cuarenta consultas idénticas.
    const consentimientos = new Map();
    const tieneConsentimiento = async (correo) => {
      if (consentimientos.has(correo)) return consentimientos.get(correo);
      const alumnos = await db.entities.Student.filter({ user_email: correo }).catch(() => []);
      const ok = Boolean(alumnos[0]) && alumnos[0].recording_consent === true;
      consentimientos.set(correo, ok);
      return ok;
    };

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

      const correos = [...new Set(
        [booking.student_email, ...enrolled.map((s) => s?.student_email)]
          .filter(Boolean)
          .map((e) => String(e).toLowerCase()),
      )];

      let alguienSinPermiso = false;
      for (const correo of correos) {
        if (!(await tieneConsentimiento(correo))) { alguienSinPermiso = true; break; }
      }

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
