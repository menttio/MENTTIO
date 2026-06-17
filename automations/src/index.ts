import type { Env } from "./env";
import * as r from "./routes";
import { runVideollamadas } from "./cron";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Define cada ruta: método, path, si requiere el secreto compartido y su handler.
type Handler = (env: Env, body: any) => Promise<unknown>;
interface Route {
  method: string;
  path: string;
  secret: boolean;
  handler: Handler;
}

const ROUTES: Route[] = [
  { method: "POST", path: "/reserva", secret: true, handler: (e, b) => r.reservaNueva(e, b) },
  { method: "POST", path: "/reserva/cancelada", secret: true, handler: (e, b) => r.reservaCancelada(e, b) },
  { method: "POST", path: "/reserva/modificada", secret: true, handler: (e, b) => r.reservaModificada(e, b) },
  { method: "POST", path: "/clase-pagada", secret: true, handler: (e, b) => r.clasePagada(e, b) },
  { method: "POST", path: "/subir-archivos", secret: true, handler: (e, b) => r.subirArchivos(e, b) },
  { method: "POST", path: "/nuevo-alumno", secret: true, handler: (e, b) => r.nuevoRegistro(e, "alumno", b) },
  { method: "POST", path: "/nuevo-profesor", secret: true, handler: (e, b) => r.nuevoRegistro(e, "profesor", b) },
  { method: "POST", path: "/registrar-profesor", secret: true, handler: (e, b) => r.registrarProfesor(e, b) },
  { method: "POST", path: "/eliminar-profesor", secret: true, handler: (e, b) => r.eliminarProfesor(e, b) },
  // Llamado directamente desde el frontend (MyStudents.jsx) -> sin secreto, igual que hoy en n8n.
  { method: "POST", path: "/informe-progreso", secret: false, handler: (e, b) => r.informeProgreso(e, b) },
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return json({ service: "menttio-automations", ok: true });
    }

    // Cron de videollamadas/grabaciones (disparable a mano para pruebas; protegido por secreto).
    if (req.method === "POST" && url.pathname === "/cron/videollamadas") {
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);
      const out = await runVideollamadas(env);
      return json(out);
    }


    const route = ROUTES.find((rt) => rt.method === req.method && rt.path === url.pathname);
    if (!route) return json({ error: "Not found" }, 404);

    if (route.secret) {
      // El secreto puede venir en la cabecera o en la query (?key=...). Usar la query
      // permite que Base44 solo tenga que repuntar la URL del env var, sin tocar código.
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    let body: unknown = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    try {
      const result = await route.handler(env, body);
      return json(result ?? { success: true });
    } catch (err) {
      console.error(`Error en ${url.pathname}:`, err);
      return json({ success: false, error: (err as Error).message }, 500);
    }
  },

  // Cron Trigger de Cloudflare -> crea videollamadas y recupera grabaciones (reemplaza el
  // workflow n8n "Creacion videollamada"). Los demás crons de mantenimiento los hace Base44.
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    try {
      const out = await runVideollamadas(env);
      console.log("cron videollamadas:", JSON.stringify(out));
    } catch (err) {
      console.error("Error en cron videollamadas:", err);
    }
  },
};
