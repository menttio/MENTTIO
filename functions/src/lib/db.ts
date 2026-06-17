import type { Env } from "../env";

// Acceso a Supabase vía PostgREST con la service key (bypassa RLS). Equivalente al helper del
// Worker de automations, orientado a las funciones de la app.
function headers(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}
const url = (env: Env, table: string) => `${env.SUPABASE_URL}/rest/v1/${table}`;

export async function list<T = Record<string, unknown>>(
  env: Env, table: string, filter: Record<string, string> = {}, extra: Record<string, string> = {},
): Promise<T[]> {
  const u = new URL(url(env, table));
  for (const [k, v] of Object.entries(filter)) u.searchParams.set(k, v);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: headers(env) });
  if (!res.ok) throw new Error(`Supabase list ${table} (${res.status}): ${await res.text()}`);
  return (await res.json()) as T[];
}

export async function update(
  env: Env, table: string, filter: Record<string, string>, patch: Record<string, unknown>,
): Promise<void> {
  const u = new URL(url(env, table));
  for (const [k, v] of Object.entries(filter)) u.searchParams.set(k, v);
  const res = await fetch(u, {
    method: "PATCH",
    headers: headers(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase update ${table} (${res.status}): ${await res.text()}`);
}

export async function insert(env: Env, table: string, row: Record<string, unknown>): Promise<void> {
  const res = await fetch(url(env, table), {
    method: "POST",
    headers: headers(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert ${table} (${res.status}): ${await res.text()}`);
}

export async function remove(env: Env, table: string, filter: Record<string, string>): Promise<void> {
  const u = new URL(url(env, table));
  for (const [k, v] of Object.entries(filter)) u.searchParams.set(k, v);
  const res = await fetch(u, { method: "DELETE", headers: headers(env, { Prefer: "return=minimal" }) });
  if (!res.ok) throw new Error(`Supabase delete ${table} (${res.status}): ${await res.text()}`);
}
