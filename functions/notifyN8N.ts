import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingData } = await req.json();

    console.log('🔍 DATOS RECIBIDOS:', JSON.stringify(bookingData, null, 2));

    // Separar nombre y apellidos del alumno
    const studentNameParts = bookingData.student_name.split(' ');
    const studentFirstName = studentNameParts[0] || '';
    const studentLastName = studentNameParts.slice(1).join(' ') || '';

    // Separar nombre y apellidos del profesor
    const teacherNameParts = bookingData.teacher_name.split(' ');
    const teacherFirstName = teacherNameParts[0] || '';
    const teacherLastName = teacherNameParts.slice(1).join(' ') || '';

    // Construir fecha en formato ISO 8601 con zona horaria de Madrid
    // Europe/Madrid es +01:00 en invierno y +02:00 en verano (horario de verano)
    const classDate = new Date(`${bookingData.date}T${bookingData.start_time}:00`);
    
    // Obtener el offset de Madrid para esta fecha específica
    const madridFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const utcDate = new Date(classDate.toISOString());
    const madridDate = new Date(madridFormatter.format(classDate));
    const offsetMinutes = Math.round((classDate - utcDate + (madridDate - classDate)) / 60000);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60).toString().padStart(2, '0');
    const offsetMins = (Math.abs(offsetMinutes) % 60).toString().padStart(2, '0');
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    
    const isoDateTime = `${bookingData.date}T${bookingData.start_time}:00.000${offsetSign}${offsetHours}:${offsetMins}`;

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
      class_start_datetime: isoDateTime,
      booking_id: bookingData.booking_id
    };

    // Elegir webhook según el status
    console.log('📊 Status de la reserva:', bookingData.status);
    
    let webhookUrl;
    if (bookingData.status === 'cancelled') {
      webhookUrl = Deno.env.get('N8N_CANCEL_WEBHOOK_URL');
      console.log('🔔 Tipo: CANCELACIÓN');
    } else if (bookingData.status === 'modified') {
      webhookUrl = Deno.env.get('N8N_MODIFY_WEBHOOK_URL');
      console.log('🔔 Tipo: MODIFICACIÓN');
    } else {
      webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      console.log('🔔 Tipo: NUEVA RESERVA');
    }

    console.log('🌐 URL seleccionada:', webhookUrl);

    if (!webhookUrl) {
      console.error('❌ Webhook URL no configurado para este tipo de operación');
      return Response.json({ 
        error: 'Webhook URL not configured',
        success: false 
      }, { status: 500 });
    }

    // Enviar a n8n
    console.log('📤 Payload que se enviará:', JSON.stringify(n8nPayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    console.log('📥 Status de respuesta de n8n:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error al enviar a n8n:', errorText);
      return Response.json({ 
        error: 'Failed to notify n8n',
        success: false,
        details: errorText
      }, { status: 500 });
    }

    const responseData = await response.text();
    console.log('✅ Respuesta de n8n:', responseData);
    console.log('✅ Notificación enviada a n8n exitosamente');

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