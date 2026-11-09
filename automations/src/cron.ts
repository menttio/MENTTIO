import type { Env } from "./env";
import * as db from "./lib/supabase";
import { asegurarAccesoGrabacion, ponerEnCuarentena, mandarAPapelera } from "./grabaciones";
import { hacerCoanfitrion, crearEspacio, coanfitrionEnEspacio, activarGrabacionAutomatica } from "./coanfitrion";
import { getAccessToken, SCOPES } from "./lib/google-auth";
import { sendEmail } from "./lib/gmail";
import { normalizeText } from "./lib/util";
import * as tpl from "./templates";

// Porta el workflow n8n "Creacion videollamada + pizarra". Cron del Worker:
//  A) clases que empiezan pronto y sin Meet -> crea evento Calendar+Meet, guarda link, emails.
//  B) clases ya terminadas sin grabación -> busca el archivo en Drive y escribe el link.
// Calendario donde se crean las videollamadas. Es "primary" a proposito: el calendario es el
// de la cuenta que se suplanta (menttio@menttio.com). Antes ponia "academia@menttio.com", que
// es un alias suyo, y un alias no vale ni para suplantar ni como identificador de calendario:
// daba primero "invalid_grant" y luego 404. Es el mismo calendario de siempre, nombrado bien.
const CALENDAR = "primary";
const REC_FOLDER = "1HQc4hFsrXXuoPnCu_meG54nIzOHMK2eO"; // carpeta Drive "Meet Recordings" (de menttio@)

interface Booking {
  booking_id: string;
  student_id: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  student_email: string | null;
  subject_name: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
  teacher_email: string | null;
  start_datetime: string | null;
  meet_link: string | null;
  recording_url: string | null;
}

export async function runVideollamadas(env: Env): Promise<Record<string, unknown>> {
  const now = new Date();
  const result = { creadas: 0, grabaciones: 0, errores: [] as string[] };

  // ---------- PARTE A: crear videollamadas para clases que empiezan en <= 60 min ----------
  const inOneHour = new Date(now.getTime() + 60 * 60000).toISOString();
  let upcoming: Booking[] = [];
  try {
    upcoming = await db.select<Booking>(env, "bookings_ledger", {}, {
      and: `(status.in.(scheduled,modified),meet_link.is.null,start_datetime.gte.${now.toISOString()},start_datetime.lte.${inOneHour})`,
    });
  } catch (e) { result.errores.push(`select upcoming: ${(e as Error).message}`); }

  for (const b of upcoming) {
    try {
      await crearVideollamada(env, b);
      result.creadas++;
    } catch (e) { result.errores.push(`videollamada ${b.booking_id}: ${(e as Error).message}`); }
  }

  // ---------- PARTE B: recuperar grabación de clases terminadas (hace >2h, < 3 días) ----------
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60000).toISOString();
  let finished: Booking[] = [];
  try {
    finished = await db.select<Booking>(env, "bookings_ledger", {}, {
      and: `(meet_link.not.is.null,recording_url.is.null,start_datetime.lt.${twoHoursAgo},start_datetime.gt.${threeDaysAgo})`,
    });
  } catch (e) { result.errores.push(`select finished: ${(e as Error).message}`); }

  for (const b of finished) {
    try {
      const ok = await recuperarGrabacion(env, b);
      if (ok) result.grabaciones++;
    } catch (e) { result.errores.push(`grabacion ${b.booking_id}: ${(e as Error).message}`); }
  }

  // ---------- PARTE D: grabaciones sin consentimiento o caducadas (lote C, 09/11/2026) ----------
  // Base44 decide (sabe quien consiente) y aqui se ejecuta en Drive. Pocas por ciclo: un Worker
  // no puede pasar de 50 peticiones salientes por invocacion.
  try {
    const d = await gestionarConservacion(env);
    if (d) (result as any).conservacion = d;
  } catch (e) { result.errores.push(`conservacion: ${(e as Error).message}`); }

  // ---------- PARTE C: conservación de datos (una vez al día, sobre las 03:00) ----------
  const hora = now.getUTCHours();
  const minuto = now.getUTCMinutes();
  if (hora === 3 && minuto < 15 && env.BASE44_FUNCTIONS_URL && env.AUTOMATION_SECRET) {
    try {
      const res = await fetch(`${env.BASE44_FUNCTIONS_URL}/dataRetention`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-automation-key": env.AUTOMATION_SECRET },
        // Solo lo seguro: huellas de IP y notificaciones viejas. Los mensajes no se tocan aquí.
        body: JSON.stringify({ aplicar: true, incluir_mensajes: false }),
      });
      console.log("retention:", (await res.text()).slice(0, 300));
    } catch (e) {
      result.errores.push(`retention: ${(e as Error).message}`);
    }
  }

  return result;
}

