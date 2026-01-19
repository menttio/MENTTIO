import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, lastName, email, message } = await req.json();

    if (!name || !lastName || !email || !message) {
      return Response.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    const fullName = `${name} ${lastName}`;

    // Send email to menttio@menttio.com
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Formulario de Contacto - Menπio',
      to: 'menttio@menttio.com',
      subject: `Nuevo mensaje de contacto de ${fullName}`,
      body: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre completo:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <br>
        <p><strong>Mensaje:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <br>
        <hr>
        <p style="color: #666; font-size: 12px;">Este mensaje fue enviado desde el formulario de contacto de Menπio</p>
      `
    });

    // Send confirmation email to user
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Menπio',
      to: email,
      subject: 'Hemos recibido tu mensaje',
      body: `
        <h2>¡Gracias por contactarnos!</h2>
        <p>Hola ${fullName},</p>
        <p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p>
        <br>
        <p><strong>Tu mensaje:</strong></p>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${message.replace(/\n/g, '<br>')}</p>
        <br>
        <p>Saludos,</p>
        <p><strong>El equipo de Menπio</strong></p>
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return Response.json(
      { error: 'Error al enviar el mensaje' },
      { status: 500 }
    );
  }
});