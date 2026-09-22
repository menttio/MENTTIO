import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Escribe el enlace de videollamada de una clase.
// Solo pueden hacerlo el profesor de esa reserva, un administrador, o la automatización
// (Cloudflare Worker) con la clave compartida AUTOMATION_SECRET.
// La autorización se comprueba ANTES de consultar la reserva, para no revelar a un anónimo
// si un identificador de clase existe o no.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || '').trim();
    const meetLink = String(body.meet_link || '').trim();

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const automationSecret = Deno.env.get('AUTOMATION_SECRET');
    const providedKey = req.headers.get('x-automation-key') || '';
    const isAutomation = Boolean(automationSecret) && providedKey === automationSecret;

    let user = null;
    if (!isAutomation) {
      user = await base44.auth.me().catch(() => null);
      if (!user || !user.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!bookingId || !meetLink) {
      return Response.json({ error: 'Faltan campos requeridos: booking_id y meet_link' }, { status: 400 });
    }

    // Solo aceptamos enlaces de Google Meet, para que nadie pueda apuntar a otra sala.
    let parsed;
    try {
      parsed = new URL(meetLink);
    } catch (_e) {
      return Response.json({ error: 'meet_link no es una URL válida' }, { status: 400 });
    }
    const host = parsed.hostname.toLowerCase();
    const allowedHost = parsed.protocol === 'https:' && (host === 'meet.google.com' || host.endsWith('.meet.google.com'));
    if (!allowedHost) {
      return Response.json({ error: 'Solo se admiten enlaces https de meet.google.com' }, { status: 400 });
    }

    const booking = await db.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (!isAutomation) {
      const email = (user.email || '').toLowerCase();
      const isTeacher = (booking.teacher_email || '').toLowerCase() === email;
      const isAdmin = user.role === 'admin';
      if (!isTeacher && !isAdmin) {
        return Response.json({ error: 'No puedes modificar esta clase' }, { status: 403 });
      }
    }

    await db.entities.Booking.update(bookingId, { meet_link: meetLink });

    return Response.json({ success: true, booking_id: bookingId });
  } catch (error) {
    console.error('Error en setMeetLinkAuto:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
