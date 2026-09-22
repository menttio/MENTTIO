import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const DEFAULT_GROUP_PRICES = { 2: 15, 3: 12, 4: 10 };

// Apuntarse a una clase de grupo ya creada. Antes lo hacía el navegador escribiendo directamente
// en la reserva de otra persona (y enviando el precio). Ahora el servidor comprueba plazas,
// duplicados y calcula el precio con las tarifas del profesor.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id: bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return Response.json({ error: 'booking_id es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const email = (user.email || '').toLowerCase();

    const students = await db.entities.Student.filter({ user_email: user.email });
    const student = students[0];
    if (!student) {
      return Response.json({ error: 'Solo los alumnos pueden apuntarse a una clase' }, { status: 403 });
    }

    const booking = await db.entities.Booking.get(String(bookingId)).catch(() => null);
    if (!booking || booking.class_type !== 'group') {
      return Response.json({ error: 'Clase de grupo no encontrada' }, { status: 404 });
    }
    if (booking.status !== 'scheduled') {
      return Response.json({ error: 'Esa clase ya no admite inscripciones' }, { status: 400 });
    }

    const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    if (enrolled.some((s) => (s.student_email || '').toLowerCase() === email)) {
      return Response.json({ error: 'Ya estás apuntado a esta clase' }, { status: 400 });
    }
    const maxStudents = booking.max_students || 4;
    if (enrolled.length >= maxStudents) {
      return Response.json({ error: 'La clase ya está completa' }, { status: 409 });
    }

    const teacher = await db.entities.Teacher.get(String(booking.teacher_id)).catch(() => null);
    if (!teacher) {
      return Response.json({ error: 'Profesor no encontrado' }, { status: 404 });
    }

    const updatedEnrolled = [
      ...enrolled,
      {
        student_id: student.id,
        student_name: student.full_name,
        student_email: user.email,
        payment_status: 'pending'
      }
    ];

    // Precio por persona según el número de alumnos, con las tarifas del profesor.
    const count = Math.min(updatedEnrolled.length, 4);
    const subjectInfo = (teacher.subjects || []).find((s) => String(s.subject_id) === String(booking.subject_id));
    const groupPrices = subjectInfo?.group_prices || {};
    const pricePerHour = Number(groupPrices[String(count)] ?? DEFAULT_GROUP_PRICES[count] ?? subjectInfo?.price_per_hour ?? booking.price);
    const duration = Number(booking.duration_minutes) || 60;
    const newPrice = Number(((pricePerHour * duration) / 60).toFixed(2));

    const update = { enrolled_students: updatedEnrolled, price: newPrice };
    if (teacher.subscription_plan === 'commission') {
      const pct = Number(teacher.commission_percentage ?? 25);
      update.platform_fee = Number((newPrice * pct / 100).toFixed(2));
      update.teacher_payout = Number((newPrice * (1 - pct / 100)).toFixed(2));
    }

    const updated = await db.entities.Booking.update(String(bookingId), update);

    return Response.json({
      booking: {
        ...updated,
        enrolled_students: updatedEnrolled.map((s) =>
          (s.student_email || '').toLowerCase() === email ? s : { student_id: s.student_id, payment_status: s.payment_status }
        )
      }
    });
  } catch (error) {
    console.error('Error en joinGroupClass:', error);
    return Response.json({ error: 'No se ha podido apuntar a la clase' }, { status: 500 });
  }
});
