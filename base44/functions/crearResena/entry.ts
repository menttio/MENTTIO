import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Crea una reseña. Es el unico camino por el que la app puede crear una.
 *
 * Antes la escribia el navegador directamente contra la entidad Review, y la unica regla
 * era "estar identificado". Con eso un profesor podia darse a si mismo cinco estrellas
 * tantas veces como quisiera, y cualquier usuario podia dejar una reseña de un profesor
 * con el que no habia dado nada. Una reseña que cualquiera puede escribir no vale nada.
 *
 * Aqui se comprueba lo unico que se puede comprobar de verdad:
 *   - quien escribe tiene cuenta de alumno en Menttio;
 *   - o la clase existe, es suya y ya se ha dado   -> source 'plataforma'
 *   - o viene del enlace de reseñas de un profesor -> source 'invitacion'
 *
 * Lo que NO se puede comprobar (las opiniones recogidas a mano antes de Menttio) sigue
 * siendo 'formulario' y solo lo puede dar de alta un administrador desde el panel de datos.
 *
 * La entidad Review es de lectura publica: no se guarda nombre completo ni email de nadie.
 * Muchos alumnos son menores, asi que se guarda el nombre de pila o nada.
 */

const MAX_COMENTARIO = 600;
const FUENTES_VERIFICADAS = ['plataforma', 'invitacion'];

function primerNombre(nombre: string): string {
  const limpio = (nombre || '').trim();
  if (!limpio) return 'Estudiante';
  return limpio.split(/\s+/)[0];
}

function edadAhora(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad >= 5 && edad <= 100 ? edad : null;
}

