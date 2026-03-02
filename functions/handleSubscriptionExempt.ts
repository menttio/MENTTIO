import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

// Precios a 0€ para exentos (mismo producto, cuota 0)
const EXEMPT_PRICES = {
  basic: 'price_1T6TtwHAmL0VZFroEzHxUnpt',
  premium: 'price_1T6TtwHAmL0VZFroALx8VVZO',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (event?.type !== 'update') {
      return Response.json({ ok: true, skipped: 'not an update' });
    }

    // Si payload_too_large, fetchear los datos desde la BD
    let teacher = data;
    let previousData = old_data;

    if (payload.payload_too_large) {
      console.log('⚠️ Payload too large, fetching from DB...');
      teacher = await base44.asServiceRole.entities.Teacher.get('Teacher', event.entity_id);
      previousData = null; // No tenemos old_data, asumir que puede haber cambiado
    }

    const isExemptNow = teacher?.subscription_exempt === true;
    // Si no tenemos old_data, procesamos igualmente si es exento
    const wasExemptBefore = previousData !== null ? previousData?.subscription_exempt === true : false;

    console.log(`🔍 isExemptNow=${isExemptNow}, wasExemptBefore=${wasExemptBefore}, payload_too_large=${payload.payload_too_large}`);

    if (!isExemptNow || wasExemptBefore) {
      return Response.json({ ok: true, skipped: 'no change in exempt status' });
    }

    const plan = teacher.subscription_plan || 'basic';
    const exemptPriceId = EXEMPT_PRICES[plan];

    console.log(`✅ Profesor ${teacher.full_name} marcado como exento. Migrando a plan 0€ (${plan})...`);
    console.log(`🔍 stripe_subscription_id: ${teacher.stripe_subscription_id}`);
    console.log(`🔍 stripe_customer_id: ${teacher.stripe_customer_id}`);
    console.log(`🔍 exemptPriceId: ${exemptPriceId}`);

    if (teacher.stripe_subscription_id) {
      try {
        // Obtener la suscripción actual para conseguir el item id
        const subscription = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);
        console.log(`🔍 Suscripción obtenida de Stripe: status=${subscription.status}, items=${subscription.items.data.length}`);
        const itemId = subscription.items.data[0]?.id;
        console.log(`🔍 Item ID: ${itemId}`);

        // Cambiar el precio al plan 0€ correspondiente
        const updated = await stripe.subscriptions.update(teacher.stripe_subscription_id, {
          items: [{ id: itemId, price: exemptPriceId }],
          proration_behavior: 'none',
        });

        console.log(`✅ Suscripción migrada al precio 0€. Nuevo item price: ${updated.items.data[0]?.price?.id}`);
      } catch (stripeError) {
        console.error('❌ Error migrando suscripción en Stripe:', stripeError.message);
      }
    } else {
      console.log(`⚠️ No hay stripe_subscription_id, no se puede migrar en Stripe`);
    }

    // Garantizar acceso activo sin expiración
    await base44.asServiceRole.entities.Teacher.update(teacher.id, {
      subscription_active: true,
      subscription_expires: null,
      trial_active: false,
    });

    console.log(`✅ Profesor actualizado con acceso indefinido (exento)`);

    return Response.json({ ok: true, message: `Suscripción migrada a 0€ plan ${plan}` });
  } catch (error) {
    console.error('Error en handleSubscriptionExempt:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});