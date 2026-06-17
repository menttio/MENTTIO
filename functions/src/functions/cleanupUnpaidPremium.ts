import { type Env, HttpError } from "../env";
import { requireCronOrAdmin } from "../lib/auth";
import * as db from "../lib/db";

// Base44: cleanupUnpaidPremium (cron) -> borra la cuenta Workspace de profesores premium que no
// han pagado (sin suscripción activa ni trial, no exentos, creados hace >1h, con email @menttio.com).
// En Nivel B lee de Supabase y borra vía el /eliminar-profesor del Worker de automations.
export async function cleanupUnpaidPremium(env: Env, req: Request) {
  await requireCronOrAdmin(env, req);
  if (!env.AUTOMATIONS_URL || !env.WEBHOOK_SECRET) throw new HttpError(500, "AUTOMATIONS_URL/WEBHOOK_SECRET no configurados");

  const teachers = await db.list<any>(env, "teachers");
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const toDelete = teachers.filter((t) =>
    t.subscription_plan === "premium" &&
    !t.subscription_active &&
    !t.trial_active &&
    !t.subscription_exempt &&
    t.created_at && new Date(t.created_at).getTime() < oneHourAgo &&
    t.corporate_email && String(t.corporate_email).includes("@menttio.com"),
  );

  const results: Array<{ email: string; ok: boolean; status: number }> = [];
  for (const t of toDelete) {
    const res = await fetch(`${env.AUTOMATIONS_URL}/eliminar-profesor?key=${env.WEBHOOK_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryEmail: t.corporate_email }),
    });
    results.push({ email: t.corporate_email, ok: res.ok, status: res.status });
  }
  return { success: true, count: toDelete.length, results };
}
