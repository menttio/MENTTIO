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
    const createUserResponse = await base44.functions.invoke('createCorporateUser', {
      nombre,
      apellidos
    });

    if (!createUserResponse.data || createUserResponse.data.error || createUserResponse.data.status !== 'ok') {
      console.error('Error creando usuario corporativo:', createUserResponse.data);
      return Response.json({ 
        error: createUserResponse.data?.error || 'Error al crear usuario corporativo' 
      }, { status: 500 });
    }

    const corporateData = createUserResponse.data;

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