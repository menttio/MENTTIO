import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Solo actuar en updates donde subscription_exempt cambió a true
    if (event?.type !== 'update') {
      return Response.json({ ok: true, skipped: 'not an update' });
    }

    const teacher = data;
    const wasExemptBefore = old_data?.subscription_exempt === true;
    const isExemptNow = teacher?.subscription_exempt === true;

    if (!isExemptNow || wasExemptBefore) {
      return Response.json({ ok: true, skipped: 'no change in exempt status' });
    }

    console.log(`✅ Profesor ${teacher.full_name} marcado como exento. Cancelando suscripción en Stripe...`);

    // Cancelar suscripción en Stripe si existe
    if (teacher.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(teacher.stripe_subscription_id);
        console.log(`✅ Suscripción ${teacher.stripe_subscription_id} cancelada en Stripe`);
      } catch (stripeError) {
        console.error('Error cancelando suscripción en Stripe:', stripeError.message);
        // Si ya estaba cancelada, no es un error crítico
      }
    }

    // Actualizar el profesor: suscripción activa sin fecha de expiración (acceso indefinido)
    await base44.asServiceRole.entities.Teacher.update(teacher.id, {
      subscription_active: true,
      subscription_expires: null,
      stripe_subscription_id: null,
      trial_active: false
    });

    console.log(`✅ Profesor actualizado con acceso indefinido (exento)`);

    return Response.json({ ok: true, message: 'Suscripción cancelada y acceso exento concedido' });
  } catch (error) {
    console.error('Error en handleSubscriptionExempt:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});