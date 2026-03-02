import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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
      subscription_active: teacher.subscription_active,
      subscription_plan: teacher.subscription_plan,
      subscription_expires: teacher.subscription_expires,
      trial_active: teacher.trial_active,
      trial_end_date: teacher.trial_end_date,
      stripe_customer_id: teacher.stripe_customer_id,
      stripe_subscription_id: teacher.stripe_subscription_id,
      payment_method: null,
      subscription_details: null,
      portal_url: null,
    };

    // Get Stripe data if customer exists
    if (teacher.stripe_customer_id) {
      try {
        // Get payment methods
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

        // Get active subscription details
        if (teacher.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);
          result.subscription_details = {
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end,
          };
        }

        // Generate billing portal URL
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: teacher.stripe_customer_id,
          return_url: `${req.headers.get('origin')}/Profile`,
        });
        result.portal_url = portalSession.url;

      } catch (stripeError) {
        console.error('Stripe error (non-critical):', stripeError.message);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error in getSubscriptionInfo:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});