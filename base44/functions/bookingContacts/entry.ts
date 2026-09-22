import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Devuelve quién participó en cada clase (alumno/s y profesor) para un lote de reservas.
// La usa la automatización para compartir cada grabación solo con quien estuvo en la clase.
// Protegida con la clave compartida AUTOMATION_SECRET: no la puede llamar un usuario cualquiera.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const automationSecret = Deno.env.get('AUTOMATION_SECRET');
    const providedKey = req.headers.get('x-automation-key') || '';
    if (!automationSecret || providedKey !== automationSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.booking_ids) ? body.booking_ids.slice(0, 200).map(String) : [];
    if (ids.length === 0) {
      return Response.json({ error: 'booking_ids es requerido' }, { status: 400 });
    }

    const db = createClientFromRequest(req).asServiceRole;
    const contactos = {};

    for (const id of ids) {
      const booking = await db.entities.Booking.get(id).catch(() => null);
      if (!booking) {
        contactos[id] = null;
        continue;
      }
      const emails = new Set();
      if (booking.student_email) emails.add(String(booking.student_email).toLowerCase());
      if (booking.teacher_email) emails.add(String(booking.teacher_email).toLowerCase());
      for (const s of booking.enrolled_students || []) {
        if (s.student_email) emails.add(String(s.student_email).toLowerCase());
      }
      contactos[id] = [...emails];
    }

    return Response.json({ contactos });
  } catch (error) {
    console.error('Error en bookingContacts:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
