import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Devuelve como puede pagarse una clase y con que desglose exacto.
//
// Se calcula en el servidor a proposito: si lo hiciera el navegador, cualquiera podria
// cambiar la comision o el numero de Bizum antes de que se pinte en pantalla.
//
// Reglas:
//  - Plan mensual (Esencial / Completo): Menttio no cobra nada. El Bizum va al telefono
//    del profesor y la tarjeta solo esta disponible si ha conectado su cuenta de Stripe.
//  - Plan sin cuota (comision): el cobro se centraliza en Menttio. El Bizum va al telefono de
//    Menttio y el profesor cobra su parte a final de mes; por tarjeta, Stripe reparte al momento.
//  - La comision de Stripe la asume siempre el profesor, en los dos planes.

const BIZUM_MENTTIO = '665562076';

// Tarifa de Stripe para tarjetas europeas. Es una estimacion para ensenar en pantalla: el
// importe exacto depende de la tarjeta, asi que se muestra siempre como aproximado.
const STRIPE_PCT = 0.015;
const STRIPE_FIJO = 0.25;

function redondea(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.bookingId || body.booking_id || '');
    if (!bookingId) {
      return Response.json({ error: 'bookingId requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const booking = await db.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // Solo el alumno de esa clase o su profesor pueden consultar esto.
    const esAlumno = (booking.student_email || '').toLowerCase() === user.email.toLowerCase();
    const esProfesor = (booking.teacher_email || '').toLowerCase() === user.email.toLowerCase();
    if (!esAlumno && !esProfesor && user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const teachers = await db.entities.Teacher.filter({ id: booking.teacher_id });
    const teacher = teachers[0];
    if (!teacher) {
      return Response.json({ error: 'Profesor no encontrado' }, { status: 404 });
    }

    const precio = Number(booking.price || 0);
    const esComision = teacher.subscription_plan === 'commission';
    const pct = esComision ? Number(teacher.commission_percentage ?? 10) : 0;

    const comision = redondea((precio * pct) / 100);
    const stripeEstimado = precio > 0 ? redondea(precio * STRIPE_PCT + STRIPE_FIJO) : 0;

    const conectado = Boolean(teacher.stripe_connect_account_id && teacher.stripe_connect_enabled);

    // Con tarjeta el profesor asume la comision de Stripe; por Bizum no hay comision de Stripe.
    const profesorTarjeta = redondea(precio - comision - stripeEstimado);
    const profesorBizum = redondea(precio - comision);

    const metodos = [];
    if (conectado) metodos.push('tarjeta');
    metodos.push('bizum');

    return Response.json({
      plan: teacher.subscription_plan || 'basic',
      es_comision: esComision,
      metodos,
      tarjeta: {
        disponible: conectado,
        motivo_no_disponible: conectado ? null : 'El profesor aun no ha configurado los cobros con tarjeta',
      },
      bizum: {
        telefono: esComision ? BIZUM_MENTTIO : (booking.teacher_phone || teacher.phone || ''),
        titular: esComision ? 'Menttio' : (booking.teacher_name || teacher.full_name || 'Tu profesor'),
        // En el plan sin cuota el dinero lo recibe Menttio y reparte despues.
        cobra_menttio: esComision,
      },
      desglose: {
        precio,
        comision_pct: pct,
        comision,
        stripe_estimado: stripeEstimado,
        profesor_tarjeta: profesorTarjeta,
        profesor_bizum: profesorBizum,
        menttio: comision,
      },
    });
  } catch (error) {
    console.error('paymentOptions:', error);
    return Response.json({ error: 'No se han podido calcular las formas de pago' }, { status: 500 });
  }
}
