import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sustituye a getPublicTeachers, que devolvía el registro completo del profesor a cualquier
// usuario registrado, incluidos los tokens de Google Calendar y los identificadores de Stripe.
// Se mantienen los campos que la interfaz ya usaba (nombre, bio, asignaturas, contacto) y se
// eliminan los secretos.
const SECRET_FIELDS = [
  'google_calendar_tokens',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_connect_account_id'
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

    const all = await base44.asServiceRole.entities.Teacher.list('-created_date', 500);
    const teachers = all.map(stripSecrets);

    return Response.json({ teachers });
  } catch (error) {
    console.error('Error en teachersDirectory:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
