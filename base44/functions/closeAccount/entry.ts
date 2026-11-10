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
// Lote F (P23, 10/11/2026, decision 1a del titular): la baja ahora es completa.
//  - Clases futuras del usuario: se cancelan (y se avisa a la otra parte).
//  - Reservas pasadas: se quitan nombre, correo, telefono, notas de progreso y archivos que
//    subio el usuario; se conservan fecha, asignatura, precio, estado e id de pago.
//  - Clases de grupo: se le anonimiza en la lista de alumnos (o se le quita si es futura).
//  - Grabaciones: se registra la retirada del permiso; recordingActions las pasa a cuarentena y
//    a la papelera a los 30 dias (misma regla del lote C).
//  - Resenas: se anonimiza el nombre. Informes a familias: se borran.
//  - Google Calendar: se revoca el acceso en Google antes de borrar la ficha.
//  - Stripe: se cancelan las suscripciones y se borra el cliente (las facturas las conserva Stripe).
//  - Registro del worker (Supabase): se anonimiza y se cancelan sus clases futuras (/baja).
//  - Perfil, mensajes, conversaciones, avisos y suscripciones push: se borran.
// No se borran (obligacion legal o prueba): los eventos de Consent y TrialUsed.

const ANONIMO = 'Usuario dado de baja';
const lista = (x) => (Array.isArray(x) ? x : []);
const lower = (s) => String(s ?? '').trim().toLowerCase();
const hoy = () => new Date().toISOString().split('T')[0];

async function revocarGoogle(tokens) {
  const t = tokens?.refresh_token || tokens?.access_token;
  if (!t) return false;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t)}`, { method: 'POST' });
    return r.ok;
  } catch (e) {
    console.error('revocar Google:', e.message);
    return false;
  }
}

// El worker es el destino de los avisos N8N_* (ya no es n8n). Solo se llama si de verdad apunta
// a un Worker de Cloudflare.
async function bajaEnWorker(email) {
  try {
    const base = Deno.env.get('N8N_CANCEL_WEBHOOK_URL') || '';
    const origen = new URL(base);
    if (!origen.hostname.endsWith('.workers.dev')) return { omitido: 'sin worker' };
    const r = await fetch(`${origen.origin}/baja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-automation-key': Deno.env.get('AUTOMATION_SECRET') || '' },
      body: JSON.stringify({ email }),
    });
    return await r.json().catch(() => ({ status: r.status }));
  } catch (e) {
    console.error('baja en el worker:', e.message);
    return { error: e.message };
  }
}

