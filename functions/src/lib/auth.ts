import { type Env, HttpError } from "../env";

export interface SupabaseUser {
  id: string;
  email?: string;
  [k: string]: unknown;
}

// Verifica el JWT de Supabase del header Authorization llamando a /auth/v1/user.
// Robusto y sin necesidad del JWT secret (usa la service key como apikey).
export async function requireUser(env: Env, req: Request): Promise<SupabaseUser> {
  const header = req.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "No autenticado");

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new HttpError(401, "Token inválido o expirado");
  return (await res.json()) as SupabaseUser;
}

// Comprueba además que el usuario sea admin (role en profiles).
export async function requireAdmin(env: Env, req: Request): Promise<SupabaseUser> {
  const user = await requireUser(env, req);
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(user.email || "")}&select=role`,
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } },
  );
  const rows = (await res.json()) as Array<{ role?: string }>;
  if (!rows[0] || rows[0].role !== "admin") throw new HttpError(403, "Requiere admin");
  return user;
}
