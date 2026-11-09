import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// SEGURIDAD (09/11/2026): una clase de grupo la crea un alumno y se apuntan otros. Antes se
// devolvia la reserva entera, con el nombre, correo, telefono y notas de progreso del alumno
// que la creo, y el enlace directo a la grabacion (saltandose la comprobacion de
// consentimiento de recordingUrl). Ahora solo van los datos de la clase. La grabacion se marca
// como disponible y su enlace se pide a recordingUrl, que comprueba participacion y permiso.
function claseParaAlumno(b, email) {
  const propia = String(b.student_email || '').toLowerCase() === email;
  const limpio = { ...b, recording_url: b.recording_url ? 'protegida' : null };
  if (!propia) {
    delete limpio.student_name;
    delete limpio.student_email;
    delete limpio.student_phone;
    delete limpio.progress_note;
    delete limpio.rating;
    delete limpio.notes;
    delete limpio.google_event_id_student;
  }
  return limpio;
}

// Devuelve las clases de grupo en las que el alumno que llama está apuntado.
// Antes la app se descargaba todas las clases de grupo de la plataforma para buscarse a sí mismo.
// Los datos del resto de compañeros no se envían.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = (user.email || '').toLowerCase();
    const db = base44.asServiceRole;

    const [scheduled, completed] = await Promise.all([
      db.entities.Booking.filter({ class_type: 'group', status: 'scheduled' }, 'date', 500),
      db.entities.Booking.filter({ class_type: 'group', status: 'completed' }, '-date', 500)
    ]);

    const mine = [...scheduled, ...completed].filter((b) =>
      (b.enrolled_students || []).some((s) => (s.student_email || '').toLowerCase() === email)
    );

    const bookings = mine.map((b) => ({
      ...claseParaAlumno(b, email),
      // Solo se devuelve la plaza del propio alumno; el resto queda anónimo.
      enrolled_students: (b.enrolled_students || []).map((s) =>
        (s.student_email || '').toLowerCase() === email
          ? s
          : { student_id: s.student_id, payment_status: s.payment_status }
      )
    }));

    return Response.json({ bookings });
  } catch (error) {
    console.error('Error en myGroupClasses:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
