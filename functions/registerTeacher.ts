import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { 
      nombre, 
      apellidos, 
      email_personal,
      phone, 
      education, 
      experience_years,
      subjects 
    } = payload;

    // Validaciones
    if (!nombre || !apellidos || !email_personal || !phone || !education) {
      return Response.json({ 
        error: 'Faltan campos obligatorios' 
      }, { status: 400 });
    }

    // 1. Crear usuario corporativo en Google Workspace (vía N8N)
    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }

    console.log('Enviando datos a n8n:', { nombre, apellidos, email_personal });
    
    // Enviar datos a n8n usando GET con parámetros en la URL
    const url = new URL(webhookUrl);
    url.searchParams.append('nombre', nombre);
    url.searchParams.append('apellidos', apellidos);
    url.searchParams.append('email', email_personal);

    const webhookResponse = await fetch(url.toString(), {
      method: 'GET'
    });

    console.log('Webhook response status:', webhookResponse.status);
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Error response from n8n:', errorText);
      return Response.json({ 
        error: `Error en el webhook de n8n: ${webhookResponse.status}` 
      }, { status: 500 });
    }

    const corporateData = await webhookResponse.json();
    console.log('Respuesta de n8n:', corporateData);

    if (corporateData.status !== 'ok') {
      console.error('Error en respuesta de n8n:', corporateData);
      return Response.json({ 
        error: corporateData.error || 'Error al crear usuario corporativo' 
      }, { status: 500 });
    }

    // 2. Crear registro de profesor con Service Role (vinculado al email corporativo)
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    await base44.asServiceRole.entities.Teacher.create({
      user_email: corporateData.email, // Email corporativo
      full_name: `${nombre} ${apellidos}`,
      phone: phone,
      education: education,
      experience_years: experience_years,
      bio: '',
      subjects: subjects || [],
      rating: 0,
      total_classes: 0,
      subscription_active: true,
      subscription_expires: expirationDate.toISOString().split('T')[0],
      trial_used: true,
      tour_completed: false,
      corporate_email: corporateData.email
    });

    // 3. Devolver datos de la cuenta corporativa
    return Response.json({
      status: 'ok',
      email: corporateData.email,
      password: corporateData.password
    });

  } catch (error) {
    console.error('Error en registerTeacher:', error);
    return Response.json({ 
      error: error.message || 'Error interno al registrar profesor' 
    }, { status: 500 });
  }
});