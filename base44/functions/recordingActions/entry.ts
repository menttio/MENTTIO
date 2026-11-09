import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Conservacion de grabaciones (lote C, 09/11/2026). La llama el worker en cada ciclo (15 min)
// con la clave compartida AUTOMATION_SECRET. Base44 decide (sabe quien consiente); el worker
// ejecuta en Drive (es quien tiene acceso) y luego informa del resultado.
//
//   modo "pendientes" -> devuelve como mucho `limite` acciones:
//     - cuarentena: grabacion sin consentimiento de todos los alumnos, o grabada antes de que lo
//       dieran (decision 2a). El worker la saca de la carpeta compartida a una carpeta cerrada y
//       le quita todos los accesos salvo el del propietario (menttio@).
//     - papelera: 30 dias en cuarentena, o mas de 12 meses desde la clase. El worker la manda a
//       la papelera de Drive (se puede recuperar durante 30 dias mas; despues Google la borra).
//   modo "hecho" -> el worker informa de lo que hizo y se anota en la reserva.
// Plazos propuestos a falta de validacion legal (PLAN-SEGURIDAD-Y-MIGRACION.md, seccion 3).

const DIA = 86400000;
const PLAZO_CUARENTENA = 30 * DIA;
const PLAZO_CONSERVACION = 365 * DIA;

// --- Consentimiento de grabacion (lote C, 09/11/2026). Copia identica en saveRecording,
// recordingUrl, consentimientoClase y recordingActions: Base44 no comparte codigo entre funciones.
// Fuente de verdad: el ultimo evento de la entidad Consent (tipo grabacion) de cada alumno, que
// solo escribe el servidor. Student.recording_consent es solo una copia para pintar pantallas.
// Una clase cuenta como consentida si TODOS sus alumnos tienen el permiso vigente y lo dieron
// el dia de la clase o antes: dar el permiso no cubre clases grabadas antes (decision 2a).
type Consentimiento = { ok: boolean; desde: string | null };
async function consentimientoDe(db: any, correo: string, cache: Map<string, Consentimiento>): Promise<Consentimiento> {
  if (cache.has(correo)) return cache.get(correo)!;
  const ev = await db.entities.Consent.filter({ user_email: correo, type: 'grabacion' }, '-event_date', 1).catch(() => []);
  const u = ev[0];
  const r = u && u.granted === true
    ? { ok: true, desde: String(u.event_date || u.created_date || '').slice(0, 10) }
    : { ok: false, desde: null };
  cache.set(correo, r);
  return r;
}
function alumnosDe(b: any): string[] {
  const enrolled = Array.isArray(b.enrolled_students) ? b.enrolled_students : [];
  return [...new Set(
    [b.student_email, ...enrolled.map((s: any) => s?.student_email)]
      .filter(Boolean).map((e: unknown) => String(e).trim().toLowerCase()),
  )];
}
async function claseConsentida(db: any, b: any, cache: Map<string, Consentimiento>): Promise<{ ok: boolean; motivo: string }> {
  const correos = alumnosDe(b);
  if (!correos.length) return { ok: false, motivo: 'clase_sin_alumnos' };
  const dia = String(b.date || '').slice(0, 10);
  for (const c of correos) {
    const r = await consentimientoDe(db, c, cache);
    if (!r.ok) return { ok: false, motivo: 'sin_consentimiento' };
    if (dia && r.desde && r.desde > dia) return { ok: false, motivo: 'grabada_antes_del_consentimiento' };
  }
  return { ok: true, motivo: 'ok' };
}
// --- fin consentimiento

function fileIdDe(url: unknown): string | null {
  const s = String(url || '');
  const m = s.match(/\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  const secreto = Deno.env.get('AUTOMATION_SECRET');
  if (!secreto || (req.headers.get('x-automation-key') || '') !== secreto) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const db = createClientFromRequest(req).asServiceRole;
    const ahora = Date.now();

    if (body.modo === 'hecho') {
      const resultados = Array.isArray(body.resultados) ? body.resultados.slice(0, 50) : [];
      let actualizadas = 0;
      for (const r of resultados) {
        const id = String(r?.booking_id || '');
        if (!id || !['cuarentena', 'papelera'].includes(r?.estado)) continue;
        const b = await db.entities.Booking.get(id).catch(() => null);
        if (!b) continue;
        if (r.estado === 'cuarentena') {
          await db.entities.Booking.update(id, {
            recording_status: 'cuarentena',
            recording_quarantined_at: b.recording_quarantined_at || new Date(ahora).toISOString(),
          });
        } else {
          await db.entities.Booking.update(id, {
            recording_status: 'papelera',
            recording_trashed_at: new Date(ahora).toISOString(),
          });
        }
        actualizadas++;
      }
      return Response.json({ ok: true, actualizadas });
    }

    const limite = Math.max(1, Math.min(Number(body.limite) || 5, 10));
    const reservas: any[] = [];
    for (let p = 0; p < 20; p++) {
      const lote = await db.entities.Booking.filter({}, '-date', 500, p * 500);
      reservas.push(...lote);
      if (lote.length < 500) break;
    }

    const cache = new Map();
    const acciones: any[] = [];
    const resumen = { con_grabacion: 0, disponibles: 0, en_cuarentena: 0, en_papelera: 0, pendientes: 0 };
    for (const b of reservas) {
      const fileId = fileIdDe(b.recording_url);
      if (!fileId) continue;
      resumen.con_grabacion++;
      const estado = b.recording_status || 'disponible';
      if (estado === 'papelera') { resumen.en_papelera++; continue; }

      let accion: string | null = null;
      let motivo = '';
      if (estado === 'cuarentena') {
        resumen.en_cuarentena++;
        const desde = Date.parse(b.recording_quarantined_at || '');
        if (!isNaN(desde) && ahora - desde > PLAZO_CUARENTENA) { accion = 'papelera'; motivo = '30_dias_en_cuarentena'; }
      } else {
        const c = await claseConsentida(db, b, cache);
        const dia = Date.parse(String(b.date || '') + 'T00:00:00Z');
        if (!c.ok) { accion = 'cuarentena'; motivo = c.motivo; }
        else if (!isNaN(dia) && ahora - dia > PLAZO_CONSERVACION) { accion = 'papelera'; motivo = 'mas_de_12_meses'; }
        else resumen.disponibles++;
      }
      if (!accion) continue;
      if (acciones.length < limite) acciones.push({ booking_id: b.id, file_id: fileId, accion, motivo });
      else resumen.pendientes++;
    }
    return Response.json({ acciones, resumen });
  } catch (e) {
    console.error('recordingActions:', (e as Error)?.message);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
