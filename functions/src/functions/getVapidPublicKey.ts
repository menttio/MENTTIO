import type { Env } from "../env";

// Base44: getVapidPublicKey -> clave pública VAPID (para suscribir el navegador a push). Pública.
// El frontend espera la clave como string (data = clave).
export async function getVapidPublicKey(env: Env) {
  return env.VAPID_PUBLIC_KEY || "";
}
