import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

// Sustituye a deleteAccount, que borraba las reservas de quien se daba de baja.
//
// El problema: si un alumno se da de baja, el profesor pierde el historial de esas clases y
// el registro de lo que cobro. Eso contradice la politica de conservacion ("reservas y pagos
// no se borran: obligaciones fiscales y contables") y deja al profesor sin poder justificar
// una factura. El derecho de supresion del RGPD no borra las obligaciones contables de un
// tercero: lo correcto es anonimizar al interesado dentro del registro, no destruir el registro.
//
// Lo que hace ahora:
//  - Borra el perfil, los mensajes, las notificaciones y las suscripciones de aviso.
//  - Cancela la suscripcion de Stripe si la hay.
//  - En las reservas, sustituye nombre, correo y telefono por "Usuario dado de baja" y
//    conserva fecha, asignatura, precio y estado de pago.
//  - Un profesor que se da de baja no puede llevarse por delante las reservas de sus alumnos.

const ANONIMO = 'Usuario dado de baja';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion' }, { status: 401 });
    }

    const email = (user.email || '').toLowerCase();
    const db = base44.asServiceRole;
    const resumen = { perfil: null, reservas_anonimizadas: 0, conversaciones: 0, avisos: 0 };

    // ---------- Profesor ----------
    const teachers = await db.entities.Teacher.filter({ user_email: user.email });
    if (teachers.length > 0) {
      const teacher = teachers[0];
      resumen.perfil = 'profesor';

      // Cancelar lo que tenga contratado, buscando tambien por correo por si el id no se guardo.
      const clientes = new Set();
      if (teacher.stripe_customer_id) clientes.add(teacher.stripe_customer_id);
      try {
        const porEmail = await stripe.customers.list({ email: teacher.user_email, limit: 10 });
        for (const c of porEmail.data) clientes.add(c.id);
      } catch (e) {
        console.error('clientes por email:', e.message);
      }
      if (teacher.stripe_subscription_id) {
        try { await stripe.subscriptions.cancel(teacher.stripe_subscription_id); }
        catch (e) { console.error('cancelar por id:', e.message); }
      }
      for (const c of clientes) {
        for (const estado of ['active', 'trialing']) {
          try {
            const subs = await stripe.subscriptions.list({ customer: c, status: estado });
            for (const s of subs.data) {
              if (s.id === teacher.stripe_subscription_id) continue;
              await stripe.subscriptions.cancel(s.id);
            }
          } catch (e) { console.error(`cancelar ${estado} de ${c}:`, e.message); }
        }
      }

      const disponibilidades = await db.entities.Availability.filter({ teacher_id: teacher.id });
      for (const a of disponibilidades) await db.entities.Availability.delete(a.id);

      // Las reservas NO se borran: se anonimiza al profesor dentro de ellas.
      const suyas = await db.entities.Booking.filter({ teacher_email: user.email });
      for (const b of suyas) {
        await db.entities.Booking.update(b.id, {
          teacher_name: ANONIMO,
          teacher_email: null,
          teacher_phone: null,
        });
        resumen.reservas_anonimizadas++;
      }

      await db.entities.Teacher.delete(teacher.id);
    }

    // ---------- Alumno ----------
    const students = await db.entities.Student.filter({ user_email: user.email });
    if (students.length > 0) {
      resumen.perfil = resumen.perfil || 'alumno';

      const suyas = await db.entities.Booking.filter({ student_email: user.email });
      for (const b of suyas) {
        await db.entities.Booking.update(b.id, {
          student_name: ANONIMO,
          student_email: null,
        });
        resumen.reservas_anonimizadas++;
      }

      for (const s of students) await db.entities.Student.delete(s.id);
    }

    // ---------- Conversaciones, avisos y suscripciones push ----------
    const conversaciones = await db.entities.Conversation.filter({
      $or: [{ student_email: user.email }, { teacher_email: user.email }],
    });
    for (const c of conversaciones) {
      const mensajes = await db.entities.Message.filter({ conversation_id: c.id });
      for (const m of mensajes) await db.entities.Message.delete(m.id);
      await db.entities.Conversation.delete(c.id);
      resumen.conversaciones++;
    }

    const avisos = await db.entities.Notification.filter({ user_email: user.email });
    for (const n of avisos) { await db.entities.Notification.delete(n.id); resumen.avisos++; }

    const push = await db.entities.PushSubscription.filter({ user_email: user.email });
    for (const p of push) await db.entities.PushSubscription.delete(p.id);

    console.log(`Baja completada para ${email}:`, JSON.stringify(resumen));
    return Response.json({ success: true, ...resumen });
  } catch (error) {
    console.error('Error en closeAccount:', error);
    return Response.json({ error: 'No se ha podido completar la baja' }, { status: 500 });
  }
}
