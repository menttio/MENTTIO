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

    // Elegir webhook según el status
    const isCancellation = bookingData.status === 'cancelled';
    console.log('📊 Status de la reserva:', bookingData.status);
    console.log('🔍 ¿Es cancelación?:', isCancellation);
    
    const webhookUrl = isCancellation 
      ? Deno.env.get('N8N_CANCEL_WEBHOOK_URL')
      : Deno.env.get('N8N_WEBHOOK_URL');

    console.log('🌐 URL seleccionada:', webhookUrl);
    console.log('🌐 N8N_WEBHOOK_URL:', Deno.env.get('N8N_WEBHOOK_URL'));
    console.log('🌐 N8N_CANCEL_WEBHOOK_URL:', Deno.env.get('N8N_CANCEL_WEBHOOK_URL'));

    if (!webhookUrl) {
      console.error(`❌ Webhook URL no configurado para ${isCancellation ? 'cancelación' : 'reserva'}`);
      return Response.json({ 
        error: 'Webhook URL not configured',
        success: false 
      }, { status: 500 });
    }

    console.log(`🔔 Enviando a n8n (${isCancellation ? 'CANCELACIÓN' : 'RESERVA'}):`, webhookUrl);

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