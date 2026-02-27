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
      return Response.json({ hasSubscription: false, teacher });
    }

    const subscription = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);

    return Response.json({
      hasSubscription: true,
      teacher,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trial_end: subscription.trial_end,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.price?.unit_amount,
        currency: subscription.items.data[0]?.price?.currency,
      }
    });
  } catch (error) {
    console.error('Error getStripeSubscriptionInfo:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});