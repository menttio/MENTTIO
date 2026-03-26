import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Shared logic to build n8n payload and send to webhook
async function sendToN8N(bookingData) {
  const studentNameParts = (bookingData.student_name || '').split(' ');
  const studentFirstName = studentNameParts[0] || '';
  const studentLastName = studentNameParts.slice(1).join(' ') || '';

  const teacherNameParts = (bookingData.teacher_name || '').split(' ');
  const teacherFirstName = teacherNameParts[0] || '';
  const teacherLastName = teacherNameParts.slice(1).join(' ') || '';

  const classDate = new Date(`${bookingData.date}T${bookingData.start_time}:00`);
  const madridFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const utcDate = new Date(classDate.toISOString());
  const madridDate = new Date(madridFormatter.format(classDate));
  const offsetMinutes = Math.round((classDate - utcDate + (madridDate - classDate)) / 60000);
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60).toString().padStart(2, '0');
  const offsetMins = (Math.abs(offsetMinutes) % 60).toString().padStart(2, '0');
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const isoDateTime = `${bookingData.date}T${bookingData.start_time}:00.000${offsetSign}${offsetHours}:${offsetMins}`;

  const n8nPayload = {
    student_id: bookingData.student_id,
    student_first_name: studentFirstName,
    student_last_name: studentLastName,
    student_phone: bookingData.student_phone || '',
    student_email: bookingData.student_email,
    subject: bookingData.subject_name,
    price: bookingData.price,
    teacher_first_name: teacherFirstName,
    teacher_last_name: teacherLastName,
    teacher_email: bookingData.teacher_email,
    teacher_phone: bookingData.teacher_phone || '',
    class_start_datetime: isoDateTime,
    booking_id: bookingData.booking_id
  };

  let webhookUrl;
  if (bookingData.status === 'cancelled') {
    webhookUrl = Deno.env.get('N8N_CANCEL_WEBHOOK_URL');
  } else if (bookingData.status === 'modified') {
    webhookUrl = Deno.env.get('N8N_MODIFY_WEBHOOK_URL');
  } else {
    webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  }

  if (!webhookUrl) {
    throw new Error(`Webhook URL not configured for status: ${bookingData.status}`);
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(n8nPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n responded with ${response.status}: ${errorText}`);
  }

  return { booking_id: bookingData.booking_id, success: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Support both single booking (bookingData) and bulk (bookings array)
    const bookingsList = body.bookings || (body.bookingData ? [body.bookingData] : []);

    if (!bookingsList.length) {
      return Response.json({ error: 'No bookings provided' }, { status: 400 });
    }

    console.log(`📤 Enviando ${bookingsList.length} webhooks a n8n en paralelo...`);

    // Send all webhooks in parallel
    const results = await Promise.allSettled(
      bookingsList.map(b => sendToN8N(b))
    );

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected');

    failures.forEach((f, i) => {
      console.error(`❌ Error en webhook ${i}:`, f.reason?.message);
    });

    console.log(`✅ ${successes}/${bookingsList.length} webhooks enviados correctamente`);

    return Response.json({
      success: true,
      sent: successes,
      failed: failures.length,
      total: bookingsList.length
    });

  } catch (error) {
    console.error('Error en notifyN8NBulk:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});