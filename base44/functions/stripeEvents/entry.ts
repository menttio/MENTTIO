import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Sustituye a stripeWebhook. Dos mejoras:
//  1) El plan se identifica por el ID del precio de Stripe (secretos STRIPE_PRICE_ESENCIAL y
//     STRIPE_PRICE_GRABACION), no adivinando por el importe. La regla anterior («más de 30 € es
//     premium») se rompía con el precio nuevo de 29,99 €.
//  2) Lee el identificador de la reserva tanto de booking_id como de client_reference_id.
function planDesdePrecio(priceId, importeCentimos) {
  const esencial = Deno.env.get('STRIPE_PRICE_ESENCIAL');
  const grabacion = Deno.env.get('STRIPE_PRICE_GRABACION');
  if (grabacion && priceId === grabacion) return 'premium';
  if (esencial && priceId === esencial) return 'basic';
  // Respaldo por importe, con el umbral a mitad de camino entre 12,99 € y 29,99 €.
  return Number(importeCentimos) >= 2000 ? 'premium' : 'basic';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Firma del webhook no válida:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createClientFromRequest(req).asServiceRole;

  try {
    switch (event.type) {
      // Pago de una clase
      case 'checkout.session.completed': {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id || session.metadata?.bookingId || session.client_reference_id;
        if (bookingId) {
          await db.entities.Booking.update(bookingId, {
            payment_status: 'paid',
            payment_method: 'stripe',
            stripe_payment_id: session.payment_intent || session.id
          });
          console.log(`Reserva ${bookingId} marcada como pagada`);
        } else {
          console.warn('checkout.session.completed sin identificador de reserva');
        }
        break;
      }

      // Suscripción del profesor cobrada
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        const plan = planDesdePrecio(item?.price?.id, item?.price?.unit_amount);
        const expira = new Date(subscription.current_period_end * 1000).toISOString().split('T')[0];

        const teachers = await db.entities.Teacher.filter({ stripe_customer_id: invoice.customer });
        if (teachers.length > 0) {
          await db.entities.Teacher.update(teachers[0].id, {
            subscription_active: true,
            subscription_plan: plan,
            subscription_expires: expira,
            stripe_subscription_id: subscriptionId,
            trial_active: false
          });
          console.log(`Suscripción activada para ${teachers[0].id} (${plan})`);
        } else {
          console.warn(`Sin profesor con stripe_customer_id ${invoice.customer}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teachers = await db.entities.Teacher.filter({ stripe_customer_id: subscription.customer });
        if (teachers.length > 0) {
          await db.entities.Teacher.update(teachers[0].id, {
            subscription_active: false,
            stripe_subscription_id: null
          });
          console.log(`Suscripción desactivada para ${teachers[0].id}`);
        }
        break;
      }

      default:
        console.log(`Evento no gestionado: ${event.type}`);
    }
  } catch (err) {
    console.error('Error procesando el evento:', err.message);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
});
