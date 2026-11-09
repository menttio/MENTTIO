import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// FUNCION DE UN SOLO USO (09/11/2026, lote B). Revoca en Google los tokens de Calendar guardados
// con el flujo antiguo (inseguro) para dos fichas concretas y las marca como no conectadas.
// Solo admin. Lista de IDs fija: no acepta parametros. No devuelve ni registra tokens.
// Borrar esta funcion en cuanto se haya ejecutado.
const IDS = ['6ad6129dff03a3578a856d10', '69f51ba95e338fea214c74cb'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const resultado: unknown[] = [];
  for (const id of IDS) {
    const r: Record<string, unknown> = { id };
    try {
      const ficha = await base44.asServiceRole.entities.Teacher.get(id);
      r.email = ficha?.user_email;
      const tk = ficha?.google_calendar_tokens || {};
      const token = tk.refresh_token || tk.access_token;
      if (token) {
        const res = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token }),
        });
        // 200 = revocado; 400 invalid_token = ya no era valido (tambien nos vale)
        r.google = res.status;
      } else {
        r.google = 'sin_token';
      }
      await base44.asServiceRole.entities.Teacher.update(id, {
        google_calendar_connected: false,
        google_calendar_tokens: null,
      });
      r.desconectado = true;
    } catch (e) {
      r.error = String((e as Error)?.message || e).slice(0, 200);
    }
    resultado.push(r);
  }
  return Response.json({ ok: true, resultado });
});