// Mismo criterio que usa la app para saber si una clase ya se dio.
function yaSeDio(booking: any): boolean {
  if (booking.status === 'completed') return true;
  const fin = `${booking.date}T${booking.end_time || '23:59'}:00`;
  const fecha = new Date(fin);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.getTime() < Date.now();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesion para dejar una reseña.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: 'Pon una puntuacion de 1 a 5 estrellas.' }, { status: 400 });
    }

    const comment = (body.comment || '').toString().trim().slice(0, MAX_COMENTARIO);
    const anonima = body.anonima === true;

    const db = base44.asServiceRole;
    const email = (user.email || '').toLowerCase();

    // Estar registrado en la app es el requisito minimo: sin ficha de alumno no hay reseña.
    const alumnos = await db.entities.Student.filter({ user_email: user.email });
    const alumno = alumnos[0];
    if (!alumno) {
      return Response.json(
        { error: 'Solo pueden dejar reseñas los alumnos registrados en Menttio.' },
        { status: 403 },
      );
    }

    let teacherId = '';
    let bookingId: string | null = null;
    let source = '';
    let notaConsentimiento = '';

    if (body.booking_id) {
      const booking = await db.entities.Booking.get(body.booking_id).catch(() => null);
      if (!booking) {
        return Response.json({ error: 'Esa clase no existe.' }, { status: 404 });
      }

      // Individual: el alumno de la reserva. Grupal: uno de los apuntados.
      const esSuya =
        booking.student_id === alumno.id ||
        (booking.student_email || '').toLowerCase() === email ||
        (booking.enrolled_students || []).some(
          (s: any) => (s.student_email || '').toLowerCase() === email,
        );
      if (!esSuya) {
        return Response.json({ error: 'Esa clase no es tuya.' }, { status: 403 });
      }
      if (booking.status === 'cancelled') {
        return Response.json({ error: 'No se puede valorar una clase cancelada.' }, { status: 400 });
      }
      if (!yaSeDio(booking)) {
        return Response.json(
          { error: 'Podras valorarla cuando la clase se haya dado.' },
          { status: 400 },
        );
      }

      // Una reseña por alumno y clase. En las grupales cada alumno puede dejar la suya.
      const previas = await db.entities.Review.filter({ booking_id: booking.id });
      if (previas.some((r: any) => r.student_id === alumno.id)) {
        return Response.json({ error: 'Ya has valorado esta clase.' }, { status: 409 });
      }

      teacherId = booking.teacher_id;
      bookingId = booking.id;
      source = 'plataforma';
      notaConsentimiento = anonima
        ? 'Reseña de una clase dada en Menttio. El alumno pidio publicarla sin su nombre.'
        : 'Reseña de una clase dada en Menttio. Se publica solo el nombre de pila.';
    } else if (body.teacher_id) {
      const profesor = await db.entities.Teacher.get(body.teacher_id).catch(() => null);
      if (!profesor) {
        return Response.json({ error: 'Ese profesor no existe.' }, { status: 404 });
      }
      if ((profesor.user_email || '').toLowerCase() === email) {
        return Response.json({ error: 'No puedes valorarte a ti mismo.' }, { status: 403 });
      }

      // Por el enlace, una sola por alumno y profesor: si no, el enlace seria un boton de
      // repetir cinco estrellas.
      const mias = await db.entities.Review.filter({
        teacher_id: profesor.id,
        student_id: alumno.id,
      });
      if (mias.some((r: any) => r.source === 'invitacion')) {
        return Response.json({ error: 'Ya dejaste tu reseña a este profesor.' }, { status: 409 });
      }

      teacherId = profesor.id;
      source = 'invitacion';
      notaConsentimiento = anonima
        ? 'Reseña dejada desde el enlace del profesor por un alumno registrado. Pidio publicarla sin su nombre.'
        : 'Reseña dejada desde el enlace del profesor por un alumno registrado. Se publica solo el nombre de pila.';
    } else {
      return Response.json({ error: 'Falta la clase o el profesor.' }, { status: 400 });
    }

    const profesor = await db.entities.Teacher.get(teacherId).catch(() => null);
    if (!profesor) {
      return Response.json({ error: 'Ese profesor no existe.' }, { status: 404 });
    }

    const edad = edadAhora(alumno.birth_date);
    const nombreMostrado = anonima
      ? edad ? `Estudiante, ${edad} años` : 'Estudiante'
      : primerNombre(alumno.full_name);

    const resena = await db.entities.Review.create({
      teacher_id: teacherId,
      teacher_name: profesor.full_name,
      student_id: alumno.id,
      student_name: nombreMostrado,
      booking_id: bookingId,
      rating,
      comment,
      source,
      collected_at: new Date().toISOString().slice(0, 10),
      consent_note: notaConsentimiento,
    });

    // Media del profesor. Solo entran las verificadas con nota: las de formulario no se
    // pueden comprobar y las que llegaron sin puntuacion hundian la media a 0.
    try {
      const todas = await db.entities.Review.filter({ teacher_id: teacherId });
      const puntuadas = todas.filter(
        (r: any) => FUENTES_VERIFICADAS.includes(r.source || 'formulario') && Number(r.rating) > 0,
      );
      if (puntuadas.length > 0) {
        const media =
          puntuadas.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / puntuadas.length;
        await db.entities.Teacher.update(teacherId, { rating: Math.round(media * 100) / 100 });
      }
    } catch (error) {
      // Que falle la media no puede tirar la reseña, que es lo que el alumno acaba de escribir.
      console.error('crearResena: no se pudo actualizar la media', error);
    }

    try {
      await db.entities.Notification.create({
        user_id: teacherId,
        user_email: profesor.user_email,
        type: 'booking_new',
        title: 'Nueva valoracion',
        message: `${nombreMostrado} ha valorado tus clases con ${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`,
        related_id: resena.id,
        link_page: 'ReviewsHistory',
      });

      await db.functions.invoke('sendPushNotification', {
        userEmail: profesor.user_email,
        title: 'Nueva valoracion',
        body: `${nombreMostrado} te ha dado ${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`,
        data: { page: 'ReviewsHistory' },
      });
    } catch (error) {
      console.error('crearResena: no se pudo avisar al profesor', error);
    }

    return Response.json({ review: resena, teacher_name: profesor.full_name });
  } catch (error) {
    console.error('Error en crearResena:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
