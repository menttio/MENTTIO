import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sustituye a getPublicTeachers, que devolvía el registro completo del profesor
// (incluidos los tokens de Google Calendar, el teléfono y los identificadores de Stripe).
// Aquí solo salen los campos que el alumno necesita ver.
function publicFields(teacher) {
  const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
  return {
    id: teacher.id,
    full_name: teacher.full_name,
    profile_photo: teacher.profile_photo,
    bio: teacher.bio,
    education: teacher.education,
    experience_years: teacher.experience_years,
    subjects: subjects.map((s) => ({
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      level: s.level,
      price_per_hour: s.price_per_hour,
      max_group_students: s.max_group_students,
      group_prices: s.group_prices
    })),
    rating: teacher.rating,
    total_classes: teacher.total_classes,
    teaching_methods: teacher.teaching_methods,
    specializations: teacher.specializations,
    languages: teacher.languages,
    certifications: teacher.certifications,
    subscription_plan: teacher.subscription_plan,
    subscription_active: teacher.subscription_active,
    subscription_exempt: teacher.subscription_exempt,
    trial_active: teacher.trial_active,
    stripe_connect_enabled: Boolean(teacher.stripe_connect_enabled)
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const all = await base44.asServiceRole.entities.Teacher.list('-created_date', 500);

    let teachers = all.map(publicFields);

    // El propio profesor sí necesita sus datos completos (su ficha, su estado de Stripe...).
    const email = (user.email || '').toLowerCase();
    if (body.include_self !== false) {
      const own = all.find((t) => (t.user_email || '').toLowerCase() === email);
      if (own) {
        teachers = teachers.map((t) => (t.id === own.id ? { ...own } : t));
      }
    }

    return Response.json({ teachers });
  } catch (error) {
    console.error('Error en getPublicTeachersSafe:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
