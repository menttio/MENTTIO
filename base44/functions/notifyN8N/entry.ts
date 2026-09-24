import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Avisa al worker de cada reserva nueva, modificada o cancelada. De ahí salen el correo al
// profesor y la creación de la videollamada.
//
// Llevaba la librería 0.8.6, que Base44 ya no admite: `auth.me()` respondía "Authentication
// required to view users" y la función devolvía 500. Como la web se traga ese error en
// silencio, la reserva se guardaba y no pasaba nada más: ni correo ni videollamada.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Tienes que iniciar sesión' }, { status: 401 });
    }

    const { bookingData } = await req.json().catch(() => ({}));
    if (!bookingData?.booking_id) {
      return Response.json({ error: 'bookingData es requerido' }, { status: 400 });
    }

    const partesAlumno = String(bookingData.student_name || '').split(' ');
    const partesProfesor = String(bookingData.teacher_name || '').split(' ');

    // Hora de Madrid con su desfase real (+01:00 en invierno, +02:00 en verano).
    const inicio = new Date(`${bookingData.date}T${bookingData.start_time}:00`);
    const enMadrid = new Date(inicio.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const enUtc = new Date(inicio.toLocaleString('en-US', { timeZone: 'UTC' }));
    const minutos = Math.round((enMadrid.getTime() - enUtc.getTime()) / 60000);
    const signo = minutos >= 0 ? '+' : '-';
    const hh = String(Math.floor(Math.abs(minutos) / 60)).padStart(2, '0');
    const mm = String(Math.abs(minutos) % 60).padStart(2, '0');
    const isoDateTime = `${bookingData.date}T${bookingData.start_time}:00.000${signo}${hh}:${mm}`;

    const payload = {
      student_id: bookingData.student_id,
      student_first_name: partesAlumno[0] || '',
      student_last_name: partesAlumno.slice(1).join(' ') || '',
      student_phone: bookingData.student_phone || '',
      student_email: bookingData.student_email,
      subject: bookingData.subject_name,
      price: bookingData.price,
      teacher_first_name: partesProfesor[0] || '',
      teacher_last_name: partesProfesor.slice(1).join(' ') || '',
      teacher_email: bookingData.teacher_email,
      teacher_phone: bookingData.teacher_phone || '',
      class_start_datetime: isoDateTime,
      booking_id: bookingData.booking_id,
    };

    const destino =
      bookingData.status === 'cancelled' ? Deno.env.get('N8N_CANCEL_WEBHOOK_URL')
      : bookingData.status === 'modified' ? Deno.env.get('N8N_MODIFY_WEBHOOK_URL')
      : Deno.env.get('N8N_WEBHOOK_URL');

    if (!destino) {
      console.error('Falta la URL del aviso para el estado:', bookingData.status);
      return Response.json({ error: 'Webhook URL not configured', success: false }, { status: 500 });
    }

    const res = await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const texto = await res.text();
      console.error(`El worker rechazó el aviso (${res.status}):`, texto.slice(0, 300));
      return Response.json({ error: 'Failed to notify', success: false, status: res.status }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error en notifyN8N:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}
