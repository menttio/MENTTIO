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
      return Response.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const teacher = teachers[0];
    const origin = req.headers.get('origin') || 'https://menttio.com';

    let accountId = teacher.stripe_connect_account_id;

    // Create Connect account if doesn't exist yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Clases particulares de refuerzo escolar',
        },
        metadata: {
          teacher_id: teacher.id,
          teacher_email: user.email,
        },
      });

      accountId = account.id;

      // Save account ID immediately
      await base44.entities.Teacher.update(teacher.id, {
        stripe_connect_account_id: accountId,
        stripe_connect_enabled: false,
      });
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/Profile?connect=refresh`,
      return_url: `${origin}/Profile?connect=success`,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error connecting Stripe account:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});