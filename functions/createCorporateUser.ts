import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nombre, apellidos } = await req.json();

    if (!nombre || !apellidos) {
      return Response.json({ error: 'Nombre y apellidos son requeridos' }, { status: 400 });
    }

    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }

    console.log('Enviando datos a n8n:', { nombre, apellidos, email: user.email });
    console.log('Webhook URL:', webhookUrl);

    // Enviar datos a n8n usando GET con parámetros en la URL
    const url = new URL(webhookUrl);
    url.searchParams.append('nombre', nombre);
    url.searchParams.append('apellidos', apellidos);
    url.searchParams.append('email', user.email);

    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from n8n:', errorText);
      throw new Error(`Error en el webhook de n8n: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
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