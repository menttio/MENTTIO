import type { Env } from "./env";
import * as r from "./routes";
import { runVideollamadas } from "./cron";
import { listarGrabaciones, aplicarAccesos, cerrarCarpeta, listPermissions } from "./grabaciones";
import { importarGrabaciones } from "./importar-grabaciones";
import * as db from "./lib/supabase";
import { getAccessToken, SCOPES } from "./lib/google-auth";
import { crearEspacio } from "./coanfitrion";

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
  // RETIRADA /registrar-profesor. Creaba una cuenta de Google Workspace a partir del nombre
  // que le llegara, y el secreto N8N_NUEVO_ALUMNO_WEBHOOK_URL de Base44 apuntaba aqui por
  // error: cada alta de ALUMNO intentaba crear un buzon "<nombre>profesor@menttio.com".
  // El 28/09/2026 le llego el turno a un alumno real y solo fallo porque ya no quedaban
  // licencias libres. La ruta ya no hacia falta: las cuentas corporativas se retiraron cuando
  // la grabacion dejo de necesitar una licencia por profesor.
  // RETIRADA /eliminar-profesor (09/11/2026). Borraba cualquier usuario de Google Workspace que
  // le pidieran, incluido menttio@menttio.com. Produccion ya no la llamaba; solo el Worker de
  // nivel-b (deleteAccount / cleanupUnpaidPremium), y por ahi un usuario registrado en Supabase
  // podia pedir el borrado de una cuenta ajena. Ver docs/ESTADO-MAESTRO.md, seccion 7 ter.
  // Ya no se llama desde el navegador: el informe lo envía Base44 (familyReport), autenticado.
  { method: "POST", path: "/informe-progreso", secret: true, handler: (e, b) => r.informeProgreso(e, b) },
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


    // Diagnostico de los permisos de Google, uno por uno. Solo pide tokens, no toca nada.
    //
    // Existe porque el 01/10/2026 fallo la creacion de videollamadas con un
    // "invalid_grant: Invalid email or User ID" mientras Drive seguia funcionando con la misma
    // cuenta suplantada. Con la licencia correcta y los ocho permisos presentes en la
    // delegacion, adivinar era perder el tiempo: hace falta ver que grupo falla y con que
    // mensaje exacto.
    if (req.method === "POST" && url.pathname === "/diag/google") {
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);

      const grupos: Array<[string, string[]]> = [
        ["gmail", SCOPES.gmail],
        ["drive", SCOPES.drive],
        ["calendar", SCOPES.calendar],
        ["meet (los dos)", SCOPES.meet],
        ["meet.space.created", ["https://www.googleapis.com/auth/meetings.space.created"]],
        ["meet.space.settings", ["https://www.googleapis.com/auth/meetings.space.settings"]],
        ["admin.directory", SCOPES.admin],
      ];

      const resultado: Record<string, string> = {};
      for (const [nombre, scopes] of grupos) {
        try {
          const t = await getAccessToken(env, scopes);
          resultado[nombre] = `OK (token de ${t.length} caracteres)`;
        } catch (e) {
          resultado[nombre] = (e as Error).message.slice(0, 220);
        }
      }
      // Con ?espacio=1 ademas crea una sala de Meet de verdad y la deja escrita. Es la
      // llamada que fallo; comprobar solo el token no demuestra que la API responda.
      let sala: unknown = "no probado (anade ?espacio=1)";
      if (url.searchParams.get("espacio") === "1") {
        try {
          const s = await crearEspacio(env);
          sala = s ? { creada: true, codigo: s.code, enlace: s.uri } : { creada: false };
        } catch (e) {
          sala = { creada: false, error: (e as Error).message.slice(0, 220) };
        }
      }
      // Que calendarios ve la cuenta suplantada. Un 404 al crear el evento puede ser que el
      // calendario no exista, que el alias no valga, o que el usuario no tenga Calendar.
      let calendarios: unknown = "no probado";
      try {
        const t = await getAccessToken(env, SCOPES.calendar);
        const r = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const body = await r.json() as any;
        calendarios = r.ok
          ? (body.items ?? []).map((c: any) => ({ id: c.id, principal: Boolean(c.primary), acceso: c.accessRole }))
          : { codigo: r.status, error: JSON.stringify(body).slice(0, 300) };
      } catch (e) {
        calendarios = { error: (e as Error).message.slice(0, 200) };
      }

      // Crear un evento de prueba y leer el error COMPLETO. El del cron viene recortado a 160
      // caracteres y en un 404 de Calendar el motivo suele estar justo despues.
      let evento: unknown = "no probado (anade ?evento=1)";
      if (url.searchParams.get("evento") === "1") {
        try {
          const t = await getAccessToken(env, SCOPES.calendar);
          const inicio = new Date(Date.now() + 36 * 60 * 60000);
          const fin = new Date(inicio.getTime() + 30 * 60000);
          const r = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: "Menttio - prueba de diagnostico (borrable)",
                start: { dateTime: inicio.toISOString() },
                end: { dateTime: fin.toISOString() },
                conferenceData: { createRequest: { requestId: `diag-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
              }),
            },
          );
          const body = await r.json() as any;
          evento = r.ok
            ? { creado: true, id: body.id, meet: body.conferenceData?.entryPoints?.[0]?.uri ?? null }
            : { creado: false, codigo: r.status, cuerpo: JSON.stringify(body).slice(0, 900) };
        } catch (e) {
          evento = { creado: false, error: (e as Error).message.slice(0, 300) };
        }
      }

      return json({ suplantando: env.GOOGLE_IMPERSONATE, resultado, sala, calendarios, evento });
    }

    // Que ve exactamente el cron al buscar clases a las que crear videollamada. Solo lee.
    //
    // El 01/10/2026 el cron se ejecuto cinco veces sin errores y no recogio una clase que
    // empezaba en una hora, mientras que si recogio otra que ya habia empezado. O sea que el
    // filtro hace lo contrario de lo que deberia, y hay que ver las filas en crudo.
    if (req.method === "POST" && url.pathname === "/diag/cron") {
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);

      const ahora = new Date();
      const enUnaHora = new Date(ahora.getTime() + 60 * 60000);
      const filtro = `(status.in.(scheduled,modified),meet_link.is.null,start_datetime.gte.${ahora.toISOString()},start_datetime.lte.${enUnaHora.toISOString()})`;

      const salida: Record<string, unknown> = {
        ahora: ahora.toISOString(),
        en_una_hora: enUnaHora.toISOString(),
        filtro,
      };

      // 1) Lo que devuelve el filtro tal cual lo usa el cron.
      try {
        salida.con_filtro = await db.select<Record<string, unknown>>(env, "bookings_ledger", {}, { and: filtro });
      } catch (e) {
        salida.con_filtro_error = (e as Error).message.slice(0, 300);
      }

      // 2) Las ultimas filas sin filtrar, para comparar.
      try {
        const todas = await db.select<Record<string, unknown>>(env, "bookings_ledger", {}, {
          order: "start_datetime.desc",
          limit: "6",
          select: "booking_id,start_datetime,status,meet_link",
        });
        salida.ultimas_sin_filtrar = todas;
      } catch (e) {
        salida.sin_filtrar_error = (e as Error).message.slice(0, 300);
      }

      return json(salida);
    }

    // Estado de una reserva en el registro del worker. Solo lectura.
    //
    // Sirve para contestar a la unica pregunta que importa cuando alguien reserva: "ha llegado
    // esto a la automatizacion?". Si la reserva no esta aqui, no se le creara videollamada ni
    // saldra el aviso al profesor, y eso hay que saberlo ANTES del dia de la clase, no cuando
    // el alumno se queda mirando una pantalla sin enlace.
    if (req.method === "POST" && url.pathname === "/reserva/estado") {
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);
      const cuerpo = (await req.json().catch(() => ({}))) as { booking_id?: string };
      const id = (cuerpo.booking_id ?? url.searchParams.get("booking_id") ?? "").trim();
      if (!id) return json({ error: "Falta booking_id" }, 400);
      try {
        const filas = await db.select<Record<string, unknown>>(env, "bookings_ledger", {
          booking_id: `eq.${id}`,
        });
        return json({ encontrada: filas.length > 0, fila: filas[0] ?? null });
      } catch (e) {
        return json({ error: (e as Error).message }, 500);
      }
    }

    // Un solo uso: pasa a las reservas las grabaciones que quedaron anotadas en la hoja de
    // calculo antigua. Va con WEBHOOK_SECRET, igual que el cron, porque AUTOMATION_SECRET solo
    // lo conocen el worker y Base44: ninguno de los dos lo puede leer para llamar a mano.
    if (req.method === "POST" && url.pathname === "/importar-grabaciones") {
      const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("key");
      if (provided !== env.WEBHOOK_SECRET) return json({ error: "Unauthorized" }, 401);
      return json(await importarGrabaciones(env, {
        dryRun: url.searchParams.get("dry") === "1",
        limite: url.searchParams.get("limite") ? Number(url.searchParams.get("limite")) : undefined,
        desde: url.searchParams.get("desde") ? Number(url.searchParams.get("desde")) : undefined,
      }));
    }

    // Mantenimiento de permisos de las grabaciones (acceso nominal en lugar de enlace público).
    // Protegido por la misma clave compartida que usa setMeetLinkAuto.
    if (req.method === "POST" && url.pathname.startsWith("/mantenimiento/grabaciones")) {
      const provided = req.headers.get("x-automation-key") ?? "";
      if (!env.AUTOMATION_SECRET || provided !== env.AUTOMATION_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }
      const dryRun = url.searchParams.get("dry") === "1";
      const accion = url.pathname.split("/").pop();
      const body = req.headers.get("content-type")?.includes("json") ? await req.json().catch(() => ({})) : {};

      if (accion === "listar") {
        return json(await listarGrabaciones(env, url.searchParams.get("pageToken") ?? undefined, Number(url.searchParams.get("size") ?? 100)));
      }
      if (accion === "aplicar") {
        return json(await aplicarAccesos(env, (body as any).items ?? [], dryRun));
      }
      if (accion === "cerrar-carpeta") {
        return json(await cerrarCarpeta(env, dryRun));
      }
      if (accion === "permisos") {
        return json({ permisos: await listPermissions(env, String((body as any).fileId ?? "")) });
      }
      return json({ error: "Acción no reconocida" }, 400);
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
