import { type Env, HttpError } from "./env";
import { getPublicTeachers } from "./functions/getPublicTeachers";
import { setMeetLink } from "./functions/setMeetLink";
import { getRecordingLink } from "./functions/getRecordingLink";

// Worker que aloja las backend functions de la app (porte de las funciones Deno de Base44).
// El frontend las llama vía el adapter: POST {VITE_FUNCTIONS_URL}/{name} con el token de sesión.
type Handler = (env: Env, req: Request, body: any) => Promise<unknown>;

const FUNCTIONS: Record<string, Handler> = {
  getPublicTeachers: (env, req) => getPublicTeachers(env, req),
  setMeetLink: (env, req, body) => setMeetLink(env, req, body),
  getRecordingLink: (env, req, body) => getRecordingLink(env, req, body),
  // Pendientes de portar (grupos B–E): se añaden aquí conforme lleguen los secretos.
};

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

    const url = new URL(req.url);
    const name = url.pathname.replace(/^\//, "");
    if (req.method === "GET" && name === "") {
      return json({ service: "menttio-functions", ok: true }, 200, env);
    }

    const handler = FUNCTIONS[name];
    if (!handler) return json({ error: "Not found" }, 404, env);

    let body: unknown = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: "Invalid JSON" }, 400, env);
    }

    try {
      const result = await handler(env, req, body);
      return json(result ?? { success: true }, 200, env);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: (err as Error).message }, status, env);
    }
  },
};
