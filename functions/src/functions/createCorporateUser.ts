import { type Env, HttpError } from "../env";

// Rate limiting en memoria (por isolate): 5 intentos / 10 min por IP.
const rateLimit = new Map<string, { count: number; windowStart: number }>();
const MAX = 5;
const WINDOW = 10 * 60 * 1000;
function limited(ip: string): boolean {
  const now = Date.now();
  const e = rateLimit.get(ip);
  if (!e || now - e.windowStart > WINDOW) { rateLimit.set(ip, { count: 1, windowStart: now }); return false; }
  if (e.count >= MAX) return true;
  e.count += 1;
  return false;
}

// Base44: createCorporateUser -> crea la cuenta Workspace del profesor. Proxy al Worker de
// automations (/registrar-profesor) que ya hace el alta + emails. Devuelve {status,email,...}.
export async function createCorporateUser(
  env: Env,
  req: Request,
  body: { nombre?: string; apellidos?: string; email_personal?: string },
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  if (limited(ip)) throw new HttpError(429, "Demasiadas solicitudes. Inténtalo más tarde.");

  if (!body.nombre || !body.apellidos) throw new HttpError(400, "Nombre y apellidos son requeridos");
  if (!env.AUTOMATIONS_URL || !env.WEBHOOK_SECRET) throw new HttpError(500, "AUTOMATIONS_URL/WEBHOOK_SECRET no configurados");

  const payload: Record<string, string> = { nombre: body.nombre, apellidos: body.apellidos };
  if (body.email_personal) payload.email = body.email_personal;

  const res = await fetch(`${env.AUTOMATIONS_URL}/registrar-profesor?key=${env.WEBHOOK_SECRET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(502, `registrar-profesor falló (${res.status}): ${text.slice(0, 160)}`);
  const r = JSON.parse(text);
  // No se devuelve la contraseña al frontend (va por email al correo personal).
  return { status: r.status, email: r.email, firstName: r.firstName, lastName: r.lastName };
}
