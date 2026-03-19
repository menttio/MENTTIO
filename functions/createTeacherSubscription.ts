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

    const { subscription_plan, is_beta } = await req.json();
    console.log('📋 Plan seleccionado:', subscription_plan);
    console.log('🧪 Es beta:', is_beta);
    console.log('👤 Usuario:', user.email);

    // Determinar el price_id según el plan
    let priceId;
    if (is_beta) {
      priceId = 'price_1TCi4RHZYiECTxiyb6PQ8haP'; // Básico Beta (Live)
    } else if (subscription_plan === 'premium') {
      priceId = 'price_1TBuNwHZYiECTxiyiZ41AEcx'; // Premium (Live)
    } else {
      priceId = 'price_1TBu8mHZYiECTxiyJ6fB9Hy3'; // Básico (Live)
    }

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

    // Consultar si el usuario ya usó el trial
    const trialUsedRecords = await base44.asServiceRole.entities.TrialUsed.filter({ email: user.email });
    const shouldGrantTrial = subscription_plan === 'basic' && trialUsedRecords.length === 0;
    console.log('🎁 shouldGrantTrial:', shouldGrantTrial, '(registros TrialUsed:', trialUsedRecords.length, ')');

    // Crear sesión de checkout con trial de 14 días solo si corresponde
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
        ...(shouldGrantTrial ? { trial_period_days: 30 } : {}),
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
    console.log('═══════════════════════════════════════════════════════');

    // Registrar en TrialUsed en cuanto se crea la sesión de checkout (no esperar al webhook)
    try {
      const existingTrial = await base44.asServiceRole.entities.TrialUsed.filter({ email: user.email });
      if (existingTrial.length === 0) {
        await base44.asServiceRole.entities.TrialUsed.create({
          email: user.email,
          used_date: new Date().toISOString().split('T')[0]
        });
        console.log('✅ Email registrado en TrialUsed');
      } else {
        console.log('ℹ️ Email ya registrado en TrialUsed');
      }
    } catch (trialErr) {
      console.error('⚠️ Error registrando TrialUsed (no crítico):', trialErr.message);
    }

    // Guardar el stripe_customer_id en el Teacher ahora mismo (no esperar al webhook)
    try {
      const teachers = await base44.asServiceRole.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        await base44.asServiceRole.entities.Teacher.update(teachers[0].id, {
          stripe_customer_id: customerId,
        });
        console.log('✅ stripe_customer_id guardado en Teacher:', customerId);
      } else {
        console.warn('⚠️ No se encontró Teacher para guardar stripe_customer_id. Se guardará vía webhook.');
      }
    } catch (saveErr) {
      console.error('⚠️ Error guardando stripe_customer_id (no crítico):', saveErr.message);
    }

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