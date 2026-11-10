import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sustituye a getPublicTeachers, que devolvía el registro completo del profesor a cualquier
// usuario registrado, incluidos los tokens de Google Calendar y los identificadores de Stripe.
// Se mantienen los campos que la interfaz ya usaba (nombre, bio, asignaturas, contacto) y se
// eliminan los secretos.
const SECRET_FIELDS = [
  'google_calendar_tokens',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_connect_account_id',
  // Fase 3 (10/11/2026): datos internos que ningun alumno necesita ver.
  'verified_notes',
  'corporate_email',
  'subscription_exempt',
  'trial_start_date',
  'trial_end_date',
];

function stripSecrets(teacher) {
  const clean = { ...teacher };
  for (const field of SECRET_FIELDS) delete clean[field];
  clean.stripe_connect_enabled = Boolean(teacher.stripe_connect_enabled);
  clean.google_calendar_connected = Boolean(teacher.google_calendar_connected);
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = base44.asServiceRole;
    const all = await db.entities.Teacher.list('-created_date', 500);

    // Fase 3 (10/11/2026, decision del titular): el numero de clases que ve el alumno es el real
    // de Menttio (reservas completadas), no el campo total_classes, que se rellenaba a mano y
    // podia no corresponder (la ficha del titular decia 320 con 110 reservas en la app).
    const completadas = await db.entities.Booking.filter({ status: 'completed' }, '-date', 5000).catch(() => []);
    const porProfesor = new Map();
    for (const b of completadas) {
      const id = String(b.teacher_id || '');
      if (id) porProfesor.set(id, (porProfesor.get(id) || 0) + 1);
    }

    const teachers = all.map((t) => ({ ...stripSecrets(t), total_classes: porProfesor.get(String(t.id)) || 0 }));

    return Response.json({ teachers });
  } catch (error) {
    console.error('Error en teachersDirectory:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
