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
      ? 'price_1T4i2EPPUFqffpwFbluZ1NX0'  // Premium: 1€/mes
      : 'price_1T4i2EPPUFqffpwFeeljIFKE';  // Básico: 1€/mes

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
        // TEMPORAL: Trial desactivado para pruebas - se cobra inmediatamente
        // trial_period_days: 14,
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
      success_url: `${req.headers.get('origin')}/TeacherDashboard?setup=success`,
      cancel_url: `${req.headers.get('origin')}/TeacherDashboard?setup=cancelled`,
    });

    console.log('✅ Sesión de checkout creada:', session.id);
    console.log('🔗 URL de checkout:', session.url);
    console.log('⚡ MODO PRUEBA: Sin trial - cobro inmediato');
    console.log('💰 Precio: 1.00 EUR/mes (se cobra ahora mismo)');
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