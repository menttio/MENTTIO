import type { Env } from "./env";
import { getAccessToken, SCOPES } from "./lib/google-auth";

// Para que un profesor pueda grabar su clase, Google Meet exige que sea de la organización
// del anfitrión... o que sea coanfitrión. Hasta ahora se resolvía creándole una cuenta
// @menttio.com, que consume una licencia de Workspace (~21,50 €/mes por profesor).
//
// Aquí se hace por el otro camino: en cuanto se crea la videollamada, se añade al profesor
// como coanfitrión de esa sala. Entra con su correo de siempre y le aparece el botón de
// grabar, sin licencia y sin que nadie tenga que tocar nada a mano.
//
// Nota: esto NO es grabación automática. El profesor sigue pulsando el botón. Lo que se
// automatiza es el permiso para hacerlo.

/** De "https://meet.google.com/abc-defg-hij?authuser=0" saca "abc-defg-hij". */
export function codigoDeReunion(meetUrl: string): string | null {
  const m = String(meetUrl || "").match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return m ? m[1].toLowerCase() : null;
}

async function meetFetch(env: Env, url: string, init: RequestInit = {}): Promise<any> {
  // Se impersona al dueño de la sala (el mismo calendario que crea el evento), porque el
  // permiso meetings.space.created solo alcanza a las salas de ese usuario.
  const token = await getAccessToken(env, SCOPES.meet, env.MEET_OWNER || env.GOOGLE_IMPERSONATE);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const texto = await res.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!res.ok) {
    throw new Error(`Meet ${res.status}: ${JSON.stringify(datos.error?.message ?? datos).slice(0, 200)}`);
  }
  return datos;
}

/** Resuelve el nombre interno de la sala ("spaces/XXXX") a partir del código de la reunión. */
export async function espacioDeReunion(env: Env, meetUrl: string): Promise<string | null> {
  const codigo = codigoDeReunion(meetUrl);
  if (!codigo) return null;
  const datos = await meetFetch(env, `https://meet.googleapis.com/v2/spaces/${codigo}`);
  return datos?.name ?? null;
}

/**
 * Añade a alguien como coanfitrión de la sala. Devuelve qué ha pasado en vez de lanzar:
 * si esto falla, la clase tiene que seguir adelante igual, solo que sin poder grabarse.
 */
export async function hacerCoanfitrion(
  env: Env,
  meetUrl: string,
  email: string,
): Promise<{ ok: boolean; detalle: string }> {
  const limpio = (email || "").trim().toLowerCase();
  if (!limpio) return { ok: false, detalle: "sin correo del profesor" };

  try {
    const space = await espacioDeReunion(env, meetUrl);
    if (!space) return { ok: false, detalle: `no se pudo resolver la sala de ${meetUrl}` };

    await meetFetch(env, `https://meet.googleapis.com/v2/${space}/members`, {
      method: "POST",
      body: JSON.stringify({ email: limpio, role: "COHOST" }),
    });
    return { ok: true, detalle: `${limpio} es coanfitrión de ${space}` };
  } catch (e) {
    const msg = (e as Error).message;
    // Si ya era miembro, damos por bueno el resultado: el objetivo está cumplido.
    if (/already exists|ALREADY_EXISTS/i.test(msg)) {
      return { ok: true, detalle: `${limpio} ya era miembro` };
    }
    return { ok: false, detalle: msg };
  }
}

/** Diagnostico: devuelve la sala tal cual la ve la API, para ver su configuracion. */
export async function verEspacio(env: Env, meetUrl: string): Promise<any> {
  const codigo = codigoDeReunion(meetUrl);
  if (!codigo) return { error: "codigo no reconocido" };
  return await meetFetch(env, `https://meet.googleapis.com/v2/spaces/${codigo}`);
}

/**
 * Crea la sala de Meet con nuestra propia aplicacion.
 *
 * Es el paso que lo hace todo posible: el permiso meetings.space.created solo alcanza a las
 * salas creadas por la app. Cuando la creaba Calendar, anadir un coanfitrion daba 403 incluso
 * con un correo de la propia organizacion. Creandola aqui, si se puede.
 */
export async function crearEspacio(env: Env): Promise<{ name: string; uri: string; code: string } | null> {
  try {
    // moderation: "ON" es imprescindible. Sin gestion de anfitriones no existen los roles,
    // asi que el COHOST que anadimos despues no sirve de nada y Meet sigue diciendo "no
    // tienes permiso para grabar". Las salas que creaba Calendar venian con esto activado.
    const d = await meetFetch(env, "https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      body: JSON.stringify({
        config: { accessType: "TRUSTED", moderation: "ON" },
      }),
    });
    if (!d?.meetingUri || !d?.name) return null;
    return { name: d.name, uri: d.meetingUri, code: d.meetingCode ?? codigoDeReunion(d.meetingUri) ?? "" };
  } catch (e) {
    console.error("crearEspacio:", (e as Error).message);
    return null;
  }
}

/** Anade un coanfitrion a una sala ya resuelta (evita volver a buscarla). */
export async function coanfitrionEnEspacio(
  env: Env,
  space: string,
  email: string,
): Promise<{ ok: boolean; detalle: string }> {
  const limpio = (email || "").trim().toLowerCase();
  if (!limpio || !space) return { ok: false, detalle: "faltan datos" };
  try {
    await meetFetch(env, `https://meet.googleapis.com/v2/${space}/members`, {
      method: "POST",
      body: JSON.stringify({ email: limpio, role: "COHOST" }),
    });
    return { ok: true, detalle: `${limpio} es coanfitrion de ${space}` };
  } catch (e) {
    const msg = (e as Error).message;
    if (/already exists|ALREADY_EXISTS/i.test(msg)) return { ok: true, detalle: `${limpio} ya era miembro` };
    return { ok: false, detalle: msg };
  }
}

/**
 * Intenta dejar la sala grabando sola. Segun Google esto requiere Business Plus o superior,
 * asi que con Business Standard se espera un error; se comprueba en vez de darlo por hecho.
 */
export async function activarGrabacionAutomatica(env: Env, space: string): Promise<any> {
  try {
    const d = await meetFetch(
      env,
      `https://meet.googleapis.com/v2/${space}?updateMask=config.artifactConfig.recordingConfig.autoRecordingGeneration`,
      {
        method: "PATCH",
        body: JSON.stringify({ config: { artifactConfig: { recordingConfig: { autoRecordingGeneration: "ON" } } } }),
      },
    );
    return { ok: true, config: d?.config?.artifactConfig };
  } catch (e) {
    return { ok: false, detalle: (e as Error).message };
  }
}