function teacherName(b: Booking): string {
  return `${b.teacher_first_name ?? ""} ${b.teacher_last_name ?? ""}`.trim();
}

/**
 * Pregunta a Menttio si el profesor tiene derecho a grabar. Antes esto se deducia de que su
 * correo acabara en @menttio.com, que obligaba a pagarle una licencia de Workspace.
 * Ante la duda responde que no: es preferible quedarse sin grabar que regalar el plan de pago.
 */
async function puedeGrabarElProfesor(env: Env, email: string | null): Promise<boolean> {
  if (!email || !env.BASE44_FUNCTIONS_URL) return false;
  try {
    const res = await fetch(`${env.BASE44_FUNCTIONS_URL}/teacherPlan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-key": env.AUTOMATION_SECRET ?? "" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return false;
    const d = (await res.json()) as any;
    return Boolean(d?.puede_grabar);
  } catch (e) {
    console.error("teacherPlan:", (e as Error).message);
    return false;
  }
}

async function crearVideollamada(env: Env, b: Booking): Promise<void> {
  // Se suplanta la cuenta principal, NO el calendario.
  //
  // Antes aqui se suplantaba CALENDAR (academia@menttio.com), que es un alias de
  // menttio@menttio.com. Google no admite alias en el campo "sub" de la suplantacion: hay que
  // dar la direccion principal. Cuando academia@ dejo de ser una cuenta con licencia propia y
  // quedo solo como alias, esta llamada empezo a devolver "invalid_grant: Invalid email or
  // User ID" y dejaron de crearse las videollamadas, mientras Drive y Gmail seguian bien
  // porque esos si usan la cuenta principal.
  //
  // El evento se sigue creando en el mismo calendario de siempre: el de menttio@menttio.com,
  // que es del que academia@ era alias.
  const token = await getAccessToken(env, SCOPES.calendar);
  const startISO = b.start_datetime!;
  const endISO = new Date(new Date(startISO).getTime() + 60 * 60000).toISOString();

  // Título que termina en _{bk_id}: la grabación de Meet hereda este nombre y así luego
  // se empareja con la reserva por el bk_id (igual que en n8n).
  const titulo = [
    normalizeText(b.subject_name ?? ""),
    `${normalizeText(b.student_first_name ?? "")}${normalizeText(b.student_last_name ?? "")}`,
    teacherName(b),
    startISO.replace(/:/g, "-"),
    b.booking_id,
  ].join("_");

  // La sala se crea con nuestra propia app, no con Calendar. Parece un rodeo y es la clave:
  // solo se pueden anadir coanfitriones a las salas que crea la propia aplicacion. Cuando la
  // creaba Calendar, la API respondia 403 incluso con un correo de la organizacion.
  // Si esto fallara, se vuelve al metodo de siempre y la clase sigue adelante sin grabacion.
  let sala = await crearEspacio(env);

  const conferenceData = sala
    ? {
        conferenceId: sala.code,
        conferenceSolution: { key: { type: "hangoutsMeet" }, name: "Google Meet" },
        entryPoints: [{ entryPointType: "video", uri: sala.uri, label: sala.uri.replace("https://", "") }],
      }
    : { createRequest: { requestId: `mnt-${b.booking_id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } };

  const crearEvento = async (conf: unknown) =>
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: titulo,
          start: { dateTime: startISO },
          end: { dateTime: endISO },
          conferenceData: conf,
        }),
      },
    );

  let res = await crearEvento(conferenceData);
  let ev = (await res.json()) as any;

  // Colgar del evento una sala creada por nosotros es lo que permite el coanfitrion, pero es
  // tambien la unica llamada del flujo que Google puede rechazar. Si lo hace, se vuelve al
  // metodo de siempre: la clase tendra videollamada aunque se pierda la grabacion. Antes esto
  // lanzaba y la clase se quedaba sin enlace, que es mucho peor.
  if (!res.ok && sala) {
    console.error(
      `Calendar rechazo la sala propia (${res.status}): ${JSON.stringify(ev.error?.message ?? ev).slice(0, 160)}. Reintentando con createRequest.`,
    );
    sala = null;
    res = await crearEvento({ createRequest: { requestId: `mnt-${b.booking_id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } });
    ev = (await res.json()) as any;
  }

  if (!res.ok) throw new Error(`Calendar (${res.status}): ${JSON.stringify(ev.error?.message ?? ev).slice(0, 160)}`);
  const meet: string = sala?.uri ?? ev.conferenceData?.entryPoints?.[0]?.uri ?? ev.hangoutLink ?? "";
  if (!meet) throw new Error("evento creado pero sin enlace Meet");

  // Guardar el link: en Supabase (control de duplicados) y en la entidad Booking de Base44.
  await db.update(env, "bookings_ledger", { booking_id: `eq.${b.booking_id}` }, { meet_link: meet });
  if (env.BASE44_FUNCTIONS_URL) {
    try {
      await fetch(`${env.BASE44_FUNCTIONS_URL}/setMeetLinkAuto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Clave compartida: la función ya no acepta peticiones anónimas.
          "x-automation-key": env.AUTOMATION_SECRET ?? "",
        },
        body: JSON.stringify({ booking_id: b.booking_id, meet_link: meet }),
      });
    } catch (e) { console.error(`setMeetLinkAuto ${b.booking_id}:`, e); }
  }

  // El profesor pasa a ser coanfitrion de la sala. Sin esto, si entra con un correo que no
  // es de la organizacion, Meet no le deja grabar (de ahi venian las cuentas @menttio.com,
  // a licencia por profesor). No corta la clase si falla: solo se pierde la grabacion.
  const tienePlanConGrabacion =
    (b.teacher_email ?? "").toLowerCase().endsWith("@menttio.com") ||
    (await puedeGrabarElProfesor(env, b.teacher_email));

  // Lote C (09/11/2026): solo se graba si TODOS los alumnos de la clase lo autorizan. Antes se
  // grababa segun el plan del profesor, sin mirar el consentimiento. Sin consentimiento tampoco
  // se hace coanfitrion al profesor: es lo que le permite grabar con una cuenta de fuera.
  const consentida = tienePlanConGrabacion ? await claseConsentida(env, b.booking_id) : false;
  if (tienePlanConGrabacion && !consentida) console.log(`grabacion ${b.booking_id}: NO (sin consentimiento de todos los alumnos)`);

  let puedeGrabar = false;
  let grabaSola = false;
  if (tienePlanConGrabacion && consentida && b.teacher_email) {
    const r = sala
      ? await coanfitrionEnEspacio(env, sala.name, b.teacher_email)
      : await hacerCoanfitrion(env, meet, b.teacher_email);
    puedeGrabar = r.ok;
    console.log(`coanfitrion ${b.booking_id}: ${r.ok ? "ok" : "FALLO"} - ${r.detalle}`);

    // Si ademas se puede dejar grabando sola, mejor: el profesor no tiene que acordarse.
    if (sala && puedeGrabar) {
      const auto = await activarGrabacionAutomatica(env, sala.name);
      grabaSola = auto.ok;
      console.log(`autograbacion ${b.booking_id}: ${auto.ok ? "ON" : "no disponible"}`);
    }
  }

  // Emails: al alumno (simple) y al profesor (con recordatorio de grabar si puede hacerlo).
  const esPremium = puedeGrabar;
  if (b.student_email) {
    const e = tpl.videollamadaAviso({ link: meet, avisoGrabar: false });
    await sendEmail(env, { to: b.student_email, subject: e.subject, html: e.html });
  }
  if (b.teacher_email) {
    const e = tpl.videollamadaAviso({ link: meet, avisoGrabar: esPremium, grabaSola, noGrabar: tienePlanConGrabacion && !consentida });
    await sendEmail(env, { to: b.teacher_email, subject: e.subject, html: e.html });
  }
}

