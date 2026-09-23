import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Sustituye a classCheckout. Unico cambio: las direcciones de vuelta de Stripe.
//
// Apuntaban a /payment-success y /my-classes, y las paginas de la app se llaman
// /PaymentSuccess y /MyClasses. Al terminar de pagar, el alumno aterrizaba en un "no existe
// en esta aplicacion": el cobro se habia hecho, pero el alumno se quedaba pensando que no.
// Venia asi desde el principio y nadie lo detecto porque nunca se habia pagado con tarjeta.
function allowedPrices(teacher, subjectId) {
  const prices = [];
  const subjects = Array.isArray(teacher?.subjects) ? teacher.subjects : [];
  for (const s of subjects) {
    if (String(s.subject_id) !== String(subjectId)) continue;
    if (typeof s.price_per_hour === 'number') prices.push(s.price_per_hour);
    if (s.group_prices && typeof s.group_prices === 'object') {
      for (const value of Object.values(s.group_prices)) {
        if (typeof value === 'number') prices.push(value);
      }
    }
  }
  return prices;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion' }, { status: 401 });
    }

    const { bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return Response.json({ error: 'bookingId es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const booking = await db.entities.Booking.get(String(bookingId)).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const email = (user.email || '').toLowerCase();
    const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    const isStudent =
      (booking.student_email || '').toLowerCase() === email ||
      enrolled.some((s) => (s.student_email || '').toLowerCase() === email);
    if (!isStudent) {
      return Response.json({ error: 'Esta reserva no es tuya' }, { status: 403 });
    }
    if (booking.status === 'cancelled') {
      return Response.json({ error: 'La clase esta cancelada' }, { status: 400 });
    }
    if (booking.payment_status === 'paid') {
      return Response.json({ error: 'Esta clase ya esta pagada' }, { status: 400 });
    }

    const teacher = await db.entities.Teacher.get(String(booking.teacher_id)).catch(() => null);
    if (!teacher) {
      return Response.json({ error: 'Profesor no encontrado' }, { status: 404 });
    }

    const price = Number(booking.price);
    if (!Number.isFinite(price) || price <= 0) {
      return Response.json({ error: 'La reserva no tiene un precio valido' }, { status: 400 });
    }
    const valid = allowedPrices(teacher, booking.subject_id);
    if (valid.length > 0 && !valid.some((p) => Math.abs(p - price) < 0.01)) {
      console.error('Precio fuera de tarifa', { bookingId, price, valid });
      return Response.json({ error: 'El precio de la clase no coincide con las tarifas del profesor' }, { status: 400 });
    }

    const conectado = Boolean(teacher.stripe_connect_account_id && teacher.stripe_connect_enabled);
    if (!conectado) {
      return Response.json(
        { error: 'El profesor aun no ha configurado los cobros con tarjeta' },
        { status: 400 },
      );
    }

    const students = await db.entities.Student.filter({ user_email: user.email });
    const student = students[0] || null;

    const origin = req.headers.get('origin') || 'https://menttio.com';
    const amountCents = Math.round(price * 100);

    const esComision = teacher.subscription_plan === 'commission';
    const pct = esComision ? Number(teacher.commission_percentage ?? 10) : 0;
    const feeCents = esComision ? Math.round((amountCents * pct) / 100) : 0;

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      booking_id: String(booking.id),
      bookingId: String(booking.id),
      student_id: student ? student.id : '',
      student_email: user.email,
      teacher_id: String(booking.teacher_id),
      teacher_email: booking.teacher_email || '',
      subject_name: booking.subject_name || '',
      date: booking.date || '',
      start_time: booking.start_time || '',
      price: String(price),
      comision_pct: String(pct),
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Clase de ${booking.subject_name}`,
              description: `Con ${booking.teacher_name} - ${booking.date} a las ${booking.start_time}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/MyClasses`,
      client_reference_id: String(booking.id),
      metadata,
      payment_intent_data: {
        // El dinero va a la cuenta del profesor y Stripe retiene ahi mismo la comision de
        // Menttio. Con on_behalf_of, ademas, la comision de Stripe la soporta el profesor.
        transfer_data: { destination: teacher.stripe_connect_account_id },
        on_behalf_of: teacher.stripe_connect_account_id,
        ...(feeCents > 0 ? { application_fee_amount: feeCents } : {}),
        metadata,
      },
    });

    return Response.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error('Error en classPayment:', error);
    return Response.json({ error: 'No se ha podido iniciar el pago' }, { status: 500 });
  }
}
