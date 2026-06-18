import { buildPushPayload } from "@block65/webcrypto-web-push";
import { type Env, HttpError } from "../env";
import { requireUser, requireAdmin } from "../lib/auth";
import * as db from "../lib/db";

// Base44: sendPushNotification -> envía push a todos los dispositivos de un usuario.
// ⚠️ Requiere VAPID keys VÁLIDAS en base64url. Las aportadas no parecen válidas -> fallará en
// runtime (capturado por dispositivo). Cuando se corrijan las claves, funciona sin cambios.
export async function sendPushNotification(env: Env, req: Request, body: any) {
  const user = await requireUser(env, req);
  const { userEmail, title, body: msgBody, data } = body;
  // Un usuario solo puede enviarse a sí mismo; a otros, solo admin.
  if (user.email !== userEmail) await requireAdmin(env, req);
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new HttpError(503, "VAPID no configurado");

  const subs = await db.list<any>(env, "push_subscriptions", { user_email: `eq.${userEmail}` });
  if (subs.length === 0) return { message: "No subscriptions found" };

  const payload = JSON.stringify({ title, body: msgBody, icon: "/icon-192.png", badge: "/icon-192.png", data: data || {} });
  const vapid = { subject: "mailto:soporte@menttio.com", publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };

  let sent = 0;
  for (const s of subs) {
    try {
      const reqInit = await buildPushPayload({ data: payload, options: { ttl: 60 } }, s.subscription, vapid);
      const res = await fetch(s.subscription.endpoint, reqInit);
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) await db.remove(env, "push_subscriptions", { id: `eq.${s.id}` });
    } catch (e) { console.error("push send:", (e as Error).message); }
  }
  return { success: true, sent };
}
