import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

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
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    switch (event.type) {

      // ── Pago de clase completado ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          await base44.asServiceRole.entities.Booking.update(bookingId, {
            payment_status: 'paid',
            stripe_payment_id: session.payment_intent || session.id
          });
          console.log(`✅ Booking ${bookingId} marcada como pagada`);
        }
        break;
      }

      // ── Pago de suscripción exitoso ───────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break; // ignorar facturas que no son de suscripción

        // Obtener la suscripción para saber el plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;

        // Determinar plan según precio (basic ~14,99 / premium ~36,99)
        const amount = subscription.items.data[0]?.price?.unit_amount;
        const plan = amount >= 3000 ? 'premium' : 'basic';

        const expiresDate = new Date(subscription.current_period_end * 1000)
          .toISOString().split('T')[0];

        const teachers = await base44.asServiceRole.entities.Teacher.filter({
          stripe_customer_id: customerId
        });

        if (teachers.length > 0) {
          await base44.asServiceRole.entities.Teacher.update(teachers[0].id, {
            subscription_active: true,
            subscription_plan: plan,
            subscription_expires: expiresDate,
            stripe_subscription_id: subscriptionId,
            trial_active: false
          });
          console.log(`✅ Suscripción activada para teacher ${teachers[0].id} (${plan})`);
        } else {
          console.warn(`⚠️ No se encontró teacher con stripe_customer_id: ${customerId}`);
        }
        break;
      }

      // ── Suscripción cancelada / eliminada ─────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const teachers = await base44.asServiceRole.entities.Teacher.filter({
          stripe_customer_id: customerId
        });

        if (teachers.length > 0) {
          await base44.asServiceRole.entities.Teacher.update(teachers[0].id, {
            subscription_active: false,
            stripe_subscription_id: null
          });
          console.log(`✅ Suscripción desactivada para teacher ${teachers[0].id}`);
        } else {
          console.warn(`⚠️ No se encontró teacher con stripe_customer_id: ${customerId}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Evento no gestionado: ${event.type}`);
    }
  } catch (err) {
    console.error('Error procesando evento:', err.message);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
});