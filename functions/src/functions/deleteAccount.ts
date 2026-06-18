import { type Env } from "../env";
import { requireUser } from "../lib/auth";
import { stripeClient } from "./stripe";
import * as db from "../lib/db";

// Base44: deleteAccount -> borra la cuenta del usuario y todos sus datos.
// DESTRUCTIVA. Porta: cuenta Workspace (premium, vía automations), cancela suscripciones Stripe,
// borra teacher/student/availability/reviews/bookings/profile y el usuario de Supabase Auth.
// NOTA: portada fielmente pero NO probada (no se ejecuta a ciegas un borrado real).
export async function deleteAccount(env: Env, req: Request) {
  const user = await requireUser(env, req);
  const email = user.email!;

  const teachers = await db.list<any>(env, "teachers", { user_email: `eq.${email}` });
  if (teachers[0]) {
    const t = teachers[0];

    // Premium (cuenta corporativa @menttio.com) -> borrar cuenta Workspace vía automations.
    if (t.corporate_email && String(t.corporate_email).includes("@menttio.com") && env.AUTOMATIONS_URL && env.WEBHOOK_SECRET) {
      try {
        await fetch(`${env.AUTOMATIONS_URL}/eliminar-profesor?key=${env.WEBHOOK_SECRET}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryEmail: t.corporate_email }),
        });
      } catch (e) { console.error("eliminar-profesor:", e); }
    }

    await db.remove(env, "availability", { teacher_id: `eq.${t.id}` });
    await db.remove(env, "reviews", { teacher_id: `eq.${t.id}` });

    // Cancelar suscripciones de Stripe (por id y por customers del email). Best-effort.
    if (env.STRIPE_SECRET_KEY) {
      try {
        const stripe = stripeClient(env);
        const customerIds = new Set<string>();
        if (t.stripe_customer_id) customerIds.add(t.stripe_customer_id);
        try { (await stripe.customers.list({ email, limit: 10 })).data.forEach((c) => customerIds.add(c.id)); } catch { /* */ }
        if (t.stripe_subscription_id) { try { await stripe.subscriptions.cancel(t.stripe_subscription_id); } catch { /* */ } }
        for (const cid of customerIds) {
          for (const status of ["active", "trialing"] as const) {
            try {
              const subs = await stripe.subscriptions.list({ customer: cid, status });
              for (const s of subs.data) if (s.id !== t.stripe_subscription_id) await stripe.subscriptions.cancel(s.id);
            } catch { /* */ }
          }
        }
      } catch (e) { console.error("stripe cancel:", e); }
    }

    await db.remove(env, "teachers", { id: `eq.${t.id}` });
  }

  // Student + datos relacionados.
  await db.remove(env, "students", { user_email: `eq.${email}` });
  await db.remove(env, "bookings", { teacher_email: `eq.${email}` });
  await db.remove(env, "bookings", { student_email: `eq.${email}` });
  await db.remove(env, "profiles", { email: `eq.${email}` });

  // Borrar el usuario de Supabase Auth (admin API con service key).
  try {
    await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
    });
  } catch (e) { console.error("borrar auth user:", e); }

  return { success: true };
}