// Los identificadores que pueden aparecer en el nombre de la grabacion. Se usan tal cual
// dentro de la consulta de Drive, asi que se limpia todo lo que no sea alfanumerico o guion:
// ni el id de reserva ni el codigo de sala llevan nada mas, y asi no se puede colar una
// comilla que rompa (o amplie) la consulta.
function terminosDeBusqueda(b: Booking): string[] {
  const limpio = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "");
  const terminos = [limpio(b.booking_id ?? "")];
  // Meet nombra la grabacion con el codigo de la sala ("abc-defg-hij (2026-09-24 15:16 ...)")
  // desde que la sala la crea nuestra propia aplicacion. Antes heredaba el titulo del evento
  // de calendario, que termina en el id de reserva. Hay grabaciones de las dos epocas.
  const codigo = (b.meet_link ?? "").match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)?.[1];
  if (codigo) terminos.push(limpio(codigo));
  return terminos.filter((t) => t.length >= 8);
}

async function buscarEnDrive(env: Env, token: string, q: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`Drive (${res.status}): ${JSON.stringify(data.error?.message ?? data).slice(0, 160)}`);
  return (data.files ?? []) as Array<{ id: string; name: string }>;
}

async function recuperarGrabacion(env: Env, b: Booking): Promise<boolean> {
  const token = await getAccessToken(env, SCOPES.drive); // impersona menttio@menttio.com

  const terminos = terminosDeBusqueda(b);
  if (terminos.length === 0) return false;
  const porNombre = terminos.map((t) => `name contains '${t}'`).join(" or ");

  let encontrados = await buscarEnDrive(env, token, `'${REC_FOLDER}' in parents and trashed=false and (${porNombre})`);
  // Segunda pasada sin la carpeta: si Meet la deja en otro sitio (una unidad compartida, o
  // la carpeta del organizador), la grabacion existe y solo estamos mirando donde no esta.
  if (encontrados.length === 0) {
    encontrados = await buscarEnDrive(env, token, `trashed=false and mimeType contains 'video/' and (${porNombre})`);
  }

  const file = encontrados[0];
  if (!file) return false; // todavía no está la grabación; se reintenta en el próximo tick
  console.log(`grabacion ${b.booking_id}: "${file.name}"`);

  const fileId: string = file.id;

  // Se guarda primero en Menttio, porque es quien sabe si el alumno autoriza la grabacion.
  // El orden importa: si no la autoriza, tampoco se le comparte el archivo en Drive.
  // Antes esto se escribia en una hoja de calculo que tenia que estar compartida publicamente
  // para poderla leer con una clave de API; al cerrarla, las grabaciones dejaron de aparecer.
  const guardado = await guardarGrabacionEnMenttio(env, b.booking_id, fileId);

  if (guardado.consent) {
    // La grabacion nace heredando los permisos de la carpeta. Se le da acceso nominal a quien
    // estuvo en la clase (alumno y profesor); la carpeta ya no es publica.
    try {
      // Base44 devuelve los alumnos de la clase (tambien los de grupo) y el profesor.
      const destinatarios = (guardado.destinatarios.length > 0
        ? guardado.destinatarios
        : [b.student_email, b.teacher_email].filter(Boolean)) as string[];
      if (destinatarios.length > 0) await asegurarAccesoGrabacion(env, fileId, destinatarios);
    } catch (e) {
      console.error(`permisos grabacion ${b.booking_id}:`, e);
    }
  } else {
    console.log(`grabacion ${b.booking_id}: no se publica (${guardado.motivo})`);
  }

  // Supabase solo lleva el control de duplicados: sin este valor, la clase se volveria a
  // rastrear cada 15 minutos durante tres dias. Se marca cuando la respuesta es definitiva
  // (hay permiso o no lo hay); si el fallo fue de red, se deja en blanco para reintentarlo.
  const definitivo = guardado.consent || guardado.motivo === "sin_consentimiento" || guardado.motivo === "clase_sin_alumnos";
  if (!definitivo) {
    console.error(`grabacion ${b.booking_id}: sin guardar (${guardado.motivo}), se reintenta`);
    return false;
  }
  await db.update(env, "bookings_ledger", { booking_id: `eq.${b.booking_id}` }, {
    recording_url: guardado.consent ? fileId : `sin_consentimiento:${fileId}`,
  });
  return true;
}

