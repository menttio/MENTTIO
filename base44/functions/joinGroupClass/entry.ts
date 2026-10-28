import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const DEFAULT_GROUP_PRICES: Record<number, number> = { 2: 18, 3: 16, 4: 15 };
const MAX_TRAMOS_GRUPO = 4;

// Mismas reglas que src/lib/asignaturas.js. Una asignatura creada antes de las casillas no
// trae offers_individual ni offers_group: entonces la individual era obligatoria y la grupal
// solo existia si habia un maximo de alumnos configurado.
function daIndividual(asignatura: any): boolean {
  if (!asignatura) return false;
  if (asignatura.offers_individual == null) return true;
  return asignatura.offers_individual === true;
}

function grupoIndefinido(asignatura: any): boolean {
  return asignatura?.group_unlimited === true;
}

function maxAlumnosGrupo(asignatura: any): number | null {
  if (grupoIndefinido(asignatura)) return null;
  const max = parseInt(asignatura?.max_group_students);
  return Number.isFinite(max) && max >= 2 ? max : MAX_TRAMOS_GRUPO;
}

function precioGrupalPorHora(asignatura: any, numAlumnos: number): number {
  if (!asignatura) return 0;
  if (grupoIndefinido(asignatura)) {
    const porPersona = Number(asignatura.group_price_per_person);
    return Number.isFinite(porPersona) && porPersona > 0 ? porPersona : 0;
  }
  if (numAlumnos <= 1 && daIndividual(asignatura)) {
    return Number(asignatura.price_per_hour) || 0;
  }
  const tramos = asignatura.group_prices || {};
  const tope = maxAlumnosGrupo(asignatura) ?? MAX_TRAMOS_GRUPO;
  const clave = Math.min(Math.max(numAlumnos, 2), tope, MAX_TRAMOS_GRUPO);
  const valor = tramos[String(clave)] ?? tramos[clave];
  if (valor != null && valor !== '' && Number(valor) > 0) return Number(valor);
  return Number(DEFAULT_GROUP_PRICES[clave]) || Number(asignatura.price_per_hour) || 0;
}

// Apuntarse a una clase de grupo ya creada. Antes lo hacía el navegador escribiendo directamente
// en la reserva de otra persona (y enviando el precio). Ahora el servidor comprueba plazas,
// duplicados y calcula el precio con las tarifas del profesor.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id: bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return Response.json({ error: 'booking_id es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const email = (user.email || '').toLowerCase();

    const students = await db.entities.Student.filter({ user_email: user.email });
    const student = students[0];
    if (!student) {
      return Response.json({ error: 'Solo los alumnos pueden apuntarse a una clase' }, { status: 403 });
    }

    const booking = await db.entities.Booking.get(String(bookingId)).catch(() => null);
    if (!booking || booking.class_type !== 'group') {
      return Response.json({ error: 'Clase de grupo no encontrada' }, { status: 404 });
    }
    if (booking.status !== 'scheduled') {
      return Response.json({ error: 'Esa clase ya no admite inscripciones' }, { status: 400 });
    }

    const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    if (enrolled.some((s) => (s.student_email || '').toLowerCase() === email)) {
      return Response.json({ error: 'Ya estás apuntado a esta clase' }, { status: 400 });
    }
    // Una clase de grupo indefinido no tiene tope. Antes el `|| 4` la cerraba al cuarto alumno,
    // asi que un profesor con grupo sin limite se habria quedado sin poder meter al quinto.
    const sinTope = booking.group_unlimited === true;
    const maxStudents = sinTope ? Infinity : (Number(booking.max_students) || 4);
    if (enrolled.length >= maxStudents) {
      return Response.json({ error: 'La clase ya está completa' }, { status: 409 });
    }

    const teacher = await db.entities.Teacher.get(String(booking.teacher_id)).catch(() => null);
    if (!teacher) {
      return Response.json({ error: 'Profesor no encontrado' }, { status: 404 });
    }

    const updatedEnrolled = [
      ...enrolled,
      {
        student_id: student.id,
        student_name: student.full_name,
        student_email: user.email,
        payment_status: 'pending'
      }
    ];

    // Precio por persona según el número de alumnos, con las tarifas del profesor.
    const subjectInfo = (teacher.subjects || []).find((s) => String(s.subject_id) === String(booking.subject_id));
    const pricePerHour = precioGrupalPorHora(subjectInfo, updatedEnrolled.length)
      || Number(subjectInfo?.price_per_hour)
      || Number(booking.price);
    const duration = Number(booking.duration_minutes) || 60;
    const newPrice = Number(((pricePerHour * duration) / 60).toFixed(2));

    const update = { enrolled_students: updatedEnrolled, price: newPrice };
    if (teacher.subscription_plan === 'commission') {
      const pct = Number(teacher.commission_percentage ?? 10);
      update.platform_fee = Number((newPrice * pct / 100).toFixed(2));
      update.teacher_payout = Number((newPrice * (1 - pct / 100)).toFixed(2));
    }

    const updated = await db.entities.Booking.update(String(bookingId), update);

    return Response.json({
      booking: {
        ...updated,
        enrolled_students: updatedEnrolled.map((s) =>
          (s.student_email || '').toLowerCase() === email ? s : { student_id: s.student_id, payment_status: s.payment_status }
        )
      }
    });
  } catch (error) {
    console.error('Error en joinGroupClass:', error);
    return Response.json({ error: 'No se ha podido apuntar a la clase' }, { status: 500 });
  }
});
