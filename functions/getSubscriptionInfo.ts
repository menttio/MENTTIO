import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
    if (teachers.length === 0) {
      return Response.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const teacher = teachers[0];

    const result = {
      subscription_active: false,
      subscription_plan: teacher.subscription_plan || 'basic',
      subscription_expires: null,
      trial_active: false,
      trial_end_date: null,
      stripe_customer_id: teacher.stripe_customer_id,
      stripe_subscription_id: teacher.stripe_subscription_id,
      payment_method: null,
      subscription_details: null,
      portal_url: null,
    };

    // Si no tiene stripe_subscription_id, usamos los datos de la entidad tal cual
    if (!teacher.stripe_subscription_id) {
      result.subscription_active = teacher.subscription_active || false;
      result.trial_active = teacher.trial_active || false;
      result.trial_end_date = teacher.trial_end_date || null;
      result.subscription_expires = teacher.subscription_expires || null;
      return Response.json(result);
    }

    // === Obtener datos reales desde Stripe ===
    try {
      const subscription = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);

      const now = Math.floor(Date.now() / 1000);
      const stripeStatus = subscription.status; // trialing, active, past_due, canceled, etc.

      const isTrial = stripeStatus === 'trialing';
      const isActive = stripeStatus === 'active' || stripeStatus === 'trialing';
      const trialEnd = subscription.trial_end; // unix timestamp or null
      const periodEnd = subscription.current_period_end;

      result.subscription_details = {
        status: stripeStatus,
        current_period_start: subscription.current_period_start,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: trialEnd,
      };

      result.subscription_active = isActive;
      result.trial_active = isTrial;
      result.trial_end_date = trialEnd
        ? new Date(trialEnd * 1000).toISOString().split('T')[0]
        : null;
      result.subscription_expires = periodEnd
        ? new Date(periodEnd * 1000).toISOString().split('T')[0]
        : null;

      // Sincronizar entidad Teacher si los datos difieren
      const updates = {};
      if (teacher.subscription_active !== isActive) updates.subscription_active = isActive;
      if (teacher.trial_active !== isTrial) updates.trial_active = isTrial;
      if (result.trial_end_date && teacher.trial_end_date !== result.trial_end_date) {
        updates.trial_end_date = result.trial_end_date;
      }
      if (result.subscription_expires && teacher.subscription_expires !== result.subscription_expires) {
        updates.subscription_expires = result.subscription_expires;
      }
      if (Object.keys(updates).length > 0) {
        await base44.entities.Teacher.update(teacher.id, updates);
        console.log('✅ Teacher sincronizado con Stripe:', updates);
      }

      // Método de pago
      if (teacher.stripe_customer_id) {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: teacher.stripe_customer_id,
          type: 'card',
        });
        if (paymentMethods.data.length > 0) {
          const pm = paymentMethods.data[0];
          result.payment_method = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }

        // Portal de Stripe
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: teacher.stripe_customer_id,
          return_url: `${req.headers.get('origin')}/Profile`,
        });
        result.portal_url = portalSession.url;
      }

    } catch (stripeError) {
      console.error('Stripe error:', stripeError.message);
      // Fallback a datos locales si Stripe falla
      result.subscription_active = teacher.subscription_active || false;
      result.trial_active = teacher.trial_active || false;
      result.trial_end_date = teacher.trial_end_date || null;
      result.subscription_expires = teacher.subscription_expires || null;
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error in getSubscriptionInfo:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});