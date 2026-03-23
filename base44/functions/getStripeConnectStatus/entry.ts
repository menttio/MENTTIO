import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
    if (teachers.length === 0) {
      return Response.json({ connected: false, enabled: false });
    }

    const teacher = teachers[0];

    if (!teacher.stripe_connect_account_id) {
      return Response.json({ connected: false, enabled: false });
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(teacher.stripe_connect_account_id);

    const enabled = account.charges_enabled && account.payouts_enabled;

    // Sync enabled status to our DB if changed
    if (enabled !== teacher.stripe_connect_enabled) {
      await base44.entities.Teacher.update(teacher.id, {
        stripe_connect_enabled: enabled,
      });
    }

    return Response.json({
      connected: true,
      enabled,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      email: account.email,
      requirements: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
    });
  } catch (error) {
    console.error('Error getting Stripe Connect status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});