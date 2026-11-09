import type { Env } from "./env";
import * as sheets from "./lib/sheets";

// Importación de una sola vez: pasa las grabaciones que estaban anotadas en la hoja de
// cálculo a la propia reserva de Menttio.
//
// La hoja tenía que estar compartida públicamente para poderla leer con una clave de API, que
// es como la leía la app. Al cerrarla (contenía clases de menores) las grabaciones antiguas
// dejaron de aparecer. La cuenta de servicio sí la sigue viendo, así que desde aquí se puede
// recuperar todo sin tocar nada a mano.
//
// El enlace se guarda en todas, y quien decide si se muestra es recordingUrl, que comprueba
// el consentimiento en cada lectura. Las que no lo tienen se cuentan aparte para saber cuántas
// son, pero se guardan igual: así, cuando el alumno dé el permiso, aparecen solas.
export async function importarGrabaciones(
  env: Env,
  opciones: { dryRun?: boolean; limite?: number; desde?: number } = {},
): Promise<Record<string, unknown>> {
  if (!env.BASE44_FUNCTIONS_URL || !env.AUTOMATION_SECRET) {
    throw new Error("faltan BASE44_FUNCTIONS_URL o AUTOMATION_SECRET");
  }

  // Un Worker no puede hacer mas de 50 peticiones salientes por invocacion, y aqui hay una
  // por grabacion. Por eso se va por tandas: cada llamada procesa un tramo y devuelve desde
  // donde seguir. La funcion es idempotente, asi que repetir un tramo no rompe nada.
  const desde = Math.max(0, opciones.desde ?? 0);
  const limite = Math.max(1, Math.min(opciones.limite ?? 35, 40));

  const filas = await sheets.readRange(env, sheets.SHEET_GRABACIONES, "A:F");
  const resumen = {
    filas: filas.length,
    con_grabacion: 0,
    guardadas: 0,
    ya_estaban: 0,
    sin_consentimiento: 0,
    no_encontradas: 0,
    errores: [] as string[],
  };

  // Pares (clase, archivo) validos, en orden. Se calcula sobre la hoja entera para que el
  // indice "desde" signifique lo mismo en todas las tandas.
  const pendientes: Array<{ bookingId: string; fileId: string }> = [];
  for (const fila of filas) {
    const bookingId = (fila[0] ?? "").toString().trim();
    const fileId = (fila[5] ?? "").toString().trim();
    if (!bookingId || !fileId) continue;
    // La cabecera de la hoja tambien es una fila: "ID clase" no es un identificador.
    if (bookingId.toLowerCase().startsWith("id ")) continue;
    pendientes.push({ bookingId, fileId });
  }
  resumen.con_grabacion = pendientes.length;

  const tramo = pendientes.slice(desde, desde + limite);
  let procesadas = 0;
  for (const { bookingId, fileId } of tramo) {
    procesadas++;
    if (opciones.dryRun) continue;

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
      if (res.status === 404) {
        resumen.no_encontradas++;
      } else if (!res.ok) {
        resumen.errores.push(`${bookingId}: ${res.status} ${JSON.stringify(data).slice(0, 120)}`);
      } else if (data.ya_estaba === true) {
        resumen.ya_estaban++;
        if (data.consent !== true) resumen.sin_consentimiento++;
      } else {
        resumen.guardadas++;
        if (data.consent !== true) resumen.sin_consentimiento++;
      }
    } catch (e) {
      resumen.errores.push(`${bookingId}: ${(e as Error).message}`);
    }
  }

  resumen.errores = resumen.errores.slice(0, 20);
  const siguiente = desde + tramo.length;
  return {
    ...resumen,
    desde,
    procesadas,
    siguiente: siguiente < pendientes.length ? siguiente : null,
    quedan: Math.max(0, pendientes.length - siguiente),
    dry_run: Boolean(opciones.dryRun),
  };
}
