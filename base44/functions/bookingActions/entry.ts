import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lote E2 (10/11/2026): P6 y P11. Unica puerta para escribir reservas.
//
// Antes el navegador escribia la entidad Booking directamente: cualquiera podia crear reservas
// con cualquier precio, profesor o alumno, y alumno y profesor podian cambiar cualquier campo
// (marcarla como pagada, el precio, los correos, el Meet o la grabacion). Ahora la regla de
// Booking solo deja escribir al servidor, y esta funcion hace cada operacion legitima de la app
// comprobando quien la pide y montando los datos desde la base de datos.
//
// Acciones: crear, reprogramar, cancelar, borrar, pago, pago_enviado, progreso,
// archivos_anadir, archivo_quitar.

const err = (error: string, status = 400) => Response.json({ error }, { status });
const lower = (s: unknown) => String(s ?? '').trim().toLowerCase();
const lista = (x: unknown): any[] => (Array.isArray(x) ? x : []);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const ADMIN_AVISOS = 'menttio@menttio.com';

function aMin(h: string) {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
}
function finDe(hora: string, minutos: number) {
  const t = aMin(hora) + minutos;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// Momento de la clase en hora de Madrid, como instante real.
function instante(fecha: string, hora: string) {
  const base = new Date(`${fecha}T${hora}:00Z`);
  const madrid = new Date(base.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const utc = new Date(base.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(base.getTime() - (madrid.getTime() - utc.getTime()));
}

// Copia de classPayment: tarifas por hora que el profesor tiene para esa asignatura.
function tarifas(teacher: any, subjectId: string): number[] {
  const precios: number[] = [];
  for (const s of lista(teacher?.subjects)) {
    if (String(s.subject_id) !== String(subjectId)) continue;
    if (typeof s.price_per_hour === 'number') precios.push(s.price_per_hour);
    if (typeof s.group_price_per_person === 'number') precios.push(s.group_price_per_person);
    if (s.group_prices && typeof s.group_prices === 'object') {
      for (const v of Object.values(s.group_prices)) if (typeof v === 'number') precios.push(v);
    }
  }
  return precios;
}

function camposComision(teacher: any, precio: number) {
  if (teacher?.subscription_plan !== 'commission') return { platform_fee: null, teacher_payout: null };
  const pct = Number(teacher.commission_percentage ?? 10);
  return {
    platform_fee: parseFloat(((precio * pct) / 100).toFixed(2)),
    teacher_payout: parseFloat((precio * (1 - pct / 100)).toFixed(2)),
  };
}

const esAlumnoDe = (student: any, teacherId: string) =>
  lista(student?.assigned_teachers).some((a) => String(a?.teacher_id) === String(teacherId));

async function avisarAdmin(db: any, asunto: string, texto: string) {
  console.error(`AVISO: ${asunto} | ${texto}`);
  try {
    await db.integrations.Core.SendEmail({
      to: ADMIN_AVISOS, subject: `[Menttio pagos] ${asunto}`, from_name: 'Menttio', body: `<p>${texto}</p>`,
    });
  } catch (e) {
    console.error('No se pudo enviar el aviso:', (e as Error).message);
  }
}

// ---------------------------------------------------------------- crear
async function crear(db: any, yo: string, esAdmin: boolean, body: any) {
  const teacher = await db.entities.Teacher.get(String(body.teacher_id || '')).catch(() => null);
  if (!teacher) return err('Profesor no encontrado', 404);
  const comoProfesor = lower(teacher.user_email) === yo || esAdmin;

  const subjectId = String(body.subject_id || '');
  const materia = lista(teacher.subjects).find((s) => String(s.subject_id) === subjectId);
  if (!materia) return err('El profesor no da esa asignatura');
  let subjectName = materia.subject_name || materia.name || '';
  if (!subjectName) {
    const subj = await db.entities.Subject.get(subjectId).catch(() => null);
    subjectName = subj?.name || '';
  }

  const duracion = Number(body.duration_minutes);
  if (!Number.isInteger(duracion) || duracion < 15 || duracion > 480) return err('Duracion no valida');
  const precio = Number(body.price);
  if (!Number.isFinite(precio) || precio < 0 || precio > 2000) return err('Precio no valido');

  const fechas = (Array.isArray(body.fechas) ? body.fechas : [{ date: body.date, start_time: body.start_time }])
    .map((f: any) => ({ date: String(f?.date || ''), start_time: String(f?.start_time || '') }));
  if (fechas.length === 0 || fechas.length > 60) return err('Numero de fechas no valido');
  if (fechas.some((f: any) => !FECHA.test(f.date) || !HORA.test(f.start_time))) return err('Fecha u hora no valida');

  const esGrupo = body.class_type === 'group';
  const ahora = Date.now();
  let alumnos: any[] = [];

  if (comoProfesor) {
    const ids = lista(body.student_ids).map(String).filter(Boolean);
    if (ids.length === 0 || (!esGrupo && ids.length !== 1) || ids.length > 50) return err('Alumnos no validos');
    for (const id of [...new Set(ids)]) {
      const s = await db.entities.Student.get(id).catch(() => null);
      // Solo alumnos del profesor: si no, cualquier profesor podria meter en una clase (y
      // escribir) a cualquier alumno de Menttio.
      if (!s || (!esAdmin && !esAlumnoDe(s, teacher.id))) return err('Ese alumno no es tuyo', 403);
      alumnos.push(s);
    }
  } else {
    // Reserva del propio alumno: el alumno es quien llama, el precio tiene que ser una tarifa
    // del profesor, la clase tiene que ser futura y el hueco tiene que estar libre.
    const fichas = await db.entities.Student.filter({ user_email: yo }).catch(() => []);
    if (!fichas[0]) return err('No tienes ficha de alumno', 403);
    alumnos = [fichas[0]];
    if (fechas.length !== 1) return err('Solo se puede reservar una clase cada vez');
    const validos = tarifas(teacher, subjectId).map((p) => (p * duracion) / 60);
    if (validos.length > 0 && !validos.some((p) => Math.abs(p - precio) < 0.01)) {
      return err('El precio no coincide con las tarifas del profesor');
    }
    const f = fechas[0];
    if (instante(f.date, f.start_time).getTime() < ahora) return err('No se puede reservar en el pasado');
    const ocupadas = await db.entities.Booking.filter({ teacher_id: teacher.id, date: f.date, status: 'scheduled' }).catch(() => []);
    const ini = aMin(f.start_time);
    const fin = ini + duracion;
    const choca = ocupadas.some((o: any) => {
      const oi = aMin(String(o.start_time || '00:00'));
      const of = oi + (Number(o.duration_minutes) || 60);
      return ini < of && fin > oi;
    });
    if (choca) return err('Ese hueco ya esta ocupado', 409);
  }

  const tope = body.group_unlimited ? null : Math.min(Math.max(Number(body.max_students) || 4, 2), 50);
  const creadas = [];
  for (const f of fechas) {
    const finHora = finDe(f.start_time, duracion);
    const pasada = instante(f.date, finHora).getTime() < ahora;
    const datos: any = {
      teacher_id: teacher.id,
      teacher_name: teacher.full_name || '',
      teacher_email: teacher.user_email,
      teacher_phone: teacher.phone || '',
      subject_id: subjectId,
      subject_name: subjectName,
      date: f.date,
      start_time: f.start_time,
      end_time: finHora,
      duration_minutes: duracion,
      price: precio,
      status: comoProfesor && pasada ? 'completed' : 'scheduled',
      payment_status: 'pending',
      files: [],
      ...camposComision(teacher, precio),
    };
    if (esGrupo) {
      Object.assign(datos, {
        class_type: 'group',
        max_students: tope,
        group_unlimited: tope === null,
        enrolled_students: alumnos.map((a) => ({
          student_id: a.id, student_name: a.full_name || '', student_email: a.user_email, payment_status: 'pending',
        })),
      });
    } else {
      const a = alumnos[0];
      Object.assign(datos, {
        class_type: 'individual',
        student_id: a.id,
        student_name: a.full_name || '',
        student_email: a.user_email,
        student_phone: a.phone || '',
      });
    }
    creadas.push(await db.entities.Booking.create(datos));
  }
  return Response.json({ booking: creadas[0], bookings: creadas });
}

// ---------------------------------------------------------------- resto de acciones
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err('Tienes que iniciar sesion', 401);
    const yo = lower(user.email);
    const esAdmin = user.role === 'admin';
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole;
    const accion = String(body.accion || '');

    if (accion === 'crear') return await crear(db, yo, esAdmin, body);

    const b = await db.entities.Booking.get(String(body.booking_id || '')).catch(() => null);
    if (!b) return err('Reserva no encontrada', 404);
    const enrolled = lista(b.enrolled_students);
    const esGrupo = b.class_type === 'group';
    const esProfesor = lower(b.teacher_email) === yo || esAdmin;
    const esAlumno = lower(b.student_email) === yo || enrolled.some((s) => lower(s?.student_email) === yo);
    if (!esProfesor && !esAlumno) return err('Esta clase no es tuya', 403);

    const inicio = instante(String(b.date), String(b.start_time || '00:00')).getTime();
    const faltan24h = inicio - Date.now() > 24 * 3600 * 1000;
    const cobradaConTarjeta = b.payment_method === 'stripe' &&
      (['paid', 'refunded'].includes(b.payment_status) || enrolled.some((s) => s?.payment_status === 'paid'));
    const actualizar = async (campos: any) => Response.json({ booking: await db.entities.Booking.update(b.id, campos) });

    switch (accion) {
      case 'reprogramar': {
        if (b.status !== 'scheduled') return err('Solo se pueden mover clases programadas');
        if (!esProfesor && (esGrupo || !faltan24h)) return err('Solo se puede cambiar hasta 24 horas antes', 403);
        const date = String(body.date || '');
        const start = String(body.start_time || '');
        if (!FECHA.test(date) || !HORA.test(start)) return err('Fecha u hora no valida');
        if (!esProfesor && instante(date, start).getTime() < Date.now()) return err('No se puede mover al pasado');
        return await actualizar({ date, start_time: start, end_time: finDe(start, Number(b.duration_minutes) || 60) });
      }

      case 'cancelar': {
        // Ya no se borra: queda 'cancelled' para conservar el registro del pago (decision 3a).
        if (b.status === 'cancelled') return Response.json({ booking: b });
        if (esAlumno && !esProfesor && esGrupo) {
          if (!faltan24h || b.status !== 'scheduled') return err('Solo puedes salir hasta 24 horas antes', 403);
          const quedan = enrolled.filter((s) => lower(s?.student_email) !== yo);
          return await actualizar(quedan.length ? { enrolled_students: quedan } : { enrolled_students: quedan, status: 'cancelled' });
        }
        if (!esProfesor && (!faltan24h || b.status !== 'scheduled')) return err('Solo se puede cancelar hasta 24 horas antes', 403);
        if (cobradaConTarjeta) {
          await avisarAdmin(db, 'Clase pagada con tarjeta cancelada',
            `${yo} ha cancelado la clase ${b.id} (${b.subject_name}, ${b.date} ${b.start_time}), cobrada con tarjeta (${b.stripe_payment_id || 'pago de grupo'}). Decide si hay que reembolsarla en Stripe.`);
        }
        return await actualizar({ status: 'cancelled' });
      }

      case 'borrar': {
        // Historial del profesor. Las clases cobradas con tarjeta no se borran: son el registro
        // del cobro (y de la comision). Se cancelan en su lugar.
        if (!esProfesor) return err('Solo el profesor puede borrar clases', 403);
        if (cobradaConTarjeta) return err('Las clases cobradas con tarjeta no se pueden borrar', 409);
        await db.entities.Booking.delete(b.id);
        return Response.json({ ok: true });
      }

      case 'pago': {
        // Marcar a mano como pagada / no pagada (Bizum, efectivo). Solo el profesor.
        if (!esProfesor) return err('Solo el profesor puede confirmar pagos', 403);
        const estado = body.estado === 'paid' ? 'paid' : body.estado === 'pending' ? 'pending' : null;
        if (!estado) return err('Estado no valido');
        if (b.payment_method === 'stripe' && ['paid', 'refunded'].includes(b.payment_status)) {
          return err('Esta clase se cobro con tarjeta: su estado lo pone Stripe', 409);
        }
        if (!esAdmin) {
          const teacher = await db.entities.Teacher.get(String(b.teacher_id)).catch(() => null);
          // P11 / decision 2a: en el plan sin cuota las clases se cobran solo con tarjeta.
          if (teacher?.subscription_plan === 'commission') {
            return err('En el plan sin cuota las clases se cobran con tarjeta: no se pueden marcar como pagadas a mano', 403);
          }
        }
        const campos: any = { payment_status: estado };
        if (estado === 'paid' && b.payment_method !== 'bizum') campos.payment_method = 'other';
        if (esGrupo) {
          // Los que ya pagaron con tarjeta no se tocan: su estado lo pone Stripe.
          const conTarjeta = (s: any) => b.payment_method === 'stripe' && s?.payment_status === 'paid';
          campos.enrolled_students = enrolled.map((s) => (conTarjeta(s) ? s : { ...s, payment_status: estado }));
        }
        return await actualizar(campos);
      }

      case 'pago_enviado': {
        // El alumno avisa de que ha hecho el Bizum; el profesor lo confirma con 'pago'.
        if (!esAlumno) return err('Solo el alumno puede avisar de su pago', 403);
        const teacher = await db.entities.Teacher.get(String(b.teacher_id)).catch(() => null);
        if (teacher?.subscription_plan === 'commission') return err('En el plan sin cuota las clases se pagan con tarjeta', 403);
        if (esGrupo) {
          return await actualizar({
            enrolled_students: enrolled.map((s) => (lower(s?.student_email) === yo && s?.payment_status !== 'paid' ? { ...s, payment_status: 'pending_confirmation' } : s)),
          });
        }
        if (b.payment_status !== 'pending') return err('Esta clase no esta pendiente de pago', 409);
        return await actualizar({ payment_status: 'pending_confirmation', payment_method: 'bizum' });
      }

      case 'progreso': {
        if (!esProfesor) return err('Solo el profesor puede escribir la nota de progreso', 403);
        const nota = String(body.progress_note ?? '').slice(0, 5000);
        const r = Number(body.progress_rating);
        const campos: any = {
          progress_note: nota,
          progress_rating: Number.isInteger(r) && r >= 1 && r <= 5 ? r : null,
        };
        if ('homework_done' in body) campos.homework_done = typeof body.homework_done === 'boolean' ? body.homework_done : null;
        return await actualizar(campos);
      }

      case 'archivos_anadir': {
        const nuevos = lista(body.files).slice(0, 20).map((f) => ({
          name: String(f?.name || 'archivo').slice(0, 200),
          url: String(f?.url || ''),
          uploaded_by: yo,
        }));
        if (nuevos.length === 0 || nuevos.some((f) => !/^https:\/\//.test(f.url))) return err('Archivos no validos');
        const files = [...lista(b.files), ...nuevos];
        await db.entities.Booking.update(b.id, { files });
        return Response.json({ files });
      }

      case 'archivo_quitar': {
        const url = String(body.url || '');
        const actuales = lista(b.files);
        const i = actuales.findIndex((f) => f?.url === url);
        if (i < 0) return Response.json({ files: actuales });
        const autor = lower(actuales[i]?.uploaded_by);
        // El profesor puede quitar cualquiera; el alumno, solo los suyos (los antiguos guardaban
        // el rol 'student' en vez del correo: valen en las clases individuales).
        const suyo = autor === yo || (autor === 'student' && esAlumno && !esGrupo);
        if (!esProfesor && !suyo) return err('Ese archivo no es tuyo', 403);
        const files = actuales.filter((_, j) => j !== i);
        await db.entities.Booking.update(b.id, { files });
        return Response.json({ files });
      }

      default:
        return err('Accion no valida');
    }
  } catch (e) {
    console.error('bookingActions:', (e as Error)?.message);
    return err('Error interno', 500);
  }
});
