// Compatibilidad con base44.functions.invoke(name, payload).
// Las funciones backend se portan a Cloudflare Workers en la Fase 3; aquí se enruta la llamada
// al Worker, adjuntando el token de sesión de Supabase para que la función pueda autenticar.
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || "https://menttio-functions.raul2000plgr.workers.dev";

export function makeFunctions(supabase) {
  async function invoke(name, payload = {}) {
    if (!FUNCTIONS_URL) throw new Error("VITE_FUNCTIONS_URL no configurada");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
    if (!res.ok) throw new Error(data?.error || `Función ${name} falló (${res.status})`);
    // Base44 devuelve { data } en functions.invoke; mantenemos esa forma.
    return { data };
  }
  return { invoke };
}
