import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingData } = await req.json();

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_FILE_UPLOAD_WEBHOOK_URL');

    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_FILE_UPLOAD_WEBHOOK_URL no está configurado');
      return Response.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }

    // Separar nombre y apellidos
    const studentNameParts = bookingData.student_name.split(' ');
    const studentFirstName = studentNameParts[0] || '';
    const studentLastName = studentNameParts.slice(1).join(' ') || '';

    const teacherNameParts = bookingData.teacher_name.split(' ');
    const teacherFirstName = teacherNameParts[0] || '';
    const teacherLastName = teacherNameParts.slice(1).join(' ') || '';

    const payload = {
      student_first_name: studentFirstName,
      student_last_name: studentLastName,
      student_id: bookingData.student_id,
      student_email: bookingData.student_email,
      teacher_first_name: teacherFirstName,
      teacher_last_name: teacherLastName,
      teacher_id: bookingData.teacher_id,
      teacher_email: bookingData.teacher_email,
      booking_id: bookingData.booking_id,
      status: bookingData.status,
      files: bookingData.uploaded_files || []
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al notificar a n8n:', errorText);
      return Response.json({ error: 'Failed to notify n8n', details: errorText }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error en notifyFileUpload:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});