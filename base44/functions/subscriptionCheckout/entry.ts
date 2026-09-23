import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

// Sustituye a teacherSubscription. Diferencia: los identificadores de precio se leen de la
// entidad AppSetting, así que cambiar un precio en el futuro es editar una fila, sin tocar
// ni redesplegar código. Los valores de abajo son solo la red de seguridad si falta la fila.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

const DIAS_PRUEBA = 14;

const POR_DEFECTO = {
  stripe_price_esencial_mensual: 'price_1UImwTHZYiECTxiywGeSWisR',
  stripe_price_esencial_anual: 'price_1UImwTHZYiECTxiygtqQyOWz',
  stripe_price_grabacion_mensual: 'price_1UImwUHZYiECTxiyGz44YV8B',
  stripe_price_grabacion_anual: 'price_1UImwVHZYiECTxiyFKnzG6m0',
};

async function precio(db, clave) {
  try {
    const filas = await db.entities.AppSetting.filter({ key: clave });
    const valor = (filas[0]?.value || '').trim();
    if (valor.startsWith('price_')) return valor;
  } catch (e) {
    console.error('AppSetting', clave, e.message);
  }
  return POR_DEFECTO[clave];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesión' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const anual = body.billing_period === 'anual';
    const plan = body.subscription_plan === 'premium' ? 'premium' : 'basic';

    // El plan sin cuota no pasa por Stripe: se cobra un 10 % en cada clase.
    if (body.subscription_plan === 'commission') {
      return Response.json({ error: 'El plan sin cuota no lleva suscripción' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const clave = `stripe_price_${plan === 'premium' ? 'grabacion' : 'esencial'}_${anual ? 'anual' : 'mensual'}`;
    const price = await precio(db, clave);
    if (!price) {
      return Response.json({ error: 'No hay precio configurado para ese plan' }, { status: 500 });
    }
    console.log('subscriptionCheckout', { email: user.email, plan, anual, price });

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

    // Una sola prueba gratuita por correo, y solo en las mensuales.
    const yaProbo = await db.entities.TrialUsed.filter({ email: user.email });
    const darPrueba = yaProbo.length === 0 && !anual;

    const metadata = {
      base44_user_email: user.email,
      subscription_plan: plan,
      billing_period: anual ? 'anual' : 'mensual',
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

    try {
      if (yaProbo.length === 0) {
        await db.entities.TrialUsed.create({
          email: user.email,
          used_date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (e) {
      console.error('TrialUsed (no crítico):', e.message);
    }

    try {
      const teachers = await db.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        await db.entities.Teacher.update(teachers[0].id, { stripe_customer_id: customerId });
      }
    } catch (e) {
      console.error('stripe_customer_id (no crítico):', e.message);
    }

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error en subscriptionCheckout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
