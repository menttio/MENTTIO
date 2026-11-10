import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Permitir invocación desde el cron del Cloudflare Worker mediante secreto compartido,
    // o desde un admin con sesión iniciada.
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCron = cronSecret && req.headers.get('x-cron-secret') === cronSecret;

    if (!isCron) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const now = new Date();
    
    // Get all scheduled bookings
    const scheduledBookings = await base44.asServiceRole.entities.Booking.filter({ 
      status: 'scheduled' 
    });

    let updatedCount = 0;

    for (const booking of scheduledBookings) {
      // Parse booking date and time
      const bookingDateTime = new Date(`${booking.date}T${booking.end_time}`);

      // If the class has ended, mark it as completed
      if (bookingDateTime < now) {
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          status: 'completed'
        });
        updatedCount++;

        // Los alumnos de la clase. En las de grupo son varios, y antes no se avisaba a
        // ninguno: solo se miraba booking.student_email, que en las grupales esta vacio.
        const alumnos = booking.class_type === 'group'
          ? (booking.enrolled_students || []).map((s: any) => ({
              id: s.student_id,
              email: s.student_email,
            }))
          : [{ id: booking.student_id, email: booking.student_email }];

        const pagoPendiente = booking.payment_status === 'pending';

        // Quien ya haya valorado esta clase no recibe el recordatorio. Al terminar la clase
        // no deberia haber ninguna, pero el cron puede pasar dos veces por la misma reserva
        // si una ejecucion se queda a medias.
        let yaValoraron: string[] = [];
        try {
          const previas = await base44.asServiceRole.entities.Review.filter({ booking_id: booking.id });
          yaValoraron = previas.map((r: any) => r.student_id).filter(Boolean);
        } catch (reviewError) {
          console.error('Error leyendo reseñas previas:', reviewError);
        }

        for (const alumno of alumnos) {
          if (!alumno.email) continue;

          if (pagoPendiente) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: alumno.id,
              user_email: alumno.email,
              type: 'booking_new',
              title: 'Clase completada - Pago pendiente',
              message: `Tu clase de ${booking.subject_name} con ${booking.teacher_name} ha finalizado. Por favor, procede con el pago.`,
              related_id: booking.id,
              link_page: 'MyClasses'
            });
          }

          // Recordatorio para valorar la clase. Es el paso que faltaba: el boton de dejar
          // resena ya estaba en la tarjeta de la clase, pero nadie entra a "Mis clases"
          // despues de una clase que ya ha dado, asi que no se dejaba ninguna.
          const puedeValorar = !yaValoraron.includes(alumno.id);
          if (puedeValorar) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: alumno.id,
              user_email: alumno.email,
              type: 'booking_new',
              title: '¿Cómo ha ido la clase?',
              message: `Valora tu clase de ${booking.subject_name} con ${booking.teacher_name}. Son dos toques y le ayuda mucho.`,
              related_id: booking.id,
              link_page: 'MyClasses'
            });
          }

          // Fase 3 (10/11/2026): aqui se enviaba ademas un aviso push por clase y alumno. Las push
          // estan desactivadas (gastaban creditos de Base44) y cada llamada era una invocacion de
          // funcion mas. Se quita; el aviso dentro de la app de arriba se mantiene.
          void pagoPendiente; void puedeValorar;
        }
      }
    }

    // Fase 3 (10/11/2026): el numero de clases de cada profesor (ficha y "Mis profesores") es el
    // real de Menttio. Se recalcula solo cuando cambia algo.
    if (updatedCount > 0) {
      try {
        const db = base44.asServiceRole;
        const completadas = await db.entities.Booking.filter({ status: 'completed' }, '-date', 5000);
        const cuenta = new Map();
        for (const b of completadas) if (b.teacher_id) cuenta.set(String(b.teacher_id), (cuenta.get(String(b.teacher_id)) || 0) + 1);
        const profesores = await db.entities.Teacher.list('-created_date', 500);
        for (const t of profesores) {
          const real = cuenta.get(String(t.id)) || 0;
          if (t.total_classes !== real) await db.entities.Teacher.update(t.id, { total_classes: real });
        }
      } catch (e) {
        console.error('Recuento de clases:', e.message);
      }
    }

    return Response.json({ 
      success: true, 
      message: `${updatedCount} clases marcadas como completadas` 
    });
  } catch (error) {
    console.error('Error marking completed classes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});