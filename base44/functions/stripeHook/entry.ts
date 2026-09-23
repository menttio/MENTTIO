import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Sustituye a stripeEvents (y antes a stripeWebhook). Mejoras acumuladas:
//  1) El plan se identifica por el ID del precio, leído de AppSetting, no adivinando por el
//     importe. La regla original («30 € o más es premium») se rompía con 29,99 €.
//  2) Contempla los precios anuales: 130 € al año es Esencial, no premium, cosa que cualquier
//     respaldo por importe con un umbral único clasificaría mal.
//  3) Lee el identificador de la reserva de booking_id, bookingId o client_reference_id.
const POR_DEFECTO = {
  stripe_price_esencial_mensual: 'price_1UImwTHZYiECTxiywGeSWisR',
  stripe_price_esencial_anual: 'price_1UImwTHZYiECTxiygtqQyOWz',
  stripe_price_grabacion_mensual: 'price_1UImwUHZYiECTxiyGz44YV8B',
  stripe_price_grabacion_anual: 'price_1UImwVHZYiECTxiyFKnzG6m0',
};

async function catalogo(db) {
  const mapa = { ...POR_DEFECTO };
  try {
    const filas = await db.entities.AppSetting.list();
    for (const fila of filas) {
      if (fila.key in mapa && String(fila.value || '').startsWith('price_')) {
        mapa[fila.key] = fila.value.trim();
      }
    }
  } catch (e) {
    console.error('AppSetting:', e.message);
  }
  return mapa;
}

function planDesdePrecio(mapa, priceId, importeCentimos, intervalo) {
  if (priceId === mapa.stripe_price_grabacion_mensual || priceId === mapa.stripe_price_grabacion_anual) return 'premium';
  if (priceId === mapa.stripe_price_esencial_mensual || priceId === mapa.stripe_price_esencial_anual) return 'basic';
  // Respaldo por importe, con un umbral distinto según el periodo de facturación.
  const umbral = intervalo === 'year' ? 20000 : 2000;
  return Number(importeCentimos) >= umbral ? 'premium' : 'basic';
}

export default async function(req) {
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
        if (session.mode === 'subscription') {
          console.log('checkout de suscripción; se gestiona en invoice.payment_succeeded');
          break;
        }
        if (bookingId) {
          await db.entities.Booking.update(bookingId, {
            payment_status: 'paid',
            payment_method: 'stripe',
            stripe_payment_id: session.payment_intent || session.id,
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
        const mapa = await catalogo(db);
        const plan = planDesdePrecio(mapa, item?.price?.id, item?.price?.unit_amount, item?.price?.recurring?.interval);
        const expira = new Date(subscription.current_period_end * 1000).toISOString().split('T')[0];

        const teachers = await db.entities.Teacher.filter({ stripe_customer_id: invoice.customer });
        if (teachers.length > 0) {
          await db.entities.Teacher.update(teachers[0].id, {
            subscription_active: true,
            subscription_plan: plan,
            subscription_expires: expira,
            stripe_subscription_id: subscriptionId,
            trial_active: false,
            trial_used: true,
          });
          console.log(`Suscripción activada para ${teachers[0].id} (${plan}, hasta ${expira})`);
        } else {
          console.warn(`Sin profesor con stripe_customer_id ${invoice.customer}`);
        }
        break;
      }

      // Entra en prueba gratuita: hay que reflejarlo o el Layout lo manda a renovar.
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        if (subscription.status !== 'trialing') break;

        const item = subscription.items.data[0];
        const mapa = await catalogo(db);
        const plan = planDesdePrecio(mapa, item?.price?.id, item?.price?.unit_amount, item?.price?.recurring?.interval);
        const finPrueba = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString().split('T')[0]
          : null;

        const teachers = await db.entities.Teacher.filter({ stripe_customer_id: subscription.customer });
        if (teachers.length > 0) {
          await db.entities.Teacher.update(teachers[0].id, {
            subscription_active: true,
            subscription_plan: plan,
            trial_active: true,
            trial_end_date: finPrueba,
            subscription_expires: finPrueba,
            stripe_subscription_id: subscription.id,
          });
          console.log(`Prueba activa para ${teachers[0].id} (${plan}, hasta ${finPrueba})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teachers = await db.entities.Teacher.filter({ stripe_customer_id: subscription.customer });
        if (teachers.length > 0) {
          await db.entities.Teacher.update(teachers[0].id, {
            subscription_active: false,
            trial_active: false,
            stripe_subscription_id: null,
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
}
