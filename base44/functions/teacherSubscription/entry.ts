import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

// Sustituye a createTeacherSubscription. Dos motivos:
//  1. Los identificadores de precio estaban escritos dentro del código, así que cambiar de
//     precio obligaba a tocar (y redesplegar) la función. Ahora viven en secretos.
//  2. La web prometía 14 días de prueba y Stripe recibía trial_period_days: 1.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

const DIAS_PRUEBA = 14;

// Precios antiguos, como red de seguridad: si el secreto no está puesto todavía, se sigue
// cobrando como hasta ahora en vez de romper el registro.
const FALLBACK = {
  esencial: 'price_1TRt1tIM9N8RANXqgQ7GGij1',
  grabacion: 'price_1TRsz4IM9N8RANXqnuQWPWYt',
  beta: 'price_1TCi4RHZYiECTxiyb6PQ8haP',
};

function priceId(plan, periodo, isBeta) {
  const secreto = (nombre) => (Deno.env.get(nombre) || '').trim();

  if (isBeta) return secreto('STRIPE_PRICE_BETA') || secreto('STRIPE_PRICE_ESENCIAL') || FALLBACK.beta;

  if (plan === 'premium') {
    if (periodo === 'anual') {
      const anual = secreto('STRIPE_PRICE_GRABACION_ANUAL');
      if (anual) return anual;
    }
    return secreto('STRIPE_PRICE_GRABACION') || FALLBACK.grabacion;
  }

  if (periodo === 'anual') {
    const anual = secreto('STRIPE_PRICE_ESENCIAL_ANUAL');
    if (anual) return anual;
  }
  return secreto('STRIPE_PRICE_ESENCIAL') || FALLBACK.esencial;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const isBeta = body.is_beta === true;
    const periodo = body.billing_period === 'anual' ? 'anual' : 'mensual';
    let plan = body.subscription_plan === 'premium' ? 'premium' : 'basic';

    // El plan sin cuota no pasa por Stripe: se cobra un 10 % en cada clase.
    if (body.subscription_plan === 'commission') {
      return Response.json({ error: 'El plan sin cuota no lleva suscripción' }, { status: 400 });
    }

    const price = priceId(plan, periodo, isBeta);
    console.log('teacherSubscription', { email: user.email, plan, periodo, isBeta, price });

    let customerId;
    const existentes = await stripe.customers.list({ email: user.email, limit: 1 });
    if (existentes.data.length > 0) {
      customerId = existentes.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { base44_user_id: user.id, subscription_plan: plan },
      });
      customerId = customer.id;
    }

    // Una sola prueba gratuita por correo, para cualquiera de los dos planes de pago.
    const yaProbo = await base44.asServiceRole.entities.TrialUsed.filter({ email: user.email });
    const darPrueba = yaProbo.length === 0 && periodo === 'mensual';

    const metadata = {
      base44_user_email: user.email,
      subscription_plan: plan,
      billing_period: periodo,
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      ...(darPrueba ? { payment_method_collection: 'if_required' } : {}),
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        ...(darPrueba ? { trial_period_days: DIAS_PRUEBA } : {}),
        metadata,
      },
      metadata,
      success_url: `${req.headers.get('origin')}/TeacherDashboard?setup=success`,
      cancel_url: `${req.headers.get('origin')}/TeacherDashboard?setup=cancelled`,
    });

    // Se marca la prueba como usada y se guarda el cliente de Stripe sin esperar al webhook.
    try {
      if (yaProbo.length === 0) {
        await base44.asServiceRole.entities.TrialUsed.create({
          email: user.email,
          used_date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (e) {
      console.error('TrialUsed (no crítico):', e.message);
    }

    try {
      const teachers = await base44.asServiceRole.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        await base44.asServiceRole.entities.Teacher.update(teachers[0].id, { stripe_customer_id: customerId });
      }
    } catch (e) {
      console.error('stripe_customer_id (no crítico):', e.message);
    }

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error en teacherSubscription:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