async function avisar(db, a) {
  if (!a.user_email) return;
  await db.entities.Notification.create(a).catch((e) => console.error('aviso:', e.message));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion' }, { status: 401 });
    }

    const email = lower(user.email);
    const db = base44.asServiceRole;
    const resumen = {
      perfil: null, reservas_anonimizadas: 0, clases_canceladas: 0, grupos: 0, conversaciones: 0,
      avisos: 0, resenas: 0, informes: 0, google_revocado: false, worker: null,
    };

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
        for (const estado of ['active', 'trialing', 'past_due']) {
          try {
            const subs = await stripe.subscriptions.list({ customer: c, status: estado });
            for (const s of subs.data) {
              if (s.id === teacher.stripe_subscription_id) continue;
              await stripe.subscriptions.cancel(s.id);
            }
          } catch (e) { console.error(`cancelar ${estado} de ${c}:`, e.message); }
        }
        // Las facturas las conserva Stripe aunque se borre el cliente.
        try { await stripe.customers.del(c); } catch (e) { console.error(`borrar cliente ${c}:`, e.message); }
      }

      if (await revocarGoogle(teacher.google_calendar_tokens)) resumen.google_revocado = true;

      const disponibilidades = await db.entities.Availability.filter({ teacher_id: teacher.id });
      for (const a of disponibilidades) await db.entities.Availability.delete(a.id);

      // Las reservas NO se borran: se anonimiza al profesor dentro de ellas. Las futuras se
      // cancelan y se avisa a los alumnos.
      const suyas = await db.entities.Booking.filter({ teacher_id: teacher.id });
      for (const b of suyas) {
        const futura = b.status === 'scheduled' && String(b.date) >= hoy();
        await db.entities.Booking.update(b.id, {
          teacher_name: ANONIMO,
          teacher_email: null,
          teacher_phone: null,
          ...(futura ? { status: 'cancelled' } : {}),
        });
        resumen.reservas_anonimizadas++;
        if (futura) {
          resumen.clases_canceladas++;
          const alumnos = b.class_type === 'group'
            ? lista(b.enrolled_students).map((s) => ({ id: s?.student_id, email: s?.student_email }))
            : [{ id: b.student_id, email: b.student_email }];
          for (const a of alumnos) {
            await avisar(db, {
              user_id: a.id, user_email: a.email, type: 'booking_cancelled', title: 'Clase cancelada',
              related_id: b.id, link_page: 'MyClasses',
              message: `Tu clase de ${b.subject_name} del ${b.date} se ha cancelado porque el profesor ha cerrado su cuenta.`,
            });
          }
        }
      }

      const informes = await db.entities.FamilyReport.filter({ teacher_id: teacher.id }).catch(() => []);
      for (const f of informes) { await db.entities.FamilyReport.delete(f.id); resumen.informes++; }
      const resenas = await db.entities.Review.filter({ teacher_id: teacher.id }).catch(() => []);
      for (const r of resenas) { await db.entities.Review.update(r.id, { teacher_name: ANONIMO }); resumen.resenas++; }

      await db.entities.Teacher.delete(teacher.id);
    }

    // ---------- Alumno ----------
    const students = await db.entities.Student.filter({ user_email: user.email });
    if (students.length > 0) {
      resumen.perfil = resumen.perfil || 'alumno';
      const idsAlumno = new Set(students.map((s) => String(s.id)));

      for (const s of students) {
        if (await revocarGoogle(s.google_calendar_tokens)) resumen.google_revocado = true;
      }

      // Grabaciones: retirar el permiso. recordingActions las manda a cuarentena y a la papelera.
      await db.entities.Consent.create({
        user_email: user.email,
        student_id: students[0].id,
        type: 'grabacion',
        granted: false,
        event_date: new Date().toISOString(),
        description: 'Baja de la cuenta: retirada del permiso de grabacion',
      }).catch((e) => console.error('Consent de baja:', e.message));

      const suyas = await db.entities.Booking.filter({ student_email: user.email });
      for (const b of suyas) {
        const futura = b.status === 'scheduled' && String(b.date) >= hoy();
        await db.entities.Booking.update(b.id, {
          student_name: ANONIMO,
          student_email: null,
          student_phone: null,
          progress_note: null,
          progress_rating: null,
          homework_done: null,
          files: lista(b.files).filter((f) => ![email, 'student'].includes(lower(f?.uploaded_by))),
          ...(futura ? { status: 'cancelled' } : {}),
        });
        resumen.reservas_anonimizadas++;
        if (futura) {
          resumen.clases_canceladas++;
          await avisar(db, {
            user_id: b.teacher_id, user_email: b.teacher_email, type: 'booking_cancelled', title: 'Clase cancelada',
            related_id: b.id, link_page: 'TeacherCalendar',
            message: `La clase de ${b.subject_name} del ${b.date} se ha cancelado porque el alumno ha cerrado su cuenta.`,
          });
        }
      }

      // Clases de grupo en las que figura como apuntado.
      const grupos = await db.entities.Booking.filter({ class_type: 'group' }, '-date', 2000).catch(() => []);
      for (const b of grupos) {
        const enrolled = lista(b.enrolled_students);
        if (!enrolled.some((s) => lower(s?.student_email) === email)) continue;
        const futura = b.status === 'scheduled' && String(b.date) >= hoy();
        const nueva = futura
          ? enrolled.filter((s) => lower(s?.student_email) !== email)
          : enrolled.map((s) => (lower(s?.student_email) === email
            ? { student_id: s.student_id, student_name: ANONIMO, student_email: null, payment_status: s.payment_status }
            : s));
        await db.entities.Booking.update(b.id, {
          enrolled_students: nueva,
          files: lista(b.files).filter((f) => lower(f?.uploaded_by) !== email),
        });
        resumen.grupos++;
      }

      for (const id of idsAlumno) {
        const resenas = await db.entities.Review.filter({ student_id: id }).catch(() => []);
        for (const r of resenas) { await db.entities.Review.update(r.id, { student_name: ANONIMO }); resumen.resenas++; }
        const informes = await db.entities.FamilyReport.filter({ student_id: id }).catch(() => []);
        for (const f of informes) { await db.entities.FamilyReport.delete(f.id); resumen.informes++; }
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

    // ---------- Registro del worker (Supabase) ----------
    resumen.worker = await bajaEnWorker(email);

    console.log(`Baja completada para ${email}:`, JSON.stringify(resumen));
    return Response.json({ success: true, ...resumen });
  } catch (error) {
    console.error('Error en closeAccount:', error);
    return Response.json({ error: 'No se ha podido completar la baja' }, { status: 500 });
  }
}
