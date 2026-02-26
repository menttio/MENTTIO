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

    // Get teacher profile
    const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
    
    if (teachers.length === 0 || !teachers[0].stripe_customer_id) {
      return Response.json({ error: 'No se encontró cliente de Stripe' }, { status: 404 });
    }

    const teacher = teachers[0];

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: teacher.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/Profile`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});