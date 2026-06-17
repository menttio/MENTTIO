import { type Env } from "../env";
import { requireAdmin } from "../lib/auth";
import * as db from "../lib/db";

// Base44: deleteUserProfile -> al borrar un usuario, elimina sus perfiles Teacher/Student.
// Acepta { userEmail } o el shape de evento { event: { entity_id } }. Requiere admin.
export async function deleteUserProfile(
  env: Env,
  req: Request,
  body: { userEmail?: string; event?: { type?: string; entity_id?: string } },
) {
  await requireAdmin(env, req);
  const userEmail = body.userEmail || body.event?.entity_id;
  if (!userEmail) return { success: false, message: "Falta userEmail" };

  await db.remove(env, "teachers", { user_email: `eq.${userEmail}` });
  await db.remove(env, "students", { user_email: `eq.${userEmail}` });
  return { success: true, message: `Perfiles eliminados para ${userEmail}` };
}
