import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
    if (teachers.length === 0) return Response.json({ error: 'Teacher not found' }, { status: 404 });

    const teacher = teachers[0];

    if (!teacher.stripe_subscription_id) {
      return Response.json({ success: true, message: 'No subscription to cancel' });
    }

    // Check if currently in trial period
    const subscription = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);
    const now = Math.floor(Date.now() / 1000);
    const isInTrial = subscription.status === 'trialing' && subscription.trial_end > now;

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔴 cancelTeacherSubscription - Solicitud de baja');
    console.log('Email:', user.email);
    console.log('Subscription ID:', teacher.stripe_subscription_id);
    console.log('Status:', subscription.status);
    console.log('Is in trial:', isInTrial);
    console.log('═══════════════════════════════════════════════════════');

    if (isInTrial) {
      // During trial: cancel immediately
      await stripe.subscriptions.cancel(teacher.stripe_subscription_id);
      console.log('✅ Suscripción cancelada inmediatamente (durante trial)');

      // Update teacher record
      await base44.entities.Teacher.update(teacher.id, {
        subscription_active: false,
        trial_active: false,
        stripe_subscription_id: null,
      });

      return Response.json({ success: true, cancelledImmediately: true });
    } else {
      // Outside trial: cancel at end of current billing period
      await stripe.subscriptions.update(teacher.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      console.log('✅ Suscripción programada para cancelar al final del período');

      const periodEndDate = new Date(subscription.current_period_end * 1000).toISOString().split('T')[0];

      return Response.json({
        success: true,
        cancelledImmediately: false,
        cancelsAt: periodEndDate,
      });
    }
  } catch (error) {
    console.error('Error cancelTeacherSubscription:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});