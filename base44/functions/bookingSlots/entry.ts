import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Antes, para calcular los huecos libres, el alumno se descargaba TODAS las reservas con
// nombres, emails y notas. Ahora se devuelven solo los datos de agenda necesarios:
// qué franjas están ocupadas y cuántas plazas quedan en las clases de grupo.
function sanitize(booking) {
  const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
  return {
    id: booking.id,
    teacher_id: booking.teacher_id,
    subject_id: booking.subject_id,
    subject_name: booking.subject_name,
    date: booking.date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    duration_minutes: booking.duration_minutes,
    class_type: booking.class_type,
    max_students: booking.max_students,
    price: booking.price,
    status: booking.status,
    // Solo el identificador: sin nombres ni emails de otros alumnos.
    enrolled_students: enrolled.map((s) => ({ student_id: s.student_id }))
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query = { status: 'scheduled' };
    if (body.teacher_id) query.teacher_id = String(body.teacher_id);

    const bookings = await base44.asServiceRole.entities.Booking.filter(query, 'date', 1000);
    return Response.json({ bookings: bookings.map(sanitize) });
  } catch (error) {
    console.error('Error en bookingSlots:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
