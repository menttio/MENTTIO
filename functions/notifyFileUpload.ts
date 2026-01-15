import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingData, uploadedFiles } = await req.json();

    const webhookUrl = Deno.env.get('N8N_FILE_UPLOAD_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('❌ N8N_FILE_UPLOAD_WEBHOOK_URL no configurado');
      return Response.json({ 
        error: 'Webhook URL not configured',
        success: false 
      }, { status: 500 });
    }

    const payload = {
      student_name: bookingData.student_name,
      student_id: bookingData.student_id,
      teacher_name: bookingData.teacher_name,
      teacher_id: bookingData.teacher_id,
      teacher_email: bookingData.teacher_email,
      booking_id: bookingData.booking_id,
      uploaded_files: uploadedFiles
    };

    console.log('📤 Enviando notificación de archivos subidos:', JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
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

    return Response.json({ 
      success: true,
      message: 'Notificación enviada a n8n' 
    });

  } catch (error) {
    console.error('Error en notifyFileUpload:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});