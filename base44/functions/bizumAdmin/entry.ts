import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Pantalla de administracion de los Bizums del plan sin cuota.
//
// En ese plan el alumno le hace el Bizum a Menttio, no al profesor. Cuando el alumno pulsa
// "he enviado el pago", la clase queda en pending_confirmation, pero hasta ahora no habia
// forma de confirmarla: se avisaba al profesor, que no es quien ha recibido el dinero.
//
// Tres acciones: listar lo pendiente, confirmar que el Bizum llego, o rechazarlo.
// Al confirmar se guarda el reparto (lo que se queda Menttio y lo que se le debe al profesor)
// para que el total a pagar a fin de mes salga de datos y no de una hoja aparte.

function redondea(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo el administrador' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const accion = String(body.accion || 'listar');

    // Profesores del plan sin cuota: son los unicos cuyos Bizums cobra Menttio.
    const comisionistas = await db.entities.Teacher.filter({ subscription_plan: 'commission' });
    const porId = new Map(comisionistas.map((t) => [String(t.id), t]));

    if (accion === 'listar') {
      const pendientes = await db.entities.Booking.filter({
        payment_status: 'pending_confirmation',
        payment_method: 'bizum',
      });

      const mias = pendientes
        .filter((b) => porId.has(String(b.teacher_id)))
        .map((b) => {
          const t = porId.get(String(b.teacher_id));
          const pct = Number(t.commission_percentage ?? 10);
          const precio = Number(b.price || 0);
          const comision = redondea((precio * pct) / 100);
          return {
            id: b.id,
            fecha: b.date,
            hora: b.start_time,
            asignatura: b.subject_name,
            alumno: b.student_name,
            profesor: b.teacher_name,
            profesor_email: b.teacher_email,
            precio,
            comision_pct: pct,
            comision,
            para_el_profesor: redondea(precio - comision),
          };
        })
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

      const totalProfesores = redondea(mias.reduce((s, x) => s + x.para_el_profesor, 0));
      const totalMenttio = redondea(mias.reduce((s, x) => s + x.comision, 0));

      return Response.json({ pendientes: mias, total_para_profesores: totalProfesores, total_menttio: totalMenttio });
    }

    const bookingId = String(body.bookingId || '');
    if (!bookingId) {
      return Response.json({ error: 'bookingId requerido' }, { status: 400 });
    }

    const booking = await db.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    if (accion === 'rechazar') {
      await db.entities.Booking.update(bookingId, {
        payment_status: 'pending',
        payment_method: null,
      });
      await db.entities.Notification.create({
        user_id: booking.student_id,
        user_email: booking.student_email,
        type: 'payment_pending_confirmation',
        title: 'No nos consta tu Bizum',
        message: `No hemos localizado el Bizum de ${booking.price}€ por la clase de ${booking.subject_name}. Revisa el envio o escribenos.`,
        related_id: bookingId,
        link_page: 'MyClasses',
      });
      return Response.json({ ok: true, estado: 'pending' });
    }

    if (accion === 'confirmar') {
      const teacher = porId.get(String(booking.teacher_id));
      const pct = Number(teacher?.commission_percentage ?? 10);
      const precio = Number(booking.price || 0);
      const comision = redondea((precio * pct) / 100);

      await db.entities.Booking.update(bookingId, {
        payment_status: 'paid',
        payment_method: 'bizum',
        platform_fee: comision,
        teacher_payout: redondea(precio - comision),
      });

      await db.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'payment_pending_confirmation',
        title: 'Pago confirmado',
        message: `Menttio ha recibido el Bizum de ${booking.student_name} por la clase de ${booking.subject_name}. Te corresponden ${redondea(precio - comision)}€, que se abonan a final de mes.`,
        related_id: bookingId,
        link_page: 'TeacherCalendar',
      });

      return Response.json({ ok: true, estado: 'paid', comision, para_el_profesor: redondea(precio - comision) });
    }

    return Response.json({ error: 'Accion no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('bizumAdmin:', error);
    return Response.json({ error: 'error interno' }, { status: 500 });
  }
}
