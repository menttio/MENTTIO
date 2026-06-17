import type { Env } from "../env";

// Cliente mínimo de Supabase vía PostgREST (sin dependencias, ideal para Workers).
function headers(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function tableUrl(env: Env, table: string): string {
  return `${env.SUPABASE_URL}/rest/v1/${table}`;
}

// Inserta o actualiza (upsert por primary key) una o varias filas.
export async function upsert(
  env: Env,
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
): Promise<void> {
  const res = await fetch(tableUrl(env, table), {
    method: "POST",
    headers: headers(env, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${table} (${res.status}): ${await res.text()}`);
}

// Lee filas que cumplan el filtro (ej. { status: "in.(scheduled,modified)" }).
export async function select<T = Record<string, unknown>>(
  env: Env,
  table: string,
  filter: Record<string, string> = {},
  extra: Record<string, string> = {},
): Promise<T[]> {
  const url = new URL(tableUrl(env, table));
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: headers(env) });
  if (!res.ok) throw new Error(`Supabase select ${table} (${res.status}): ${await res.text()}`);
  return (await res.json()) as T[];
}

// Actualiza filas que cumplan el filtro (ej. { booking_id: "eq.123" }).
export async function update(
  env: Env,
  table: string,
  filter: Record<string, string>,
  patch: Record<string, unknown>,
): Promise<void> {
  const url = new URL(tableUrl(env, table));
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase update ${table} (${res.status}): ${await res.text()}`);
}

// Borra filas que cumplan el filtro.
export async function remove(
  env: Env,
  table: string,
  filter: Record<string, string>,
): Promise<void> {
  const url = new URL(tableUrl(env, table));
  for (const [k, v] of Object.entries(filter)) url.searchParams.set(k, v);
  const res = await fetch(url, { method: "DELETE", headers: headers(env, { Prefer: "return=minimal" }) });
  if (!res.ok) throw new Error(`Supabase delete ${table} (${res.status}): ${await res.text()}`);
}
