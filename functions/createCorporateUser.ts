import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { nombre, apellidos, email_personal } = await req.json();

    if (!nombre || !apellidos) {
      return Response.json({ error: 'Nombre y apellidos son requeridos' }, { status: 400 });
    }

    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }

    console.log('Enviando datos a n8n:', { nombre, apellidos, email_personal });
    console.log('Webhook URL:', webhookUrl);

    // Enviar datos a n8n usando GET con parámetros en la URL
    const url = new URL(webhookUrl);
    url.searchParams.append('nombre', nombre);
    url.searchParams.append('apellidos', apellidos);
    if (email_personal) url.searchParams.append('email', email_personal);

    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    console.log('Response status:', response.status);
    
    const rawText = await response.text();
    console.log('Raw response from n8n:', rawText);

    if (!response.ok) {
      throw new Error(`Error en el webhook de n8n: ${response.status} - ${rawText}`);
    }

    if (!rawText || rawText.trim() === '') {
      throw new Error('n8n no devolvió datos. Comprueba que el workflow de n8n está activo y configurado para responder con las credenciales.');
    }

    const result = JSON.parse(rawText);
    console.log('Respuesta de n8n:', result);

    return Response.json({
      status: result.status,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      password: result.password
    });

  } catch (error) {
    console.error('Error creating corporate user:', error);
    return Response.json({ 
      error: error.message || 'Error al crear usuario corporativo' 
    }, { status: 500 });
  }
});