// Llama a saveRecording, que comprueba el consentimiento y escribe el enlace en la reserva.
// Si Menttio no contesta se devuelve consent:false a proposito: es mejor no compartir el
// archivo y reintentarlo en el siguiente tick que compartirlo sin saber si hay permiso.
async function guardarGrabacionEnMenttio(
  env: Env,
  bookingId: string,
  fileId: string,
): Promise<{ consent: boolean; motivo: string; destinatarios: string[] }> {
  if (!env.BASE44_FUNCTIONS_URL || !env.AUTOMATION_SECRET) {
    return { consent: false, motivo: "sin_configuracion", destinatarios: [] };
  }
  try {
    const res = await fetch(`${env.BASE44_FUNCTIONS_URL}/saveRecording`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-automation-key": env.AUTOMATION_SECRET,
      },
      body: JSON.stringify({ booking_id: bookingId, drive_file_id: fileId }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      console.error(`saveRecording ${bookingId}: ${res.status} ${JSON.stringify(data).slice(0, 160)}`);
      return { consent: false, motivo: `error_${res.status}`, destinatarios: [] };
    }
    const destinatarios = Array.isArray(data.destinatarios) ? data.destinatarios.filter((x: unknown) => typeof x === "string") : [];
    return { consent: data.consent === true, motivo: data.motivo ?? "ok", destinatarios };
  } catch (e) {
    console.error(`saveRecording ${bookingId}:`, e);
    return { consent: false, motivo: "sin_respuesta", destinatarios: [] };
  }
}

