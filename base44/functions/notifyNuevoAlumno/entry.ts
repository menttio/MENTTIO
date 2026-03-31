import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nombre, apellidos, telefono, correo_electronico } = await req.json();

    const webhookUrl = Deno.env.get('N8N_NUEVO_ALUMNO_WEBHOOK_URL');
    if (!webhookUrl) {
      console.warn('⚠️ N8N_NUEVO_ALUMNO_WEBHOOK_URL no configurada, omitiendo notificación');
      return Response.json({ success: true, skipped: true });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellidos, telefono, correo_electronico })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('❌ Error notificando nuevo alumno a n8n:', err);
    } else {
      console.log('✅ Notificación nuevo alumno enviada a n8n');
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error en notifyNuevoAlumno:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});