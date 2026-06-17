// Compatibilidad con base44.integrations.Core.* respaldado por el Worker.
// IMPORTANTE: integrations.Core.SendEmail en Base44 consume créditos. Aquí se redirige al Worker
// (Gmail vía service account), eliminando ese gasto. InvokeLLM -> API Claude (Fase 3).
// UploadFile -> Supabase Storage (Fase 3/5).
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || "";

async function post(path, payload, supabase) {
  if (!FUNCTIONS_URL) throw new Error("VITE_FUNCTIONS_URL no configurada");
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw new Error(data?.error || `${path} falló (${res.status})`);
  return data;
}

export function makeIntegrations(supabase) {
  return {
    Core: {
      // En vez del SendEmail de Base44 (créditos), email por Gmail vía Worker.
      SendEmail: (payload) => post("send-email", payload, supabase),
      // Pendiente Fase 3: chat IA con la API de Claude vía Worker.
      InvokeLLM: (payload) => post("invoke-llm", payload, supabase),
      // Pendiente Fase 3/5: subida a Supabase Storage.
      UploadFile: (payload) => post("upload-file", payload, supabase),
    },
  };
}
