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
      subjects,
      subscription_plan
    } = payload;

    // Validaciones
    if (!nombre || !apellidos || !email_personal || !phone || !education) {
      return Response.json({ 
        error: 'Faltan campos obligatorios' 
      }, { status: 400 });
    }

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    // Plan BÁSICO: Registro con cuenta personal (sin webhook)
    if (subscription_plan === 'basic') {
      // Obtener usuario autenticado actual
      const currentUser = await base44.auth.me();
      
      if (!currentUser) {
        return Response.json({ 
          error: 'Debes estar autenticado para registrarte con el plan básico' 
        }, { status: 401 });
      }

      // Crear registro de profesor con la cuenta personal
      await base44.asServiceRole.entities.Teacher.create({
        user_email: currentUser.email,
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
        subscription_plan: 'basic',
        trial_used: true,
        tour_completed: false
      });

      // Enviar email de notificación a menttio
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'menttio@menttio.com',
          subject: 'Nuevo Profesor Registrado (Plan Básico) - Menttio',
          body: `
            <h2>Nuevo Profesor Registrado - Plan Básico</h2>
            <p><strong>Nombre:</strong> ${nombre} ${apellidos}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Teléfono:</strong> ${phone}</p>
            <p><strong>Formación:</strong> ${education}</p>
            <p><strong>Años de experiencia:</strong> ${experience_years || 'No especificado'}</p>
            <p><strong>Plan:</strong> Básico (sin grabaciones)</p>
          `
        });
      } catch (emailError) {
        console.error('Error enviando email de notificación:', emailError);
      }

      return Response.json({
        status: 'ok',
        plan: 'basic'
      });
    }

    // Plan PREMIUM: Registro con cuenta corporativa (con webhook)
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

    // Crear registro de profesor con Service Role (vinculado al email corporativo)
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
      subscription_plan: subscription_plan || 'premium',
      trial_used: true,
      tour_completed: false,
      corporate_email: corporateData.email
    });

    // Invitar al usuario a Base44 para que pueda usar email+password además de Google OAuth
    try {
      await base44.asServiceRole.users.inviteUser(corporateData.email, 'user');
      console.log('Usuario invitado correctamente a Base44');
    } catch (inviteError) {
      console.error('Error invitando usuario (puede que ya exista):', inviteError);
      // No fallar el registro si ya existe el usuario
    }

    // Enviar email de notificación a menttio
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'menttio@menttio.com',
        subject: 'Nuevo Profesor Registrado - Menttio',
        body: `
          <h2>Nuevo Profesor Registrado</h2>
          <p><strong>Nombre:</strong> ${nombre} ${apellidos}</p>
          <p><strong>Email personal:</strong> ${email_personal}</p>
          <p><strong>Email corporativo:</strong> ${corporateData.email}</p>
          <p><strong>Teléfono:</strong> ${phone}</p>
          <p><strong>Formación:</strong> ${education}</p>
          <p><strong>Años de experiencia:</strong> ${experience_years || 'No especificado'}</p>
          <p><strong>Rol:</strong> Profesor</p>
        `
      });
    } catch (emailError) {
      console.error('Error enviando email de notificación:', emailError);
      // No fallar el registro si falla el email
    }

    // Devolver datos de la cuenta corporativa
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