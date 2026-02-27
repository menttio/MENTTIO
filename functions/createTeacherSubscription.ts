import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔵 createTeacherSubscription - INICIO');
    console.log('═══════════════════════════════════════════════════════');

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('❌ Usuario no autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription_plan } = await req.json();
    console.log('📋 Plan seleccionado:', subscription_plan);
    console.log('👤 Usuario:', user.email);

    // Determinar el price_id según el plan
    const priceId = subscription_plan === 'premium' 
      ? 'price_1T52D1HAmL0VZFroxOvBtJL6'  // Premium: 1€/mes (Test Mode)
      : 'price_1T52D1HAmL0VZFroIHMQq2wc';  // Básico: 1€/mes (Test Mode)

    console.log('💳 Price ID seleccionado:', priceId);

    // Buscar si ya existe un customer en Stripe con este email
    let customerId;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log('✅ Cliente existente encontrado:', customerId);
    } else {
      // Crear nuevo customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          base44_user_id: user.id,
          subscription_plan: subscription_plan,
        },
      });
      customerId = customer.id;
      console.log('✅ Nuevo cliente creado:', customerId);
    }

    // Determinar la URL base de la app
    const origin = req.headers.get('origin') 
      || (() => { const ref = req.headers.get('referer'); return ref ? new URL(ref).origin : null; })()
      || (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : null)
      || 'https://menttio.base44.app';
    console.log('🌐 Origin detectado:', origin);

    // Crear sesión de checkout con trial de 14 días
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: subscription_plan === 'basic' ? 14 : undefined,
        metadata: {
          base44_user_email: user.email,
          subscription_plan: subscription_plan,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
        },
      },
      metadata: {
        base44_user_email: user.email,
        subscription_plan: subscription_plan,
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
      },
      success_url: `${req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : 'https://menttio.base44.app'}/TeacherDashboard?setup=success`,
      cancel_url: `${req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : 'https://menttio.base44.app'}/TeacherDashboard?setup=cancelled`,
    });

    console.log('✅ Sesión de checkout creada:', session.id);
    console.log('🔗 URL de checkout:', session.url);
    if (subscription_plan === 'basic') {
      console.log('⚡ Plan Básico: 14 días de prueba gratis');
      console.log('💰 Después del trial: 1.00 EUR/mes');
    } else {
      console.log('⚡ Plan Premium: Cobro inmediato');
      console.log('💰 Precio: 1.00 EUR/mes');
    }
    console.log('═══════════════════════════════════════════════════════');

    return Response.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ ERROR en createTeacherSubscription:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════');
    return Response.json({ error: error.message }, { status: 500 });
  }
});