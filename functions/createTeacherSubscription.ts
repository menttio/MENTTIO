import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔵 createTeacherSubscription INICIADO');
    console.log('═══════════════════════════════════════════════════════');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('❌ Usuario no autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Usuario autenticado:', user.email);

    const { teacher_id, plan, success_url, cancel_url } = await req.json();
    
    console.log('📋 Datos recibidos:');
    console.log('  - teacher_id:', teacher_id);
    console.log('  - plan:', plan);
    console.log('  - success_url:', success_url);
    console.log('  - cancel_url:', cancel_url);

    // Get teacher data
    const teacher = await base44.entities.Teacher.get(teacher_id);
    console.log('👨‍🏫 Profesor encontrado:', teacher.full_name);

    // Determine price based on plan
    const priceId = plan === 'basic' 
      ? 'price_1T4hb4PPUFqffpwFIqVlFtmY'  // Plan Básico - 1€
      : 'price_1T4hb4PPUFqffpwFQyg9HJeT';  // Plan Premium - 1€
    
    console.log('💳 Price ID seleccionado:', priceId);
    console.log('💳 Plan:', plan === 'basic' ? 'Básico (1€/mes)' : 'Premium (1€/mes)');

    // Create Stripe checkout session with 14-day trial
    console.log('🔨 Creando sesión de Stripe con 14 días de prueba...');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          teacher_id: teacher_id,
          plan: plan,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
        },
      },
      customer_email: user.email,
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        teacher_id: teacher_id,
        plan: plan,
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
      },
    });

    console.log('✅ Sesión de Stripe creada exitosamente');
    console.log('✅ Session ID:', session.id);
    console.log('✅ URL de checkout:', session.url);
    console.log('✅ Trial period: 14 días');
    console.log('✅ NO se cobrará hasta pasados 14 días');
    console.log('═══════════════════════════════════════════════════════');

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌❌❌ ERROR EN createTeacherSubscription ❌❌❌');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════');
    return Response.json({ error: error.message }, { status: 500 });
  }
});