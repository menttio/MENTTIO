import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// La llama el worker antes de crear la videollamada (lote C, 09/11/2026): solo se activa la
// grabacion (coanfitrion + grabacion automatica) si TODOS los alumnos de la clase la autorizan.
// Antes se grababa segun el plan del profesor, sin mirar el consentimiento.
// Solo con la clave compartida AUTOMATION_SECRET.

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

Deno.serve(async (req) => {
  const secreto = Deno.env.get('AUTOMATION_SECRET');
  if (!secreto || (req.headers.get('x-automation-key') || '') !== secreto) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.booking_id || '').trim();
    if (!id) return Response.json({ error: 'booking_id es obligatorio' }, { status: 400 });
    const db = createClientFromRequest(req).asServiceRole;
    const b = await db.entities.Booking.get(id).catch(() => null);
    if (!b) return Response.json({ consentimiento: false, motivo: 'no_encontrada' });
    const r = await claseConsentida(db, b, new Map());
    return Response.json({ consentimiento: r.ok, motivo: r.motivo });
  } catch (e) {
    console.error('consentimientoClase:', (e as Error)?.message);
    return Response.json({ consentimiento: false, motivo: 'error' }, { status: 500 });
  }
});
