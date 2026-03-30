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

    // Plan BÁSICO: No se debe usar esta función, se hace directo en frontend
    if (subscription_plan === 'basic') {
      return Response.json({
        error: 'El plan básico no debe usar esta función'
      }, { status: 400 });
    }

    // Plan PREMIUM: Registro con cuenta corporativa (con webhook)
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);
    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }


    
    // Enviar datos a n8n usando POST con body JSON (nunca GET con query params)
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellidos, email: email_personal })
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

    // Notificar nuevo profesor al webhook de n8n
    try {
      const nuevoProfesorUrl = Deno.env.get('N8N_NUEVO_PROFESOR_WEBHOOK_URL');
      if (nuevoProfesorUrl) {
        await fetch(nuevoProfesorUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            apellidos,
            telefono: phone,
            correo_electronico: corporateData.email
          })
        });
      }
    } catch (webhookErr) {
      console.error('Error enviando datos al webhook nuevo_profesor:', webhookErr.message);
    }

    // Enviar email de bienvenida al profesor (a su email personal)
    try {
      const senderName = Deno.env.get('EMAIL_SENDER_NAME') || 'Menttio';
      const appUrl = Deno.env.get('APP_URL') || 'https://app.menttio.com';
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: senderName,
        to: email_personal,
        subject: '¡Bienvenido/a a Menttio! Tu cuenta está lista',
        body: `
          <!DOCTYPE html>
          <html lang="es">
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1; font-size: 28px; margin: 0;">Menttio</h1>
              <p style="color: #888; font-size: 14px; margin: 4px 0 0;">La herramienta para profesores profesionales</p>
            </div>
            <div style="background: #f9f9ff; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px; color: #4f46e5;">¡Hola, ${nombre}!</h2>
              <p style="margin: 0;">Tu cuenta de Menttio ha sido creada con éxito. Ya puedes empezar a profesionalizar y automatizar la gestión de tus clases.</p>
            </div>
            <h3 style="color: #4f46e5;">Tus datos de acceso</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 10px; background: #f3f4f6; border-radius: 6px 0 0 6px; font-weight: bold; width: 40%;">Email de acceso</td>
                <td style="padding: 10px; background: #f3f4f6; border-radius: 0 6px 6px 0;">${corporateData.email}</td>
              </tr>
            </table>
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px;"><strong>Próximo paso:</strong> Revisa la bandeja de entrada de <strong>${corporateData.email}</strong>. Recibirás un email de invitación para configurar tu contraseña y acceder a la plataforma.</p>
            </div>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${appUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Acceder a Menttio</a>
            </div>
            <h3 style="color: #4f46e5;">¿Qué puedes hacer en Menttio?</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
              <li>Gestionar tu agenda y reservas de clases</li>
              <li>Cobrar a tus alumnos de forma automática</li>
              <li>Ver estadísticas de tus clases y facturación</li>
              <li>Enviar recordatorios automáticos a tus alumnos</li>
              <li>Compartir archivos y materiales</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">
              ¿Tienes alguna duda? Contáctanos en <a href="mailto:menttio@menttio.com" style="color: #6366f1;">menttio@menttio.com</a><br>
              © ${new Date().getFullYear()} Menttio. Todos los derechos reservados.
            </p>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Error enviando email de bienvenida al profesor:', emailError);
      // No fallar el registro si falla el email
    }

    // Enviar email de notificación interna a menttio
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Menttio — Sistema',
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
      console.error('Error enviando email de notificación interna:', emailError);
      // No fallar el registro si falla el email
    }

    // Devolver datos de la cuenta corporativa (sin password)
    return Response.json({
      status: 'ok',
      email: corporateData.email
    });

  } catch (error) {
    console.error('Error en registerTeacher:', error);
    return Response.json({ 
      error: error.message || 'Error interno al registrar profesor' 
    }, { status: 500 });
  }
});