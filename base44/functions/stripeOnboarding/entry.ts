import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Sustituye a connectStripeAccount. Mismo flujo (Stripe Connect Express), pero rellenando de
// antemano lo que antes tenia que adivinar el profesor:
//
//  - business_type: 'individual'. Sin esto Stripe abre pidiendo "Datos de la empresa", que a
//    un profesor particular le suena a que se ha equivocado de sitio. Indicandolo, pide sus
//    datos personales y el formulario es mas corto.
//  - mcc 8299 (servicios educativos). Sin esto el desplegable de sector sale vacio, con
//    cientos de categorias con nombres que nadie reconoce.
//  - url del perfil publico: Stripe pide una web del negocio y casi ningun profesor tiene.
//
// Cada pregunta de mas es un profesor que abandona el alta a medias y se queda sin cobrar
// con tarjeta. Solo afecta a cuentas nuevas: las ya creadas conservan su configuracion.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion' }, { status: 401 });
    }

    const db = base44.asServiceRole;
    const teachers = await db.entities.Teacher.filter({ user_email: user.email });
    const teacher = teachers[0];
    if (!teacher) {
      return Response.json({ error: 'No encontramos tu ficha de profesor' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || 'https://menttio.com';
    let accountId = teacher.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: user.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: '8299',
          product_description: 'Clases particulares por videollamada',
          url: `${origin}/TeacherProfile?id=${teacher.id}`,
        },
        individual: {
          email: user.email,
        },
        metadata: {
          teacher_id: teacher.id,
          teacher_email: user.email,
        },
      });

      accountId = account.id;
      await db.entities.Teacher.update(teacher.id, {
        stripe_connect_account_id: accountId,
        stripe_connect_enabled: false,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/Profile?connect=refresh`,
      return_url: `${origin}/Profile?connect=success`,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error en stripeOnboarding:', error);
    return Response.json({ error: 'No se ha podido abrir la configuracion de cobros' }, { status: 500 });
  }
}
