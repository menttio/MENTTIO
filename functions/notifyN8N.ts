import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingData } = await req.json();

    // Separar nombre y apellidos del alumno
    const studentNameParts = bookingData.student_name.split(' ');
    const studentFirstName = studentNameParts[0] || '';
    const studentLastName = studentNameParts.slice(1).join(' ') || '';

    // Separar nombre y apellidos del profesor
    const teacherNameParts = bookingData.teacher_name.split(' ');
    const teacherFirstName = teacherNameParts[0] || '';
    const teacherLastName = teacherNameParts.slice(1).join(' ') || '';

    // Preparar datos para n8n
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
      class_start_datetime: `${bookingData.date}T${bookingData.start_time}`,
      booking_id: bookingData.booking_id
    };

    // Obtener URL del webhook desde variables de entorno
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL no está configurado');
      return Response.json({ 
        error: 'Webhook URL not configured',
        success: false 
      }, { status: 500 });
    }

    // Enviar a n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      console.error('Error al enviar a n8n:', await response.text());
      return Response.json({ 
        error: 'Failed to notify n8n',
        success: false 
      }, { status: 500 });
    }

    console.log('Notificación enviada a n8n exitosamente:', n8nPayload);

    return Response.json({ 
      success: true,
      message: 'Notificación enviada a n8n' 
    });

  } catch (error) {
    console.error('Error en notifyN8N:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

// Force redeploy v2