// Pregunta a Menttio si todos los alumnos de la clase autorizan la grabacion. Ante cualquier
// fallo responde que no: es preferible perder una grabacion que grabar a alguien sin permiso.
async function claseConsentida(env: Env, bookingId: string): Promise<boolean> {
  if (!env.BASE44_FUNCTIONS_URL || !env.AUTOMATION_SECRET) return false;
  try {
    const res = await fetch(`${env.BASE44_FUNCTIONS_URL}/consentimientoClase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-key": env.AUTOMATION_SECRET },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) return false;
    const d = (await res.json()) as any;
    return d?.consentimiento === true;
  } catch (e) {
    console.error("consentimientoClase:", (e as Error).message);
    return false;
  }
}

// Ejecuta en Drive lo que decide recordingActions (Base44): cuarentena y papelera.
async function gestionarConservacion(env: Env): Promise<Record<string, unknown> | null> {
  if (!env.BASE44_FUNCTIONS_URL || !env.AUTOMATION_SECRET) return null;
  const llamar = async (cuerpo: unknown) => {
    const res = await fetch(`${env.BASE44_FUNCTIONS_URL}/recordingActions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-automation-key": env.AUTOMATION_SECRET },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) throw new Error(`recordingActions ${res.status}`);
    return (await res.json()) as any;
  };
  const { acciones = [], resumen } = await llamar({ modo: "pendientes", limite: 4 });
  if (!acciones.length) return null;
  const resultados: { booking_id: string; estado: string }[] = [];
  const errores: string[] = [];
  for (const a of acciones) {
    try {
      if (a.accion === "cuarentena") await ponerEnCuarentena(env, a.file_id);
      else if (a.accion === "papelera") await mandarAPapelera(env, a.file_id);
      else continue;
      resultados.push({ booking_id: a.booking_id, estado: a.accion });
      console.log(`conservacion ${a.booking_id}: ${a.accion} (${a.motivo})`);
    } catch (e) {
      errores.push(`${a.booking_id}: ${(e as Error).message}`);
    }
  }
  if (resultados.length) await llamar({ modo: "hecho", resultados });
  return { hechas: resultados.length, errores, resumen };
}
