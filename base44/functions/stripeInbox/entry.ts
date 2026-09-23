import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Recibe los avisos de Stripe. Sustituye a stripeHook / stripeEvents / stripeWebhook.
//
// Contexto: hasta hoy el webhook de Stripe apuntaba a https://www.menttio.com a secas, es
// decir, a la portada. Stripe recibia el HTML con un 200 y daba el aviso por entregado, pero
// no lo procesaba nadie. Por eso ningun pago con tarjeta marco nunca una clase como pagada.
//
// La cuenta envia con la version de API 2026-03-25.dahlia, que movio de sitio varios campos
// respecto a la que usa el SDK. De ahi que aqui se lean de forma defensiva, probando tanto la
// ubicacion nueva como la antigua: si Stripe vuelve a cambiarlas, esto no se rompe en silencio.
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
  if (priceId && (priceId === mapa.stripe_price_grabacion_mensual || priceId === mapa.stripe_price_grabacion_anual)) return 'premium';
  if (priceId && (priceId === mapa.stripe_price_esencial_mensual || priceId === mapa.stripe_price_esencial_anual)) return 'basic';
  const umbral = intervalo === 'year' ? 20000 : 2000;
  return Number(importeCentimos) >= umbral ? 'premium' : 'basic';
}

/** El id de la suscripcion cambio de sitio en las versiones nuevas de la API. */
function subscriptionDeFactura(invoice) {
  return invoice?.subscription
    || invoice?.parent?.subscription_details?.subscription
    || invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
    || invoice?.lines?.data?.[0]?.subscription
    || null;
}

/** current_period_end paso de la suscripcion a cada linea. */
function finDePeriodo(subscription) {
  return subscription?.current_period_end
    || subscription?.items?.data?.[0]?.current_period_end
    || null;
}

function aFecha(unix) {
  return unix ? new Date(unix * 1000).toISOString().split('T')[0] : null;
}

async function profesorDeCliente(db, customerId) {
  if (!customerId) return null;
  const teachers = await db.entities.Teacher.filter({ stripe_customer_id: customerId });
  if (teachers.length > 0) return teachers[0];
  // Respaldo: si el profesor se registro sin pasar por el checkout, aun no tiene guardado
  // el cliente de Stripe. Se busca por correo y se deja anotado para la proxima vez.
  try {
    const cliente = await stripe.customers.retrieve(customerId);
    const email = cliente?.email;
    if (!email) return null;
    const porEmail = await db.entities.Teacher.filter({ user_email: email });
    if (porEmail.length > 0) {
      await db.entities.Teacher.update(porEmail[0].id, { stripe_customer_id: customerId });
      return porEmail[0];
    }
  } catch (e) {
    console.error('No se pudo resolver el cliente', customerId, e.message);
  }
  return null;
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
    console.error('Firma del webhook no valida:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createClientFromRequest(req).asServiceRole;
  console.log(`Evento ${event.type} (API ${event.api_version || 'sin version'})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          console.log('Checkout de suscripcion; se gestiona en invoice.payment_succeeded');
          break;
        }
        const bookingId = session.metadata?.booking_id || session.metadata?.bookingId || session.client_reference_id;
        if (!bookingId) {
          console.warn('checkout.session.completed sin identificador de reserva');
          break;
        }
        await db.entities.Booking.update(bookingId, {
          payment_status: 'paid',
          payment_method: 'stripe',
          stripe_payment_id: session.payment_intent || session.id,
        });
        console.log(`Reserva ${bookingId} marcada como pagada`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = subscriptionDeFactura(invoice);
        if (!subscriptionId) {
          console.log('Factura sin suscripcion asociada; nada que hacer');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items?.data?.[0];
        const mapa = await catalogo(db);
        const plan = planDesdePrecio(mapa, item?.price?.id, item?.price?.unit_amount, item?.price?.recurring?.interval);
        const expira = aFecha(finDePeriodo(subscription));

        const teacher = await profesorDeCliente(db, invoice.customer);
        if (!teacher) {
          console.warn(`Sin profesor para el cliente ${invoice.customer}`);
          break;
        }
        await db.entities.Teacher.update(teacher.id, {
          subscription_active: true,
          subscription_plan: plan,
          ...(expira ? { subscription_expires: expira } : {}),
          stripe_subscription_id: subscriptionId,
          trial_active: false,
          trial_used: true,
        });
        console.log(`Suscripcion activada para ${teacher.id} (${plan}, hasta ${expira})`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        if (subscription.status !== 'trialing') break;

        const item = subscription.items?.data?.[0];
        const mapa = await catalogo(db);
        const plan = planDesdePrecio(mapa, item?.price?.id, item?.price?.unit_amount, item?.price?.recurring?.interval);
        const finPrueba = aFecha(subscription.trial_end);

        const teacher = await profesorDeCliente(db, subscription.customer);
        if (!teacher) break;

        await db.entities.Teacher.update(teacher.id, {
          subscription_active: true,
          subscription_plan: plan,
          trial_active: true,
          ...(finPrueba ? { trial_end_date: finPrueba, subscription_expires: finPrueba } : {}),
          stripe_subscription_id: subscription.id,
        });
        console.log(`Prueba activa para ${teacher.id} (${plan}, hasta ${finPrueba})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teacher = await profesorDeCliente(db, subscription.customer);
        if (!teacher) break;
        await db.entities.Teacher.update(teacher.id, {
          subscription_active: false,
          trial_active: false,
          stripe_subscription_id: null,
        });
        console.log(`Suscripcion desactivada para ${teacher.id}`);
        break;
      }

      default:
        // El destino escucha 236 tipos de evento; la inmensa mayoria no nos interesan.
        break;
    }
  } catch (err) {
    console.error(`Error procesando ${event.type}:`, err.message);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
}
